import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = join(root, "dist");

// Build in memory first. No original JavaScript or source maps are published.
const options = {
  absWorkingDir: root,
  bundle: true,
  minify: true,
  sourcemap: false,
  platform: "browser",
  target: "es2020",
  legalComments: "eof",
  write: false,
};
const [game, configuration] = await Promise.all([
  build({ ...options, entryPoints: ["app.js"], format: "esm" }),
  build({ ...options, entryPoints: ["app-config.js"], format: "iife" }),
]);

function outputName(name, contents) {
  const hash = createHash("sha256").update(contents).digest("hex").slice(0, 12);
  return `${name}.${hash}.min.js`;
}

const gameFile = game.outputFiles[0];
const configFile = configuration.outputFiles[0];
const gameName = outputName("app", gameFile.contents);
const configName = outputName("app-config", configFile.contents);
const sourceHtml = await readFile(join(root, "index.html"), "utf8");
const configTag = '<script src="app-config.js"></script>';
const gameTag = '<script type="module" src="app.js"></script>';
if (!sourceHtml.includes(configTag) || !sourceHtml.includes(gameTag)) {
  throw new Error("Expected script tags are missing from index.html; update the build before publishing.");
}
const productionHtml = sourceHtml
  .replace(configTag, `<script src="${configName}"></script>`)
  .replace(gameTag, `<script type="module" src="${gameName}"></script>`);

// A strict allowlist keeps sources, tests, local files, and backend code out of dist.
// Keep older hashed files so rebuilding cannot invalidate an already-open page.
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, gameName), gameFile.contents);
await writeFile(join(outputDirectory, configName), configFile.contents);
await cp(join(root, "assets"), join(outputDirectory, "assets"), { recursive: true });
await cp(join(root, "styles.css"), join(outputDirectory, "styles.css"));
await writeFile(join(outputDirectory, "index.html"), productionHtml);

console.log(`Production site: ${outputDirectory}`);
console.log(`Game JavaScript: ${(gameFile.contents.length / 1024).toFixed(1)} KB (minified, no source map)`);
