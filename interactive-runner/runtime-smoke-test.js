#!/usr/bin/env node
'use strict';
/** Run this inside polycompile-exec:latest after the image build. It executes
 * one real program for every language in the public 55-language catalogue. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const registryPath = process.env.POLYCOMPILE_LANGUAGE_REGISTRY || path.join(__dirname, '..', 'runner', 'languages.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const registryById = new Map(registry.map(x => [x.id, x]));
const tests = JSON.parse(fs.readFileSync(path.join(__dirname, 'runtime-smoke-tests.json'), 'utf8'));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'polycompile-55-smoke-'));
const work = path.join(root, 'work');
const execDir = path.join(root, 'exec');
fs.mkdirSync(work); fs.mkdirSync(execDir);
const testRegistryPath = path.join(root, 'languages.json');
const testRegistry = registry.map(lang => JSON.parse(JSON.stringify(lang, (key, value) => typeof value === 'string' ? value.replaceAll('/work', work).replaceAll('/exec', execDir) : value)));
fs.writeFileSync(testRegistryPath, JSON.stringify(testRegistry));

function runLanguage(test) {
  const lang = registryById.get(test.id);
  assert.ok(lang, `${test.id}: no runtime registry entry`);
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(__dirname, 'session-runner.js')], {
      env: { ...process.env, POLYCOMPILE_LANGUAGE_REGISTRY: testRegistryPath, POLYCOMPILE_WORK_DIR: work, POLYCOMPILE_EXEC_DIR: execDir, POLYCOMPILE_PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let buffer = '';
    let transcript = '';
    let stderr = '';
    let settled = false;
    const timeout = setTimeout(() => { proc.kill('SIGKILL'); reject(new Error(`${test.id}: timed out; output=${JSON.stringify(transcript)} stderr=${stderr}`)); }, 90_000);
    const settle = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error); else resolve(value);
    };
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', chunk => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
        if (!line) continue;
        let event; try { event = JSON.parse(line); } catch { continue; }
        if (typeof event.data === 'string') transcript += Buffer.from(event.data, 'base64').toString('utf8');
        if (event.type === 'error') stderr += String(event.message || '');
        if (event.type === 'exit') {
          try {
            assert.equal(event.code, 0, `${test.id}: exit=${event.code}; output=${JSON.stringify(transcript)} stderr=${stderr}`);
            assert.ok(transcript.includes(test.expected), `${test.id}: expected ${JSON.stringify(test.expected)}; output=${JSON.stringify(transcript)} stderr=${stderr}`);
            settle(null, { id: test.id, durationMs: event.durationMs, memoryBytes: event.memoryBytes });
          } catch (error) { settle(error); }
          proc.stdin.end();
        }
      }
    });
    proc.stderr.setEncoding('utf8'); proc.stderr.on('data', chunk => { stderr += chunk; });
    proc.once('error', error => settle(error));
    proc.once('close', code => {
      if (!settled) settle(new Error(`${test.id}: session process closed (${code}); output=${JSON.stringify(transcript)} stderr=${stderr}`));
    });
    const header = Buffer.from(JSON.stringify({ language: test.id, source: Buffer.from(test.source, 'utf8').toString('base64'), timeoutMs: 60_000 }) + '\n');
    const stdin = Buffer.from(test.stdin || '', 'utf8');
    proc.stdin.write(Buffer.concat([header, stdin]));
  });
}

(async () => {
  try {
    assert.ok(tests.length >= 50, `Expected at least 50 smoke tests for catalogue languages, got ${tests.length}.`);
    const testIds = new Set(tests.map(x => x.id));
    assert.equal(testIds.size, tests.length, 'Duplicate language smoke test.');
    for (const test of tests) {
      const runtime = registryById.get(test.id);
      assert.ok(runtime, `No interactive runtime for ${test.id}`);
      assert.equal(runtime.sourceFile, test.sourceFile, `${test.id}: smoke source filename differs from runtime registry`);
    }
    const results = [];
    for (const test of tests) {
      const result = await runLanguage(test);
      results.push(result);
      console.log(`[PASS] ${result.id}: compiled/launched and produced expected output`);
    }
    console.log(`\nRuntime smoke test: ${results.length}/${tests.length} passed.`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
