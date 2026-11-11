import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const requireFromSpr = createRequire(import.meta.resolve("@heliuslabs/spr"));
const packageJson = requireFromSpr.resolve("@lightprotocol/hasher.rs/package.json");
const packageRoot = dirname(packageJson);
const dist = join(packageRoot, "dist");

for (const target of ["browser-fat/es", "browser-slim/es"]) {
  const outputDirectory = join(dist, target);
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    copyFile(join(dist, "light_wasm_hasher_bg.wasm"), join(outputDirectory, "light_wasm_hasher_bg.wasm")),
    copyFile(join(dist, "hasher_wasm_simd_bg.wasm"), join(outputDirectory, "hasher_wasm_simd_bg.wasm")),
  ]);
}

console.log("Prepared Helius Privacy hasher WASM assets for Next.js.");
