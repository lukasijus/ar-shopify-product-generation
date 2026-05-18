import react from "@vitejs/plugin-react";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { defineConfig } from "vitest/config";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const execFileAsync = promisify(execFile);
const requestLimitBytes = 24 * 1024 * 1024;

type RoiDocument = {
  productHandle: string;
  sourceImage: string;
};

type ExtractRequestBody = {
  productHandle: string;
  roiDocument: RoiDocument;
  sourceImagePath?: string;
  uploadedSource?: {
    name: string;
    dataBase64: string;
  };
};

const isPrivateHost = (hostHeader: string | undefined): boolean => {
  const host = (hostHeader ?? "").split(":")[0].toLowerCase();

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }

  if (host.startsWith("192.168.") || host.startsWith("10.")) {
    return true;
  }

  const [first, second] = host.split(".").map((part) => Number(part));
  return first === 172 && second >= 16 && second <= 31;
};

const sendJson = (
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
};

const readJsonBody = async (
  request: IncomingMessage,
): Promise<ExtractRequestBody> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    request.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > requestLimitBytes) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });

const safeFileName = (name: string): string =>
  path.basename(name).replace(/[^A-Za-z0-9._-]/g, "_");

const localNailExtractionPlugin = (): Plugin => ({
  name: "local-nail-extraction-api",
  configureServer(server) {
    server.middlewares.use(
      "/api/nails/extract-roi",
      async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { error: "Method not allowed." });
          return;
        }

        if (!isPrivateHost(request.headers.host)) {
          sendJson(response, 403, {
            error:
              "Local extraction is only available from localhost or a private LAN host.",
          });
          return;
        }

        try {
          const body = await readJsonBody(request);
          if (!body.productHandle || !body.roiDocument) {
            sendJson(response, 400, {
              error: "Missing productHandle or roiDocument.",
            });
            return;
          }

          const productHandle = safeFileName(body.productHandle);
          const workDir = path.resolve(
            "private/extraction-work",
            productHandle,
          );
          await mkdir(workDir, { recursive: true });

          let sourceImagePath = body.sourceImagePath;
          if (body.uploadedSource) {
            sourceImagePath = path.join(
              workDir,
              `source-${safeFileName(body.uploadedSource.name)}`,
            );
            await writeFile(
              sourceImagePath,
              Buffer.from(body.uploadedSource.dataBase64, "base64"),
            );
          }

          if (!sourceImagePath) {
            sendJson(response, 400, {
              error: "Missing source image path or uploaded source image.",
            });
            return;
          }

          const roiPath = path.join(workDir, "rois.json");
          await writeFile(
            roiPath,
            `${JSON.stringify(body.roiDocument, null, 2)}\n`,
          );

          const extract = await execFileAsync("uv", [
            "run",
            "--project",
            "tools/nail-extractor",
            "nail-extractor",
            "extract-roi",
            "--roi",
            roiPath,
            "--source-image",
            sourceImagePath,
          ]);

          const proposalPath = path.join(workDir, "proposal.json");
          const approve = await execFileAsync("uv", [
            "run",
            "--project",
            "tools/nail-extractor",
            "nail-extractor",
            "approve",
            "--proposal",
            proposalPath,
          ]);

          sendJson(response, 200, {
            roiPath,
            proposalPath,
            assetDir: path.resolve("public/nail-assets", productHandle),
            output: [extract.stdout, approve.stdout].filter(Boolean).join("\n"),
          });
        } catch (error) {
          sendJson(response, 500, {
            error:
              error instanceof Error ? error.message : "Extraction failed.",
          });
        }
      },
    );
  },
});

export default defineConfig({
  plugins: [react(), localNailExtractionPlugin()],
  test: {
    environment: "jsdom",
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
  server: {
    allowedHosts: [".trycloudflare.com"],
  },
});
