import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const keepChunks = new Set([
  "IHDR",
  "PLTE",
  "IDAT",
  "IEND",
  "tRNS",
  "gAMA",
  "sRGB",
  "iCCP",
  "pHYs",
]);

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (entry.isFile() && entry.name.endsWith(".png")) {
      files.push(path);
    }
  }

  return files;
};

const stripPng = async (path) => {
  const input = await readFile(path);
  if (!input.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error(`${path} is not a PNG file`);
  }

  const chunks = [pngSignature];
  const removedChunks = [];
  let offset = pngSignature.length;

  while (offset + 8 <= input.length) {
    const length = input.readUInt32BE(offset);
    const type = input.toString("ascii", offset + 4, offset + 8);
    const end = offset + 12 + length;

    if (end > input.length) {
      throw new Error(`${path} has a truncated ${type} chunk`);
    }

    const rawChunk = input.subarray(offset, end);
    if (keepChunks.has(type)) {
      chunks.push(rawChunk);
    } else {
      removedChunks.push(type);
    }

    offset = end;
    if (type === "IEND") {
      break;
    }
  }

  if (removedChunks.length > 0) {
    await writeFile(path, Buffer.concat(chunks));
    console.log(`${path}: removed ${removedChunks.join(", ")}`);
  }
};

const root = process.argv[2] ?? "public";
const files = await walk(root);

for (const file of files) {
  await stripPng(file);
}
