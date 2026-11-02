/**
 * PolyCompile - Syntax Analyzer & AST Generator (Phase 2 of Compiler Design)
 * 
 * Analyzes syntactic structure, validates delimiter and block balance,
 * generates an Abstract Syntax Tree (AST), and reports syntax errors with line/column markers.
 */

class Parser {
  /**
   * Parses token stream into an Abstract Syntax Tree
   * @param {Array} tokens 
   * @param {Object} language 
   * @returns {Object} { ast, syntaxErrors, metrics }
   */
  static parse(tokens, language = {}) {
    const syntaxErrors = [];
    const validTokens = tokens.filter((t) => t.type !== 'COMMENT' && t.type !== 'WHITESPACE');

    // 1. Structural Sanity Check: Delimiter Balancing
    this.checkDelimiterBalancing(tokens, syntaxErrors, language);

    // 2. Build AST
    let current = 0;

    function peek(offset = 0) {
      return validTokens[current + offset] || null;
    }

    function advance() {
      return validTokens[current++];
    }

    function matchType(type, value = null) {
      const tok = peek();
      if (!tok) return false;
      if (tok.type !== type) return false;
      if (value !== null && tok.value !== value) return false;
      return true;
    }

    const ast = {
      type: 'Program',
      language: language.name || 'Unknown',
      paradigm: language.paradigm || 'General',
      body: []
    };

    while (current < validTokens.length) {
      const node = parseTopLevelDeclaration();
      if (node) {
        ast.body.push(node);
      } else {
        // Recover from unparsed token
        advance();
      }
    }

    function parseTopLevelDeclaration() {
      const tok = peek();
      if (!tok) return null;

      // Imports / Includes / Packages
      if (tok.type === 'PREPROCESSOR') {
        advance();
        return {
          type: 'PreprocessorDirective',
          directive: tok.value,
          line: tok.line,
          col: tok.col
        };
      }

      if (['import', 'include', 'using', 'require', 'use', 'package', 'module', 'with'].includes(tok.value.toLowerCase())) {
        const keyword = advance();
        let target = '';
        while (peek() && peek().value !== ';' && peek().line === keyword.line) {
          target += (target ? ' ' : '') + advance().value;
        }
        if (peek() && peek().value === ';') advance();
        return {
          type: 'ModuleOrImportDeclaration',
          kind: keyword.value,
          target,
          line: keyword.line,
          col: keyword.col
        };
      }

      // Class declaration
      if (tok.value === 'class' || tok.value === 'struct' || tok.value === 'interface') {
        return parseClassDeclaration();
      }

      // Function declaration
      if (isFunctionStart(tok)) {
        return parseFunctionDeclaration();
      }

      // Variable declaration
      if (isVariableStart(tok)) {
        return parseVariableDeclaration();
      }

      // Generic statement / block
      return parseStatement();
    }

    function isFunctionStart(tok) {
      if (!tok) return false;
      const val = tok.value.toLowerCase();
      if (['fn', 'def', 'func', 'fun', 'function', 'procedure', 'sub', 'defun'].includes(val)) return true;
      // C/Java style: type followed by identifier and '(' e.g. int main(
      const next1 = peek(1);
      const next2 = peek(2);
      if (['void', 'int', 'float', 'double', 'char', 'bool', 'public', 'private', 'static'].includes(val)) {
        if (next1 && next1.type === 'IDENTIFIER' && next2 && next2.value === '(') return true;
        const next3 = peek(3);
        if (next2 && next2.type === 'IDENTIFIER' && next3 && next3.value === '(') return true;
      }
      return false;
    }

    function isVariableStart(tok) {
      if (!tok) return false;
      const val = tok.value.toLowerCase();
      if (['let', 'var', 'const', 'val', 'dim'].includes(val)) return true;
      const next1 = peek(1);
      const next2 = peek(2);
      if (['int', 'float', 'double', 'char', 'string', 'boolean'].includes(val)) {
        if (next1 && next1.type === 'IDENTIFIER' && (!next2 || next2.value !== '(')) return true;
      }
      return false;
    }

    function parseClassDeclaration() {
      const kindTok = advance();
      const nameTok = peek()?.type === 'IDENTIFIER' ? advance() : { value: 'Anonymous' };
      const members = [];

      // Skip inheritance / generics until opening brace
      while (peek() && peek().value !== '{' && peek().value !== ';' && peek().value !== 'begin') {
        advance();
      }

      if (peek() && peek().value === '{') {
        advance(); // consume '{'
        while (peek() && peek().value !== '}') {
          const member = isFunctionStart(peek()) ? parseFunctionDeclaration() : parseStatement();
          if (member) members.push(member);
          else advance();
        }
        if (peek() && peek().value === '}') advance();
      }

      return {
        type: 'ClassDeclaration',
        kind: kindTok.value,
        name: nameTok.value,
        members,
        line: kindTok.line,
        col: kindTok.col
      };
    }

    function parseFunctionDeclaration() {
      let returnType = 'inferred';
      let fnName = 'anonymous';
      const startTok = peek();

      // Skip modifiers: public, private, static, etc.
      while (peek() && ['public', 'private', 'protected', 'static', 'final', 'inline'].includes(peek().value.toLowerCase())) {
        advance();
      }

      // If typed (e.g. int main or void run)
      if (peek() && ['int', 'void', 'float', 'double', 'char', 'bool', 'string'].includes(peek().value.toLowerCase())) {
        returnType = advance().value;
      } else if (peek() && ['fn', 'def', 'func', 'fun', 'function', 'procedure', 'sub'].includes(peek().value.toLowerCase())) {
        advance();
      }

      if (peek() && peek().type === 'IDENTIFIER') {
        fnName = advance().value;
      }

      // Parameters
      const params = [];
      if (peek() && peek().value === '(') {
        advance();
        while (peek() && peek().value !== ')') {
          if (peek().type === 'IDENTIFIER') {
            params.push(advance().value);
          } else {
            advance();
          }
        }
        if (peek() && peek().value === ')') advance();
      }

      // Return type arrow -> or :
      if (peek() && (peek().value === '->' || peek().value === ':')) {
        advance();
        if (peek()) returnType = advance().value;
      }

      // Function Body
      const body = [];
      if (peek() && (peek().value === '{' || peek().value === ':')) {
        const isBrace = peek().value === '{';
        advance();
        if (isBrace) {
          while (peek() && peek().value !== '}') {
            const stmt = parseStatement();
            if (stmt) body.push(stmt);
            else advance();
          }
          if (peek() && peek().value === '}') advance();
        } else {
          // Indentation block or single statement
          const startLine = startTok.line;
          while (peek() && peek().line === startLine + 1) {
            const stmt = parseStatement();
            if (stmt) body.push(stmt);
            else advance();
          }
        }
      }

      return {
        type: 'FunctionDeclaration',
        name: fnName,
        returnType,
        params,
        body,
        line: startTok.line,
        col: startTok.col
      };
    }

    function parseVariableDeclaration() {
      const kw = advance();
      let varType = kw.value;
      let varName = 'unnamed';

      if (peek() && peek().type === 'IDENTIFIER') {
        varName = advance().value;
      }

      let initExpr = null;
      if (peek() && (peek().value === '=' || peek().value === ':=')) {
        advance();
        const exprParts = [];
        while (peek() && peek().value !== ';' && peek().line === kw.line) {
          exprParts.push(advance().value);
        }
        initExpr = exprParts.join(' ');
      }

      if (peek() && peek().value === ';') advance();

      return {
        type: 'VariableDeclaration',
        name: varName,
        varType,
        init: initExpr,
        line: kw.line,
        col: kw.col
      };
    }

    function parseStatement() {
      const tok = peek();
      if (!tok) return null;

      // Control flow: IF
      if (tok.value === 'if' || tok.value === 'IF') {
        const ifTok = advance();
        let condition = '';
        while (peek() && peek().value !== '{' && peek().value !== 'then' && peek().value !== ':') {
          condition += (condition ? ' ' : '') + advance().value;
        }
        if (peek() && ['{', 'then', ':'].includes(peek().value)) advance();
        return {
          type: 'IfStatement',
          condition,
          line: ifTok.line,
          col: ifTok.col
        };
      }

      // Control flow: WHILE / FOR
      if (['while', 'for', 'WHILE', 'FOR', 'loop'].includes(tok.value)) {
        const loopTok = advance();
        let condition = '';
        while (peek() && peek().value !== '{' && peek().value !== 'do' && peek().value !== ':') {
          condition += (condition ? ' ' : '') + advance().value;
        }
        if (peek() && ['{', 'do', ':'].includes(peek().value)) advance();
        return {
          type: 'LoopStatement',
          kind: loopTok.value,
          condition,
          line: loopTok.line,
          col: loopTok.col
        };
      }

      // RETURN
      if (tok.value === 'return' || tok.value === 'RETURN') {
        const retTok = advance();
        let value = '';
        while (peek() && peek().value !== ';' && peek().line === retTok.line) {
          value += (value ? ' ' : '') + advance().value;
        }
        if (peek() && peek().value === ';') advance();
        return {
          type: 'ReturnStatement',
          value,
          line: retTok.line,
          col: retTok.col
        };
      }

      // Expression / Call / Assignment
      const startLine = tok.line;
      const startCol = tok.col;
      const exprTokens = [];
      while (peek() && peek().value !== ';' && peek().line === startLine) {
        exprTokens.push(advance().value);
      }
      if (peek() && peek().value === ';') advance();

      return {
        type: 'ExpressionStatement',
        expression: exprTokens.join(' '),
        line: startLine,
        col: startCol
      };
    }

    // Compute AST Metrics
    const metrics = this.calculateAstMetrics(ast);

    return {
      ast,
      syntaxErrors,
      metrics
    };
  }

  /**
   * Validates delimiter balancing (parentheses, braces, brackets)
   */
  static checkDelimiterBalancing(tokens, syntaxErrors, language) {
    const stack = [];
    const pairs = {
      ')': '(',
      '}': '{',
      ']': '['
    };

    for (const t of tokens) {
      if (t.type !== 'DELIMITER') continue;

      if (['(', '{', '['].includes(t.value)) {
        stack.push(t);
      } else if ([')', '}', ']'].includes(t.value)) {
        const expected = pairs[t.value];
        if (stack.length === 0) {
          syntaxErrors.push({
            line: t.line,
            col: t.col,
            message: `Unmatched closing delimiter '${t.value}' without corresponding opening '${expected}'`
          });
        } else {
          const top = stack.pop();
          if (top.value !== expected) {
            syntaxErrors.push({
              line: t.line,
              col: t.col,
              message: `Mismatched delimiter: expected closing for '${top.value}' at line ${top.line}, but found '${t.value}'`
            });
          }
        }
      }
    }

    while (stack.length > 0) {
      const unclosed = stack.pop();
      syntaxErrors.push({
        line: unclosed.line,
        col: unclosed.col,
        message: `Unclosed delimiter '${unclosed.value}' opened at line ${unclosed.line}, col ${unclosed.col}`
      });
    }
  }

  /**
   * Calculates AST node counts, depth, and structural complexity
   */
  static calculateAstMetrics(ast) {
    let nodeCount = 0;
    let maxDepth = 0;
    let cyclomaticComplexity = 1;

    function traverse(node, depth) {
      if (!node) return;
      nodeCount++;
      if (depth > maxDepth) maxDepth = depth;

      if (['IfStatement', 'LoopStatement', 'CaseStatement'].includes(node.type)) {
        cyclomaticComplexity++;
      }

      if (Array.isArray(node.body)) {
        for (const child of node.body) traverse(child, depth + 1);
      }
      if (Array.isArray(node.members)) {
        for (const child of node.members) traverse(child, depth + 1);
      }
    }

    traverse(ast, 1);

    return {
      totalAstNodes: nodeCount,
      treeDepth: maxDepth,
      cyclomaticComplexity
    };
  }
}

module.exports = Parser;
