/**
 * PolyCompile - Diagnostic & Error Explanation Engine
 * 
 * Aggregates compiler diagnostics across lexical, syntactic, semantic, and runtime phases,
 * generates code frames with visual error pointers (^^^), and provides intelligent remediation suggestions.
 */

class DiagnosticEngine {
  /**
   * Formats and enriches diagnostics with source context and recommendations.
   * @param {string} sourceCode 
   * @param {Object} phaseResults 
   * @returns {Array} List of enriched diagnostic objects
   */
  static generateDiagnostics(sourceCode, { lexerErrors = [], syntaxErrors = [], semanticErrors = [], warnings = [], runtimeError = null } = {}) {
    const diagnostics = [];
    const lines = sourceCode ? sourceCode.split('\n') : [];

    // Helper to generate visual code frame
    function createCodeFrame(lineNum, colNum) {
      if (!lineNum || lineNum < 1 || lineNum > lines.length) return null;
      const targetLine = lines[lineNum - 1];
      const prevLine = lineNum > 1 ? lines[lineNum - 2] : null;
      const nextLine = lineNum < lines.length ? lines[lineNum] : null;

      const pointer = ' '.repeat(Math.max(0, (colNum || 1) - 1)) + '^^^';

      return {
        prev: prevLine !== null ? { line: lineNum - 1, text: prevLine } : null,
        target: { line: lineNum, text: targetLine },
        pointer,
        next: nextLine !== null ? { line: lineNum + 1, text: nextLine } : null
      };
    }

    // 1. Lexical Errors
    for (const err of lexerErrors) {
      diagnostics.push({
        id: `LEX_${diagnostics.length + 1}`,
        phase: 'Phase 1: Lexical Analysis',
        severity: 'error',
        line: err.line,
        col: err.col,
        message: err.message,
        codeFrame: createCodeFrame(err.line, err.col),
        recommendation: this.getRemediation(err.message, 'lexical')
      });
    }

    // 2. Syntax Errors
    for (const err of syntaxErrors) {
      diagnostics.push({
        id: `SYN_${diagnostics.length + 1}`,
        phase: 'Phase 2: Syntax Analysis',
        severity: 'error',
        line: err.line,
        col: err.col,
        message: err.message,
        codeFrame: createCodeFrame(err.line, err.col),
        recommendation: this.getRemediation(err.message, 'syntax')
      });
    }

    // 3. Semantic Errors
    for (const err of semanticErrors) {
      diagnostics.push({
        id: `SEM_${diagnostics.length + 1}`,
        phase: 'Phase 3: Semantic Analysis',
        severity: 'error',
        line: err.line,
        col: err.col,
        message: err.message,
        codeFrame: createCodeFrame(err.line, err.col),
        recommendation: this.getRemediation(err.message, 'semantic')
      });
    }

    // 4. Semantic Warnings
    for (const warn of warnings) {
      diagnostics.push({
        id: `WRN_${diagnostics.length + 1}`,
        phase: 'Phase 3: Semantic Analysis',
        severity: 'warning',
        line: warn.line,
        col: warn.col,
        message: warn.message,
        codeFrame: createCodeFrame(warn.line, warn.col),
        recommendation: this.getRemediation(warn.message, 'warning')
      });
    }

    // 5. Runtime / Execution Errors
    if (runtimeError) {
      diagnostics.push({
        id: `RUN_${diagnostics.length + 1}`,
        phase: 'Phase 6: Execution & Sandbox',
        severity: 'error',
        line: runtimeError.line || null,
        col: runtimeError.col || null,
        message: runtimeError.message || runtimeError.toString(),
        codeFrame: runtimeError.line ? createCodeFrame(runtimeError.line, runtimeError.col) : null,
        recommendation: 'Verify standard input arguments, boundary limits, or external dependencies.'
      });
    }

    return diagnostics;
  }

  /**
   * Generates actionable remediation guidance based on diagnostic message patterns
   */
  static getRemediation(message, phase) {
    const msg = message.toLowerCase();

    if (msg.includes('unclosed') || msg.includes('unterminated') || msg.includes('unmatched')) {
      return 'Ensure all opening quotes, braces {}, brackets [], or parentheses () have matching closing counterparts.';
    }
    if (msg.includes('redeclaration')) {
      return 'Rename this variable or place it within a distinct nested block scope to avoid identifier collision.';
    }
    if (msg.includes('dead variable') || msg.includes('never read')) {
      return 'Consider removing unused declarations to save memory and improve code clarity.';
    }
    if (msg.includes('entry point') || msg.includes('main()')) {
      return 'Define a standard entry point (e.g., int main() in C/C++, public static void main() in Java, fn main() in Rust) so the runtime linker knows where to start.';
    }
    if (msg.includes('semicolon')) {
      return 'Check the preceding statement to make sure it is terminated with a semicolon (;).';
    }

    return 'Review syntax against language specification guidelines.';
  }
}

module.exports = DiagnosticEngine;
