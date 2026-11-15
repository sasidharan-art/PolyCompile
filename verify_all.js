/**
 * PolyCompile - Local Engine Regression Suite
 * Exercises the curated snippets against PolyCompile's local development
 * engines/simulators. This is NOT native compiler or full-runtime verification;
 * use the Docker 55-language smoke-test gate for that claim.
 * Tests execution of EVERY SINGLE sample snippet in PolyCompile:
 * - C
 * - Pascal
 * - Fortran
 * - Ada
 * - BASIC
 * - Assembly x86
 * - Brainfuck
 * - Java
 * - C++
 * - C#
 * - Kotlin
 * - Ruby
 * - Haskell
 * - Clojure
 * - Elixir
 * - Lisp/Scheme
 * - Python
 * - JavaScript
 * - TypeScript
 * - PHP
 * - Lua
 * - Bash
 * - Rust
 * - Go
 * - SQL
 */

const { SNIPPETS } = require('./src/snippets/CodeSnippets');
const ExecutionManager = require('./src/execution/ExecutionManager');
const { LANGUAGES } = require('./src/compiler/LanguageRegistry');

async function testAll() {
  console.log('Testing ' + SNIPPETS.length + ' snippets against local development engines/simulators...\n');
  let passCount = 0;

  for (const snip of SNIPPETS) {
    const lang = LANGUAGES[snip.languageId] || { id: snip.languageId, name: snip.languageId };
    try {
      const res = await ExecutionManager.execute({
        language: lang,
        sourceCode: snip.code,
        stdin: '',
        preferLocal: true
      });

      const outputPreview = (res.stdout || res.compileOutput || res.stderr || '').trim().split('\n')[0];
      if (res.exitCode === 0 && (res.stdout || res.compileOutput)) {
        console.log(`[PASS: LOCAL ENGINE] ${snip.title}`);
        console.log(`       -> Output: "${outputPreview}" | Engine: ${res.engine}`);
        passCount++;
      } else {
        console.error(`[FAIL] ${snip.title}`);
        console.error(`       -> Stderr: ${res.stderr}`);
      }
    } catch (e) {
      console.error(`[EXCEPTION] ${snip.title}: ${e.message}`);
    }
  }

  console.log(`\nLocal engine regression result: ${passCount} / ${SNIPPETS.length} passed.\nThis does not certify native compiler/runtime support.`);
}

testAll();
