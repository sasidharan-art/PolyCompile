import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const backend = JSON.parse(fs.readFileSync(path.join(here, "../backend/languages.json"), "utf8"));
const runner = JSON.parse(fs.readFileSync(path.join(here, "languages.json"), "utf8"));
const project = (list) => list.map(({ id, name, extensions, category, paradigm, compiled, sourceFile, compile, run }) => ({ id, name, extensions, category, paradigm, compiled, sourceFile, compile, run }));
if (JSON.stringify(project(backend)) !== JSON.stringify(project(runner))) {
  console.error("FAIL: backend and runner language registries differ."); process.exit(1);
}
const ids = new Set(); const files = new Set();
for (const language of runner) {
  if (ids.has(language.id)) throw new Error(`Duplicate language id: ${language.id}`); ids.add(language.id);
  if (files.has(language.sourceFile)) throw new Error(`Duplicate source filename: ${language.sourceFile}`); files.add(language.sourceFile);
  if (!Array.isArray(language.run) || !language.run.length) throw new Error(`Missing run command: ${language.id}`);
  if (language.compile !== undefined && (!Array.isArray(language.compile) || !language.compile.length)) throw new Error(`Invalid compile command: ${language.id}`);
}
console.log(`OK: ${runner.length} language entries; backend and runner registries match.`);
