/**
 * PolyCompile - Lexical Analyzer (Phase 1 of Compiler Design)
 * 
 * Performs tokenization, character-by-character lexical scanning,
 * classification into lexical tokens, position tracking, and statistical reporting.
 */

class Lexer {
  /**
   * Tokenizes the source code based on language characteristics.
   * @param {string} code 
   * @param {Object} language 
   * @returns {Object} { tokens, metrics, errors }
   */
  static tokenize(code, language = {}) {
    const tokens = [];
    const errors = [];
    const len = code.length;
    let pos = 0;
    let line = 1;
    let col = 1;

    const keywords = new Set(language.keywords || [
      'if', 'else', 'for', 'while', 'return', 'def', 'fn', 'function', 'class',
      'int', 'float', 'void', 'let', 'const', 'var', 'import', 'include'
    ]);

    const isCaseInsensitive = Boolean(language.features?.caseInsensitive);

    let tokenId = 1;

    while (pos < len) {
      const char = code[pos];

      // Handle newlines
      if (char === '\n') {
        pos++;
        line++;
        col = 1;
        continue;
      }

      // Handle carriage returns
      if (char === '\r') {
        pos++;
        continue;
      }

      // Whitespace
      if (char === ' ' || char === '\t') {
        pos++;
        col++;
        continue;
      }

      // 1. Comments
      // Preprocessor or hash comments
      if (char === '#' && language.id !== 'c' && language.id !== 'cpp') {
        const startCol = col;
        let val = '';
        while (pos < len && code[pos] !== '\n' && code[pos] !== '\r') {
          val += code[pos];
          pos++;
          col++;
        }
        tokens.push({
          id: tokenId++,
          type: 'COMMENT',
          value: val,
          line,
          col: startCol,
          length: val.length
        });
        continue;
      }

      // C-style comments or C preprocessor
      if (char === '#' && (language.id === 'c' || language.id === 'cpp')) {
        const startCol = col;
        let val = '';
        while (pos < len && code[pos] !== '\n' && code[pos] !== '\r') {
          val += code[pos];
          pos++;
          col++;
        }
        tokens.push({
          id: tokenId++,
          type: 'PREPROCESSOR',
          value: val,
          line,
          col: startCol,
          length: val.length
        });
        continue;
      }

      // Line comments // or block comments /* */
      if (char === '/' && pos + 1 < len && (code[pos + 1] === '/' || code[pos + 1] === '*')) {
        const startCol = col;
        if (code[pos + 1] === '/') {
          let val = '';
          while (pos < len && code[pos] !== '\n' && code[pos] !== '\r') {
            val += code[pos];
            pos++;
            col++;
          }
          tokens.push({
            id: tokenId++,
            type: 'COMMENT',
            value: val,
            line,
            col: startCol,
            length: val.length
          });
          continue;
        } else {
          // Block comment /* ... */
          let val = '/*';
          pos += 2;
          col += 2;
          let closed = false;
          while (pos < len) {
            if (code[pos] === '*' && pos + 1 < len && code[pos + 1] === '/') {
              val += '*/';
              pos += 2;
              col += 2;
              closed = true;
              break;
            }
            if (code[pos] === '\n') {
              line++;
              col = 1;
            } else {
              col++;
            }
            val += code[pos];
            pos++;
          }
          if (!closed) {
            errors.push({
              line,
              col: startCol,
              message: 'Unterminated block comment /* ... */'
            });
          }
          tokens.push({
            id: tokenId++,
            type: 'COMMENT',
            value: val,
            line,
            col: startCol,
            length: val.length
          });
          continue;
        }
      }

      // SQL / Ada / Lua comments: --
      if (char === '-' && pos + 1 < len && code[pos + 1] === '-' && (language.id === 'sql' || language.id === 'ada' || language.id === 'lua' || language.id === 'haskell')) {
        const startCol = col;
        let val = '';
        while (pos < len && code[pos] !== '\n' && code[pos] !== '\r') {
          val += code[pos];
          pos++;
          col++;
        }
        tokens.push({
          id: tokenId++,
          type: 'COMMENT',
          value: val,
          line,
          col: startCol,
          length: val.length
        });
        continue;
      }

      // Assembly / Lisp / Scheme comments: ;
      if (char === ';' && (language.id === 'assembly' || language.id === 'lisp' || language.id === 'clojure')) {
        const startCol = col;
        let val = '';
        while (pos < len && code[pos] !== '\n' && code[pos] !== '\r') {
          val += code[pos];
          pos++;
          col++;
        }
        tokens.push({
          id: tokenId++,
          type: 'COMMENT',
          value: val,
          line,
          col: startCol,
          length: val.length
        });
        continue;
      }

      // 2. String Literals
      if (char === '"' || char === "'" || char === '`') {
        const quote = char;
        const startCol = col;
        let val = quote;
        pos++;
        col++;
        let closed = false;

        while (pos < len) {
          const c = code[pos];
          if (c === '\\' && pos + 1 < len) {
            val += c + code[pos + 1];
            pos += 2;
            col += 2;
            continue;
          }
          if (c === quote) {
            val += c;
            pos++;
            col++;
            closed = true;
            break;
          }
          if (c === '\n') {
            if (quote !== '`') {
              // Multiline strings allowed with backticks, else flag error
              errors.push({
                line,
                col: startCol,
                message: `Unterminated string literal starting with ${quote}`
              });
              break;
            }
            line++;
            col = 1;
          } else {
            col++;
          }
          val += c;
          pos++;
        }

        tokens.push({
          id: tokenId++,
          type: 'STRING',
          value: val,
          line,
          col: startCol,
          length: val.length
        });
        continue;
      }

      // 3. Numbers (Dec, Hex, Floats)
      if (/\d/.test(char) || (char === '.' && pos + 1 < len && /\d/.test(code[pos + 1]))) {
        const startCol = col;
        let val = '';
        let isHex = false;

        if (char === '0' && pos + 1 < len && (code[pos + 1] === 'x' || code[pos + 1] === 'X')) {
          val += code[pos] + code[pos + 1];
          pos += 2;
          col += 2;
          isHex = true;
        }

        while (pos < len) {
          const c = code[pos];
          if (isHex && /[0-9a-fA-F]/.test(c)) {
            val += c;
            pos++;
            col++;
          } else if (!isHex && (/[0-9.]/.test(c) || (c === 'e' || c === 'E'))) {
            val += c;
            pos++;
            col++;
          } else {
            break;
          }
        }

        tokens.push({
          id: tokenId++,
          type: 'NUMBER',
          value: val,
          line,
          col: startCol,
          length: val.length
        });
        continue;
      }

      // 4. Identifiers & Keywords
      if (/[a-zA-Z_$]/.test(char) || char === '@') {
        const startCol = col;
        let val = '';
        if (code[pos] === '@') {
          val += '@';
          pos++;
          col++;
        }
        while (pos < len && /[a-zA-Z0-9_$]/.test(code[pos])) {
          val += code[pos];
          pos++;
          col++;
        }

        if (val.length === 0) {
          pos++;
          col++;
          continue;
        }

        const lookupVal = isCaseInsensitive ? val.toLowerCase() : val;
        let isKw = false;

        // Check language keywords
        for (const kw of keywords) {
          const compareKw = isCaseInsensitive ? kw.toLowerCase() : kw;
          if (compareKw === lookupVal) {
            isKw = true;
            break;
          }
        }

        // Assembly registers
        const isRegister = language.id === 'assembly' && /^(rax|rbx|rcx|rdx|rsi|rdi|rsp|rbp|eax|ebx|ecx|edx|al|ah|bl|bh)$/i.test(val);

        tokens.push({
          id: tokenId++,
          type: isRegister ? 'REGISTER' : isKw ? 'KEYWORD' : 'IDENTIFIER',
          value: val,
          line,
          col: startCol,
          length: val.length
        });
        continue;
      }

      // 5. Multi-character Operators (::, :=, ->, =>, ==, !=, <=, >=, &&, ||, ++, --, <<, >>, |>)
      const twoChar = pos + 1 < len ? code.substr(pos, 2) : '';
      const threeChar = pos + 2 < len ? code.substr(pos, 3) : '';

      if (['===', '!==', '<<=', '>>='].includes(threeChar)) {
        tokens.push({
          id: tokenId++,
          type: 'OPERATOR',
          value: threeChar,
          line,
          col,
          length: 3
        });
        pos += 3;
        col += 3;
        continue;
      }

      if (['::', ':=', '->', '=>', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '<<', '>>', '+=', '-=', '*=', '/=', '|>'].includes(twoChar)) {
        tokens.push({
          id: tokenId++,
          type: 'OPERATOR',
          value: twoChar,
          line,
          col,
          length: 2
        });
        pos += 2;
        col += 2;
        continue;
      }

      // 6. Single-character Operators
      if (['+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?'].includes(char)) {
        tokens.push({
          id: tokenId++,
          type: 'OPERATOR',
          value: char,
          line,
          col,
          length: 1
        });
        pos++;
        col++;
        continue;
      }

      // 7. Delimiters
      if (['(', ')', '{', '}', '[', ']', ';', ',', ':', '.'].includes(char)) {
        tokens.push({
          id: tokenId++,
          type: 'DELIMITER',
          value: char,
          line,
          col,
          length: 1
        });
        pos++;
        col++;
        continue;
      }

      // 8. Esoteric Brainfuck commands
      if (language.id === 'brainfuck' && ['<', '>', '+', '-', '.', ',', '[', ']'].includes(char)) {
        tokens.push({
          id: tokenId++,
          type: 'OPERATOR',
          value: char,
          line,
          col,
          length: 1
        });
        pos++;
        col++;
        continue;
      }

      // Unknown / Unrecognized character
      errors.push({
        line,
        col,
        message: `Unexpected or unrecognized character '${char}' (ASCII: ${char.charCodeAt(0)})`
      });

      pos++;
      col++;
    }

    // Compute Lexical Metrics
    const breakdown = {};
    for (const t of tokens) {
      breakdown[t.type] = (breakdown[t.type] || 0) + 1;
    }

    const totalCount = tokens.length;
    const kwCount = breakdown['KEYWORD'] || 0;
    const idCount = breakdown['IDENTIFIER'] || 0;
    const commentCount = breakdown['COMMENT'] || 0;

    const metrics = {
      totalTokens: totalCount,
      uniqueTokens: new Set(tokens.map((t) => t.value)).size,
      breakdown,
      keywordDensity: totalCount > 0 ? Math.round((kwCount / totalCount) * 1000) / 10 : 0,
      identifierDensity: totalCount > 0 ? Math.round((idCount / totalCount) * 1000) / 10 : 0,
      commentRatio: totalCount > 0 ? Math.round((commentCount / totalCount) * 1000) / 10 : 0,
      totalLines: line
    };

    return {
      tokens,
      metrics,
      errors
    };
  }
}

module.exports = Lexer;
