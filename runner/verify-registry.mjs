import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const catalog = require('../src/compiler/LanguageRegistry').LANGUAGES;
const runner = JSON.parse(fs.readFileSync(path.join(here, 'languages.json'), 'utf8'));
const ids = new Set();
for (const language of runner) {
  if (ids.has(language.id)) throw new Error(`Duplicate language id: ${language.id}`);
  ids.add(language.id);
  if (!language.sourceFile || path.basename(language.sourceFile) !== language.sourceFile) throw new Error(`Invalid source filename: ${language.id}`);
  if (!Array.isArray(language.run) || !language.run.length) throw new Error(`Missing run command: ${language.id}`);
  if (language.compile !== undefined && (!Array.isArray(language.compile) || !language.compile.length)) throw new Error(`Invalid compile command: ${language.id}`);
}
const missing = Object.keys(catalog).filter(id => !ids.has(id));
if (missing.length) throw new Error(`Interactive runtime definitions missing: ${missing.join(', ')}`);
console.log(`OK: ${Object.keys(catalog).length}/${Object.keys(catalog).length} catalogue languages have interactive runtime definitions (${runner.length} total runtime entries).`);
