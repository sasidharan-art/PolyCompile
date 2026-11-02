/**
 * PolyCompile - Complete Language Runner Verification
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
  console.log('Testing execution for all ' + SNIPPETS.length + ' snippets...\n');
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
        console.log(`[PASS] ${snip.title}`);
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

  console.log(`\nResult: ${passCount} / ${SNIPPETS.length} passed.`);
}

testAll();
