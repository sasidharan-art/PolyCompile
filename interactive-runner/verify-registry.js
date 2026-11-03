#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'runner', 'languages.json'), 'utf8'));
const catalog = require('../src/compiler/LanguageRegistry').getAllLanguages();
const catalogIds = new Set(catalog.map(lang => lang.id));
const ids = new Set();
for (const lang of registry) {
  assert.equal(typeof lang.id, 'string', 'language id must be a string');
  assert.ok(lang.id.length, 'language id must not be empty');
  assert.ok(!ids.has(lang.id), `duplicate language id: ${lang.id}`);
  ids.add(lang.id);
  assert.equal(typeof lang.name, 'string', `${lang.id}: missing display name`);
  assert.equal(typeof lang.sourceFile, 'string', `${lang.id}: missing source file`);
  assert.ok(Array.isArray(lang.run) && lang.run.length > 0, `${lang.id}: missing run command`);
  assert.ok(lang.run.every(part => typeof part === 'string' && part.length), `${lang.id}: invalid run command`);
  if (lang.compile) {
    assert.ok(Array.isArray(lang.compile) && lang.compile.length > 0, `${lang.id}: invalid compile command`);
    assert.ok(lang.compile.every(part => typeof part === 'string' && part.length), `${lang.id}: invalid compile command arguments`);
  }
}
const runtimeDockerfile = fs.readFileSync(path.join(__dirname, '..', 'runner', 'Dockerfile'), 'utf8');
assert.ok(runtimeDockerfile.includes('COPY runner/languages.json /opt/languages.json'), 'interactive runner needs the registry at /opt/languages.json');
assert.ok(runtimeDockerfile.includes('COPY interactive-runner/session-runner.js /opt/session-runner.js'), 'interactive runner script is missing from runtime image');
assert.ok(runtimeDockerfile.includes('util-linux'), 'PTY support requires util-linux (script command)');
const gateway = fs.readFileSync(path.join(__dirname, 'gateway.js'), 'utf8');
assert.ok(gateway.includes('uid=10001,gid=10001,mode=0700'), 'tmpfs work/exec directories must be writable by the non-root runner');
const missingCatalogIds = [...catalogIds].filter(id => !ids.has(id));
console.log(`Interactive runtime registry valid: ${registry.length} configured runtimes; runtime image, PTY, and non-root tmpfs paths validated.`);
console.log(`Compiler catalog: ${catalogIds.size} languages; interactive runtime entries: ${[...ids].filter(id => catalogIds.has(id)).length} matching IDs.`);
if (missingCatalogIds.length) console.warn(`Not yet configured for live interactive execution: ${missingCatalogIds.join(', ')}`);
console.log(registry.map(x => x.id).join(', '));
