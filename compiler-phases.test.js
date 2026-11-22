'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { LANGUAGES } = require('./src/compiler/LanguageRegistry');
const Lexer = require('./src/compiler/Lexer');
const Parser = require('./src/compiler/Parser');
const SemanticAnalyzer = require('./src/compiler/SemanticAnalyzer');
const IntermediateCodeGenerator = require('./src/compiler/IntermediateCode');
const CodeOptimizer = require('./src/compiler/CodeOptimizer');
const smokeCases = JSON.parse(fs.readFileSync('./interactive-runner/runtime-smoke-tests.json', 'utf8'));
const app = fs.readFileSync('./public/js/app.js', 'utf8');
const html = fs.readFileSync('./public/index.html', 'utf8');

assert.ok(smokeCases.length >= 55, 'One phase-analysis fixture must exist per catalogue language.');
let completed = 0;
for (const sample of smokeCases) {
  const language = LANGUAGES[sample.id];
  assert.ok(language, `Unknown catalogue language ${sample.id}`);
  const lexical = Lexer.tokenize(sample.source, language);
  const syntax = Parser.parse(lexical.tokens, language);
  const semantic = SemanticAnalyzer.analyze(syntax.ast, lexical.tokens, language);
  const intermediate = IntermediateCodeGenerator.generate(syntax.ast, language);
  const optimized = CodeOptimizer.process(intermediate.tac, intermediate.quadruples, language);
  assert.ok(Array.isArray(lexical.tokens), `${sample.id}: lexical tokens missing`);
  assert.ok(syntax.ast && Array.isArray(syntax.ast.body), `${sample.id}: AST missing`);
  assert.ok(syntax.metrics && Number.isFinite(syntax.metrics.totalAstNodes), `${sample.id}: AST metrics missing`);
  assert.ok(Array.isArray(semantic.symbolTable) && Array.isArray(semantic.scopes), `${sample.id}: semantic model missing`);
  assert.ok(Array.isArray(intermediate.tac) && Array.isArray(intermediate.quadruples) && Array.isArray(intermediate.basicBlocks), `${sample.id}: IR/CFG missing`);
  assert.ok(typeof optimized.assemblyCode === 'string' && Array.isArray(optimized.bytecode) && Array.isArray(optimized.optimizationsApplied), `${sample.id}: codegen view missing`);
  completed++;
}
for (const id of ['lexTotalTokens','lexUniqueTokens','lexKwDensity','lexIdDensity','astTotalNodes','astTreeDepth','astComplexity','semTotalSymbols','semTotalScopes','semTotalWarnings','tokensTableBody','astVisualTree','astJsonViewer','symbolTableBody','tacCodeBlock','quadsTableBody','cfgBlocksContainer','asmCodeBlock','bytecodeTableBody','optPassList','diagnosticsContainer']) {
  assert.ok(html.includes(`id="${id}"`), `Missing compiler inspection element ${id}`);
}
for (const name of ['renderTokenTable','renderAstTree','renderTableBody','populateCompilerPhases']) {
  assert.ok(app.includes(`function ${name}(`), `Missing phase renderer ${name}`);
}
assert.match(app, /expandAstBtn[\s\S]*collapseAstBtn/);
assert.match(html, /educational analysis model/i, 'The UI must distinguish educational IR from native machine code.');
console.log(`[PASS] Compiler inspection pipeline produced all five phase data structures for ${completed}/55 language fixtures.`);
console.log('[PASS] Frontend renders token metrics/table, AST/JSON, semantic symbols, TAC, quadruples, CFG, assembly, bytecode, optimization passes and diagnostics.');
console.log('[PASS] Phase inspection explicitly distinguishes PolyCompile educational analysis from native compiler output.');
