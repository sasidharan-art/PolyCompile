#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'runner', 'languages.json'), 'utf8'));
const catalog = require('../src/compiler/LanguageRegistry').LANGUAGES;
const catalogIds = new Set(Object.keys(catalog));
const ids = new Set();
for (const lang of registry) {
  assert.equal(typeof lang.id, 'string', 'language id must be a string');
  assert.ok(lang.id.length, 'language id must not be empty');
  assert.ok(!ids.has(lang.id), `duplicate runtime id: ${lang.id}`);
  ids.add(lang.id);
  assert.equal(typeof lang.name, 'string', `${lang.id}: missing display name`);
  assert.equal(typeof lang.sourceFile, 'string', `${lang.id}: missing source file`);
  assert.ok(path.basename(lang.sourceFile) === lang.sourceFile && !lang.sourceFile.includes('..'), `${lang.id}: unsafe source filename`);
  assert.ok(Array.isArray(lang.run) && lang.run.length > 0, `${lang.id}: missing run command`);
  assert.ok(lang.run.every(part => typeof part === 'string' && part.length), `${lang.id}: invalid run command`);
  if (lang.compile) {
    assert.ok(Array.isArray(lang.compile) && lang.compile.length > 0, `${lang.id}: invalid compile command`);
    assert.ok(lang.compile.every(part => typeof part === 'string' && part.length), `${lang.id}: invalid compile command arguments`);
  }
}
const missingCatalogIds = [...catalogIds].filter(id => !ids.has(id));
assert.deepEqual(missingCatalogIds, [], `Every catalogue language must have an interactive runtime: ${missingCatalogIds.join(', ')}`);
const runtimeDockerfile = fs.readFileSync(path.join(__dirname, '..', 'runner', 'Dockerfile'), 'utf8');
assert.ok(/COPY\s+runner\/languages\.json\s+\/opt\/languages\.json/.test(runtimeDockerfile), 'interactive runner needs the registry at /opt/languages.json');
assert.ok(/COPY\s+interactive-runner\/session-runner\.js\s+\/opt\/session-runner\.js/.test(runtimeDockerfile), 'interactive runner script is missing from runtime image');
assert.ok(/COPY\s+runner\/js-runner\.js\s+\/opt\/polycompile\/js-runner\.js/.test(runtimeDockerfile), 'JavaScript prompt compatibility wrapper is missing from runtime image');
assert.ok(runtimeDockerfile.includes('util-linux') || runtimeDockerfile.includes('script'), 'PTY support requires util-linux (script command)');
assert.ok(runtimeDockerfile.includes('swift:6.4.1-trixie'), 'Swift runtime base image must be pinned');
const gateway = fs.readFileSync(path.join(__dirname, 'gateway.js'), 'utf8');
assert.ok(gateway.includes('uid=10001,gid=10001,mode=0700'), 'tmpfs work/exec directories must be writable by the non-root runner');
assert.ok(gateway.includes("['rm', '-f', containerName]"), 'gateway must remove the actual execution container, not only the docker CLI process');
assert.ok(gateway.includes('usedTickets'), 'gateway must reject replayed one-time tickets');
const sessionRunner = fs.readFileSync(path.join(__dirname, 'session-runner.js'), 'utf8');
assert.ok(sessionRunner.includes('stty -echo'), 'PTY must disable duplicate terminal input echo');
assert.ok(sessionRunner.includes('MAX_QUEUED_INPUT_BYTES'), 'stdin arriving during compilation must be safely queued for the program');
assert.ok(sessionRunner.includes("send('timeout'"), 'interactive sessions must report timeouts');
console.log(`Interactive runtime registry valid: ${registry.length} entries.`);
console.log(`Compiler catalogue: ${catalogIds.size} languages; ${[...catalogIds].filter(id => ids.has(id)).length}/${catalogIds.size} have runtime definitions.`);
console.log(`Catalogue IDs: ${[...catalogIds].join(', ')}`);
console.log('Runtime image build performs a strict executable-presence check for every toolchain.');
