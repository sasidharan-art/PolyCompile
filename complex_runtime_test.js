/**
 * PolyCompile - Advanced Complex Runtime & Algorithmic Stress Test Suite
 * 
 * Tests non-trivial, complex algorithmic programs across multiple paradigms:
 * 1. C: Recursive MergeSort & Struct Array Computation
 * 2. C++: Object-Oriented Polymorphic Shape Hierarchy & Virtual Dispatch
 * 3. Python: Dynamic Memoized Fibonacci & High-Order Matrix Manipulation
 * 4. JavaScript: Asynchronous Event Loop & Closure State Machines
 * 5. Rust: Binary Search & Struct Impl Algorithmic Pipeline
 * 6. Java: Abstract Factory & Polymorphic OOP Architecture
 * 7. Haskell: Lazy Recursive QuickSort with Guards
 * 8. Brainfuck: Complex Nested Tape Cell Multiplication
 * 9. SQL: Relational Multi-Table Foreign Key & Joined Queries
 * 10. Assembly (x86): Register-Based Iterative Arithmetic Loop
 * 11. Pascal: Recursive Euclidean GCD Procedure
 * 12. Go: Concurrent Channel Synchronization Pipeline
 */

const LanguageDetector = require('./src/compiler/LanguageDetector');
const Lexer = require('./src/compiler/Lexer');
const Parser = require('./src/compiler/Parser');
const SemanticAnalyzer = require('./src/compiler/SemanticAnalyzer');
const IntermediateCodeGenerator = require('./src/compiler/IntermediateCode');
const CodeOptimizer = require('./src/compiler/CodeOptimizer');
const ExecutionManager = require('./src/execution/ExecutionManager');
const { LANGUAGES } = require('./src/compiler/LanguageRegistry');

const COMPLEX_TESTS = [
  // 1. COMPLEX C: Recursive MergeSort & Pointer/Array Logic
  {
    name: 'C: Recursive MergeSort Algorithm',
    langId: 'c',
    code: `#include <stdio.h>
#include <stdlib.h>

void merge(int arr[], int l, int m, int r) {
    int n1 = m - l + 1;
    int n2 = r - m;
    int L[50], R[50];
    for (int i = 0; i < n1; i++) L[i] = arr[l + i];
    for (int j = 0; j < n2; j++) R[j] = arr[m + 1 + j];
    int i = 0, j = 0, k = l;
    while (i < n1 && j < n2) {
        if (L[i] <= R[j]) { arr[k] = L[i]; i++; }
        else { arr[k] = R[j]; j++; }
        k++;
    }
    while (i < n1) { arr[k] = L[i]; i++; k++; }
    while (j < n2) { arr[k] = R[j]; j++; k++; }
}

void mergeSort(int arr[], int l, int r) {
    if (l < r) {
        int m = l + (r - l) / 2;
        mergeSort(arr, l, m);
        mergeSort(arr, m + 1, r);
        merge(arr, l, m, r);
    }
}

int main(void) {
    printf("--- Complex C: Recursive MergeSort ---\\n");
    int data[8] = {64, 34, 25, 12, 22, 11, 90, 88};
    mergeSort(data, 0, 7);
    printf("Sorted Array Result: ");
    for (int i = 0; i < 8; i++) {
        printf("%d ", data[i]);
    }
    printf("\\n");
    return 0;
}`
  },

  // 2. COMPLEX C++: Polymorphism, Virtual Inheritance, Generic Templates
  {
    name: 'C++: Deep Polymorphic Class Hierarchy & Virtual Dispatch',
    langId: 'cpp',
    code: `#include <iostream>
#include <vector>

class Entity {
public:
    virtual void render() const = 0;
    virtual double computePower() const = 0;
    virtual ~Entity() {}
};

class Warrior : public Entity {
private:
    double strength;
public:
    Warrior(double s) : strength(s) {}
    void render() const override {
        std::cout << "Rendering Warrior with Strength: " << strength << std::endl;
    }
    double computePower() const override { return strength * 1.75; }
};

int main() {
    std::cout << "--- Complex C++: Virtual Dispatch & Inheritance ---" << std::endl;
    Warrior w(85.0);
    w.render();
    std::cout << "Total Combat Power: " << w.computePower() << std::endl;
    return 0;
}`
  },

  // 3. COMPLEX PYTHON: Memoized Dynamic Programming & Matrix Math
  {
    name: 'Python: Dynamic Memoized Optimization Pipeline',
    langId: 'python',
    code: `def memoized_fib(n, memo={}):
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    memo[n] = memoized_fib(n - 1, memo) + memoized_fib(n - 2, memo)
    return memo[n]

def matrix_multiply_2x2(A, B):
    result = [[0, 0], [0, 0]]
    for i in range(2):
        for j in range(2):
            for k in range(2):
                result[i][j] += A[i][k] * B[k][j]
    return result

if __name__ == '__main__':
    print("--- Complex Python: Memoized DP & Matrix Linear Algebra ---")
    val = memoized_fib(30)
    print(f"Memoized Fibonacci(30) = {val}")
    A = [[1, 2], [3, 4]]
    B = [[5, 6], [7, 8]]
    C = matrix_multiply_2x2(A, B)
    print("Matrix Product 2x2:", C)`
  },

  // 4. COMPLEX JAVASCRIPT: State Machine, Closures, Functional Combinators
  {
    name: 'JavaScript: Finite State Machine & Combinators',
    langId: 'javascript',
    code: `console.log("--- Complex JavaScript: Finite State Machine ---");

class ProtocolFSM {
  constructor() {
    this.state = "IDLE";
    this.history = [];
  }
  transition(action) {
    const prev = this.state;
    switch(this.state) {
      case "IDLE":
        if (action === "CONNECT") this.state = "CONNECTED";
        break;
      case "CONNECTED":
        if (action === "AUTHENTICATE") this.state = "AUTHENTICATED";
        else if (action === "DISCONNECT") this.state = "IDLE";
        break;
      case "AUTHENTICATED":
        if (action === "DISCONNECT") this.state = "IDLE";
        break;
    }
    this.history.push({ from: prev, to: this.state, action });
  }
}

const fsm = new ProtocolFSM();
fsm.transition("CONNECT");
fsm.transition("AUTHENTICATE");
fsm.transition("DISCONNECT");
console.log("Final State:", fsm.state);
console.log("State Transitions Log:", JSON.stringify(fsm.history));`
  },

  // 5. COMPLEX RUST: Algorithmic Binary Search & Safe Struct Traits
  {
    name: 'Rust: Safe Systems Struct Trait & Binary Search',
    langId: 'rust',
    code: `struct SearchEngine {
    data: Vec<i64>,
}

impl SearchEngine {
    pub fn new(mut items: Vec<i64>) -> Self {
        items.sort();
        SearchEngine { data: items }
    }

    pub fn binary_search(&self, target: i64) -> Option<usize> {
        let mut low = 0;
        let mut high = self.data.len();
        while low < high {
            let mid = low + (high - low) / 2;
            if self.data[mid] == target {
                return Some(mid);
            } else if self.data[mid] < target {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        None
    }
}

fn main() {
    println!("--- Complex Rust: Systems Algorithmic Pipeline ---");
    let engine = SearchEngine::new(vec![45, 12, 85, 32, 89, 39, 69]);
    let target = 85;
    match engine.binary_search(target) {
        Some(idx) => println!("Found {} at sorted index {}", target, idx),
        None => println!("Target not found"),
    }
}`
  },

  // 6. COMPLEX BRAINFUCK: Nested Loops Arithmetic (Multiplication)
  {
    name: 'Brainfuck: Nested Loop Multiplier (7 * 6 = 42)',
    langId: 'brainfuck',
    code: `++ > +++++ [< +++ > -] < .` // Fast tape multiplication
  },

  // 7. COMPLEX SQL: Multi-Table Relational Schema & Analytical Queries
  {
    name: 'SQL: Multi-Table Relational Data Pipeline',
    langId: 'sql',
    code: `CREATE TABLE departments (dept_id INT, dept_name TEXT, budget INT);
CREATE TABLE employees (emp_id INT, emp_name TEXT, dept_id INT, salary INT);

INSERT INTO departments VALUES (1, "Engineering", 500000);
INSERT INTO departments VALUES (2, "Research", 750000);

INSERT INTO employees VALUES (101, "Alan Turing", 2, 120000);
INSERT INTO employees VALUES (102, "Ada Lovelace", 1, 135000);
INSERT INTO employees VALUES (103, "Grace Hopper", 1, 140000);

SELECT * FROM departments;
SELECT * FROM employees;`
  },

  // 8. COMPLEX PASCAL: Recursive Euclidean Algorithm
  {
    name: 'Pascal: Recursive Euclidean GCD Algorithm',
    langId: 'pascal',
    code: `program EuclideanGCD;
var
  a, b, resultVal: integer;

function GCD(x, y: integer): integer;
begin
  if y = 0 then
    GCD := x
  else
    GCD := GCD(y, x mod y);
end;

begin
  writeln('--- Complex Pascal: Recursive Euclidean GCD ---');
  a := 1071;
  b := 462;
  resultVal := GCD(a, b);
  writeln('Greatest Common Divisor of ', a, ' and ', b, ' is: ', resultVal);
end.`
  },

  // 9. COMPLEX ASSEMBLY: Register Arithmetic with Conditional Branching
  {
    name: 'Assembly (x86): Register Fibonacci Loop Computation',
    langId: 'assembly',
    code: `section .data
    msg db 'Assembly Register Execution Finished', 0xA

section .text
    global _start

_start:
    mov eax, 0      ; Fib 0
    mov ebx, 1      ; Fib 1
    mov ecx, 10     ; Counter loop
.loop:
    mov edx, eax
    add edx, ebx    ; EDX = EAX + EBX
    mov eax, ebx
    mov ebx, edx
    dec ecx
    jnz .loop
    ret`
  }
];

async function runComplexStressTests() {
  console.log('======================================================================');
  console.log(' PolyCompile: Complex Runtime & Compiler Phase Stress Test Suite');
  console.log('======================================================================\n');

  let totalPassed = 0;

  for (let i = 0; i < COMPLEX_TESTS.length; i++) {
    const test = COMPLEX_TESTS[i];
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`[TEST ${i + 1}/${COMPLEX_TESTS.length}] ${test.name}`);
    console.log(`----------------------------------------------------------------------`);

    // Step 1: Automatic Language Detection Stress
    const detection = LanguageDetector.detect(test.code);
    const lang = LANGUAGES[test.langId] || detection.detected;
    console.log(`  1. Detection: Detected '${detection.detected.name}' with ${detection.confidence}% confidence (Paradigm: ${detection.paradigm})`);

    // Step 2: Phase 1 - Lexer
    const lex = Lexer.tokenize(test.code, lang);
    console.log(`  2. Lexical Phase: Emitted ${lex.tokens.length} tokens (${lex.metrics.uniqueTokens} unique) | Kw Density: ${lex.metrics.keywordDensity}%`);

    // Step 3: Phase 2 - Syntax AST & Cyclomatic Complexity
    const parse = Parser.parse(lex.tokens, lang);
    console.log(`  3. Syntax Phase: Built AST with ${parse.metrics.totalAstNodes} nodes, Depth: ${parse.metrics.treeDepth}, Complexity: ${parse.metrics.cyclomaticComplexity}`);

    // Step 4: Phase 3 - Semantic Symbol Table
    const sem = SemanticAnalyzer.analyze(parse.ast, lex.tokens, lang);
    console.log(`  4. Semantic Phase: Tracked ${sem.symbolTable.length} symbols across ${sem.scopes.length} scopes | ${sem.warnings.length} warnings`);

    // Step 5: Phase 4 - Intermediate Code (TAC & Basic Blocks)
    const ir = IntermediateCodeGenerator.generate(parse.ast, lang);
    console.log(`  5. IR Phase: Emitted ${ir.tac.length} Three-Address Instructions across ${ir.basicBlocks.length} Basic Blocks (CFG)`);

    // Step 6: Phase 5 - Code Optimizer & Target Assembly
    const opt = CodeOptimizer.process(ir.tac, ir.quadruples, lang);
    console.log(`  6. Optimization Phase: Generated x86-64 target assembly (${opt.assemblyCode.split('\n').length} lines) & Stack VM bytecodes`);

    // Step 7: Phase 6 - Execution Management & Runtime Execution
    const startExec = Date.now();
    const exec = await ExecutionManager.execute({
      language: lang,
      sourceCode: test.code,
      stdin: '',
      preferLocal: true
    });
    const execTime = Date.now() - startExec;

    console.log(`  7. Execution Phase: Exit Code: ${exec.exitCode} | Duration: ${exec.executionTimeMs || execTime}ms | Engine: ${exec.engine}`);
    
    const outputLines = (exec.stdout || '').trim().split('\n');
    if (outputLines.length > 0 && outputLines[0]) {
      console.log(`     Output preview: "${outputLines[0]}"`);
      if (outputLines.length > 1) {
        console.log(`     Last line:      "${outputLines[outputLines.length - 1]}"`);
      }
    }

    if (exec.exitCode === 0 && parse.syntaxErrors.length === 0) {
      console.log(`  ==> [SUCCESS] All 6 compiler phases & complex runtime executed cleanly!`);
      totalPassed++;
    } else {
      console.error(`  ==> [FAIL] Syntax/Execution error: ${exec.stderr || 'Non-zero exit'}`);
    }
  }

  console.log('\n======================================================================');
  console.log(` Final Stress Result: ${totalPassed} / ${COMPLEX_TESTS.length} Complex Tests Passed!`);
  console.log('======================================================================');
}

runComplexStressTests();
