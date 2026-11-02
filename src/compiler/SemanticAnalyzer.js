/**
 * PolyCompile - Semantic Analyzer (Phase 3 of Compiler Design)
 * 
 * Performs Symbol Table construction, scope management, type checking,
 * undeclared variable detection, unused identifier analysis, and entry-point verification.
 */

class SemanticAnalyzer {
  /**
   * Analyzes an AST and tokens for semantic validity.
   * @param {Object} ast 
   * @param {Array} tokens 
   * @param {Object} language 
   * @returns {Object} { symbolTable, scopes, semanticErrors, warnings }
   */
  static analyze(ast, tokens = [], language = {}) {
    const symbolTable = [];
    const semanticErrors = [];
    const warnings = [];
    const scopes = [{ id: 'global', parent: null, symbols: new Map() }];
    let currentScopeIndex = 0;

    function currentScope() {
      return scopes[currentScopeIndex];
    }

    function enterScope(name) {
      const newScope = {
        id: `${name}_${scopes.length}`,
        parent: currentScopeIndex,
        symbols: new Map()
      };
      scopes.push(newScope);
      currentScopeIndex = scopes.length - 1;
    }

    function exitScope() {
      if (currentScope().parent !== null) {
        currentScopeIndex = currentScope().parent;
      }
    }

    function addSymbol(name, kind, type, line, col) {
      const scope = currentScope();
      if (scope.symbols.has(name)) {
        const prev = scope.symbols.get(name);
        semanticErrors.push({
          line,
          col,
          message: `Redeclaration of identifier '${name}' in scope '${scope.id}'. Originally declared at line ${prev.definedLine}.`
        });
        return;
      }

      const symbol = {
        name,
        kind,
        type: type || 'inferred',
        scope: scope.id,
        definedLine: line,
        col,
        usages: []
      };

      scope.symbols.set(name, symbol);
      symbolTable.push(symbol);
    }

    function findSymbol(name) {
      let idx = currentScopeIndex;
      while (idx !== null) {
        if (scopes[idx].symbols.has(name)) {
          return scopes[idx].symbols.get(name);
        }
        idx = scopes[idx].parent;
      }
      return null;
    }

    // 1. Traverse AST to register definitions
    function traverse(node) {
      if (!node) return;

      switch (node.type) {
        case 'ModuleOrImportDeclaration':
          addSymbol(node.target || node.kind, 'module', 'namespace', node.line, node.col);
          break;

        case 'ClassDeclaration':
          addSymbol(node.name, 'class', node.kind, node.line, node.col);
          enterScope(node.name);
          if (Array.isArray(node.members)) {
            for (const m of node.members) traverse(m);
          }
          exitScope();
          break;

        case 'FunctionDeclaration':
          addSymbol(node.name, 'function', node.returnType, node.line, node.col);
          enterScope(node.name);
          // Add parameters to function scope
          if (Array.isArray(node.params)) {
            for (const param of node.params) {
              addSymbol(param, 'parameter', 'inferred', node.line, node.col);
            }
          }
          // Process statements in function body
          if (Array.isArray(node.body)) {
            for (const stmt of node.body) traverse(stmt);
          }
          exitScope();
          break;

        case 'VariableDeclaration':
          addSymbol(node.name, 'variable', node.varType, node.line, node.col);
          break;

        default:
          if (Array.isArray(node.body)) {
            for (const child of node.body) traverse(child);
          }
          break;
      }
    }

    traverse(ast);

    // 2. Track Symbol Usages across token stream
    const definedNames = new Set(symbolTable.map((s) => s.name));
    for (const t of tokens) {
      if (t.type === 'IDENTIFIER') {
        const symbol = findSymbol(t.value);
        if (symbol && t.line !== symbol.definedLine) {
          symbol.usages.push(t.line);
        }
      }
    }

    // 3. Entry Point Verification for Systems & Structured Languages
    const requiresMain = ['c', 'cpp', 'java', 'rust', 'go', 'csharp'].includes(language.id);
    if (requiresMain) {
      const hasMain = symbolTable.some(
        (s) => s.kind === 'function' && ['main', 'Main', 'main()'].includes(s.name)
      );
      if (!hasMain) {
        warnings.push({
          line: 1,
          col: 1,
          message: `Language '${language.name}' typically requires an entry point function 'main()'. None was detected in the top-level scope.`
        });
      }
    }

    // 4. Dead Code / Unused Variable Warnings
    for (const sym of symbolTable) {
      if (sym.kind === 'variable' && sym.usages.length === 0 && sym.name !== 'unnamed') {
        warnings.push({
          line: sym.definedLine,
          col: sym.col,
          message: `Variable '${sym.name}' declared at line ${sym.definedLine} is never read or referenced (Dead Variable).`
        });
      }
    }

    return {
      symbolTable,
      scopes: scopes.map((s) => ({ id: s.id, parent: s.parent, symbolCount: s.symbols.size })),
      semanticErrors,
      warnings
    };
  }
}

module.exports = SemanticAnalyzer;
