import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const catalogPath = join(rootDir, "src/app/pressOnProducts.json");
const publicDir = join(rootDir, "public");

const products = JSON.parse(await readFile(catalogPath, "utf8"));

for (const product of products) {
  const targetPath = join(
    publicDir,
    product.localImagePath.replace(/^\//, ""),
  );

  await mkdir(dirname(targetPath), { recursive: true });

  const response = await fetch(product.imageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${product.title}: ${response.status} ${response.statusText}`,
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(targetPath, bytes);
  console.log(`Downloaded ${product.title} -> ${product.localImagePath}`);
}
