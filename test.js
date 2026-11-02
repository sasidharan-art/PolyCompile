/**
 * PolyCompile - Verification Test Suite
 * Tests:
 * 1. Language Detection across Structured, Unstructured, OOP, Functional, Systems, Scripting, and Declarative
 * 2. Phase 1: Lexical Analysis
 * 3. Phase 2: Syntax Analysis & Delimiter Balancer
 * 4. Phase 3: Semantic Analysis & Symbol Table
 * 5. Phase 4: Intermediate Representation (TAC, CFG)
 * 6. Phase 5: Code Optimization & Assembly Generation
 * 7. Phase 6: Built-in local sandboxes & execution engines
 */

const LanguageDetector = require('./src/compiler/LanguageDetector');
const Lexer = require('./src/compiler/Lexer');
const Parser = require('./src/compiler/Parser');
const SemanticAnalyzer = require('./src/compiler/SemanticAnalyzer');
const IntermediateCodeGenerator = require('./src/compiler/IntermediateCode');
const CodeOptimizer = require('./src/compiler/CodeOptimizer');
const LocalEngines = require('./src/execution/LocalEngines');
const { normalizeJavaForWandbox } = require('./src/execution/SandboxClient');
const { SNIPPETS } = require('./src/snippets/CodeSnippets');

console.log('========================================================');
console.log(' PolyCompile Automated Verification Test Suite');
console.log('========================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

// 1. Test Language Auto-Detection
console.log('Test Suite 1: Automatic Multi-Paradigm Language Detection');
for (const snippet of SNIPPETS) {
  const result = LanguageDetector.detect(snippet.code);
  const isMatch = result.detected.id === snippet.languageId || 
                  (snippet.languageId === 'ruby_script' && result.detected.id === 'ruby') ||
                  (snippet.languageId === 'typescript' && result.detected.id === 'typescript');
  assert(isMatch, `Detected ${result.detected.name} (Expected: ${snippet.languageId}) [Confidence: ${result.confidence}%]`);
}

// 2. Test Phase 1: Lexical Analyzer
console.log('\nTest Suite 2: Lexical Analysis (Phase 1)');
const cSnippet = SNIPPETS.find(s => s.languageId === 'c');
const lexResult = Lexer.tokenize(cSnippet.code, { id: 'c', keywords: ['int', 'return', 'for', 'if'] });
assert(lexResult.tokens.length > 20, `Generated ${lexResult.tokens.length} lexical tokens with line/col positions`);
assert(lexResult.metrics.keywordDensity > 0, `Computed lexical keyword density: ${lexResult.metrics.keywordDensity}%`);

// 3. Test Phase 2: Syntax Analysis (AST)
console.log('\nTest Suite 3: Syntax Analysis & AST Generation (Phase 2)');
const parseResult = Parser.parse(lexResult.tokens, { name: 'C', paradigm: 'Structured' });
assert(parseResult.ast.type === 'Program', 'Constructed Program root AST node');
assert(parseResult.metrics.totalAstNodes > 0, `Constructed ${parseResult.metrics.totalAstNodes} AST nodes`);
assert(parseResult.syntaxErrors.length === 0, 'Validated syntax structure with 0 delimiter errors');

// 4. Test Delimiter Balancer Error Catching
const brokenCode = `int main() { if (x > 0) { return 1; }`; // Missing closing brace
const brokenTokens = Lexer.tokenize(brokenCode, { id: 'c' }).tokens;
const brokenParse = Parser.parse(brokenTokens, { name: 'C' });
assert(brokenParse.syntaxErrors.length > 0, `Detected syntax error on unclosed delimiter: "${brokenParse.syntaxErrors[0].message}"`);

// 5. Test Phase 3: Semantic Analysis & Symbol Table
console.log('\nTest Suite 4: Semantic Analysis & Symbol Table (Phase 3)');
const semResult = SemanticAnalyzer.analyze(parseResult.ast, lexResult.tokens, { id: 'c', name: 'C' });
assert(semResult.symbolTable.length > 0, `Registered ${semResult.symbolTable.length} symbols in Symbol Table`);
assert(semResult.scopes.length > 0, `Organized ${semResult.scopes.length} hierarchical scopes`);

// 6. Test Phase 4: Intermediate Code Generation (TAC & CFG)
console.log('\nTest Suite 5: Intermediate Representation (Phase 4)');
const irResult = IntermediateCodeGenerator.generate(parseResult.ast, { name: 'C' });
assert(irResult.tac.length > 0, `Generated ${irResult.tac.length} Three-Address Code (TAC) instructions`);
assert(irResult.basicBlocks.length > 0, `Partitioned into ${irResult.basicBlocks.length} Basic Blocks for CFG`);

// 7. Test Phase 5: Code Optimization & Code Generation
console.log('\nTest Suite 6: Code Optimization & Target CodeGen (Phase 5)');
const optResult = CodeOptimizer.process(irResult.tac, irResult.quadruples, { name: 'C' });
assert(optResult.assemblyCode.includes('.intel_syntax'), 'Emitted x86-64 Target Assembly');
assert(optResult.bytecode.length > 0, `Emitted ${optResult.bytecode.length} Stack VM bytecodes`);

// 8. Java runtime regression: top-level normalization must not corrupt source strings.
console.log('\nTest Suite 7: Java Wandbox Source Normalization Regression');
const javaWrapper = `public class DynamicCompiler {
  String source = "public class GeneratedProgram { public static void run() {} }";
  /* public class CommentExample {} */
}`;
const normalizedJava = normalizeJavaForWandbox(javaWrapper);
assert(!/^\s*public\s+class\s+DynamicCompiler/m.test(normalizedJava), 'Removed public only from top-level class for fixed filename');
assert(normalizedJava.includes('"public class GeneratedProgram { public static void run() {} }"'), 'Preserved generated Java class inside a string literal');
assert(normalizedJava.includes('/* public class CommentExample {} */'), 'Preserved comments without rewriting them');
const textBlockJava = 'public class Main { String s = """\npublic class GeneratedProgram {}\n"""; }';
assert(normalizeJavaForWandbox(textBlockJava).includes('public class GeneratedProgram {}'), 'Preserved Java text blocks containing generated source');

// 9. Test Phase 6: Built-in In-Process Execution Engines
console.log('\nTest Suite 7: Built-in Offline Execution Engines');
// JS VM
const jsExec = LocalEngines.runJavaScript('console.log("PolyCompile V8 OK"); 2 + 2;');
assert(jsExec.stdout.includes('PolyCompile V8 OK'), `JavaScript Sandbox: ${jsExec.stdout.trim()}`);

// Brainfuck VM
const bfExec = LocalEngines.runBrainfuck('++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.');
assert(bfExec.stdout.includes('Hello World!'), `Brainfuck 30,000-cell Tape VM: ${bfExec.stdout.trim()}`);

// BASIC Runtime
const basicExec = LocalEngines.runBasic('PRINT "BASIC ALIVE"\nLET A = 50\nPRINT A');
assert(basicExec.stdout.includes('BASIC ALIVE'), `BASIC Runtime: Output received successfully`);

// Relational SQL Engine
const sqlExec = LocalEngines.runSQL('CREATE TABLE items (id INT, name TEXT); INSERT INTO items VALUES (1, "Laser"); SELECT * FROM items;');
assert(sqlExec.stdout.includes('Laser'), `In-Memory Relational SQL Engine: Table rendered`);

// x86 CPU Emulator
const asmExec = LocalEngines.runAssembly('mov eax, 10\nadd eax, 5');
assert(asmExec.stdout.includes('EAX: 15'), `x86 CPU Emulator: Register state verified`);

console.log('\n========================================================');
console.log(` Verification Completed: ${passedTests} / ${totalTests} tests PASSED!`);
console.log('========================================================');
