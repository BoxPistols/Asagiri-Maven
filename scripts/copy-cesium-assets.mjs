#!/usr/bin/env node
// Copies Cesium static assets (Workers, Assets, Widgets) to public/cesium
// so Next.js can serve them at /cesium/* at runtime.

import { existsSync, cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "node_modules", "cesium", "Build", "Cesium");
const DEST = join(process.cwd(), "public", "cesium");

if (!existsSync(SRC)) {
  console.warn(`[cesium] Skipping: ${SRC} not found (cesium package not installed).`);
  process.exit(0);
}

mkdirSync(DEST, { recursive: true });

const dirs = ["Assets", "Widgets", "Workers", "ThirdParty"];
for (const dir of dirs) {
  const from = join(SRC, dir);
  const to = join(DEST, dir);
  if (!existsSync(from)) {
    console.warn(`[cesium] Missing: ${from}`);
    continue;
  }
  cpSync(from, to, { recursive: true, force: true });
}

console.log("[cesium] Static assets copied to public/cesium");
