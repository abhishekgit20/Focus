import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// tsx runs this file directly as ESM in dev, where import.meta.url is real
// and __dirname isn't a global. esbuild bundles it to CommonJS for
// production (dist/index.cjs), where the reverse is true — import.meta.url
// is undefined (esbuild's CJS output doesn't support import.meta at all),
// so fileURLToPath(undefined) used to throw at module load, unconditionally
// crashing the production server before it ever reached NODE_ENV branching.
// Never caught locally because every check this far ran via tsx, never the
// actual bundled artifact — only surfaced when booting dist/index.cjs
// directly to rehearse the Docker/Railway boot path.
declare const __dirname: string | undefined;
const currentDir = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export function serveStatic(app: Express) {
  // In production build, the server is in dist/ and client is in dist/public
  const distPath = path.resolve(currentDir, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, { index: false }));

  // fall through to index.html for all routes (SPA routing)
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
