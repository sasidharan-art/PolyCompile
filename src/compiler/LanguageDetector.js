

const { LANGUAGES, getAllLanguages, PARADIGMS } = require('./LanguageRegistry');
const { sanitizeSourceCode } = require('../utils/codeSanitizer');

class LanguageDetector {
  /**
   * Detects the programming language of the given source code.
   * @param {string} sourceCode 
   * @returns {Object} Detection result containing language id, confidence, paradigm, candidates, and reasoning
   */
  static detect(sourceCode) {
    sourceCode = sanitizeSourceCode(sourceCode);
    if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
      return {
        detected: LANGUAGES.c,
        confidence: 0,
        candidates: [],
        reasoning: ['Empty source code provided; defaulted to C.'],
        paradigm: PARADIGMS.STRUCTURED.name
      };
    }

    const trimmed = sourceCode.trim();

    // 1. Check for Esoteric Brainfuck special case first
    const bfChars = trimmed.replace(/[\s\r\n]/g, '');
    const bfMatches = bfChars.match(/^[><+\-.,\[\]]+$/);
    if (bfMatches && bfChars.length >= 6) {
      return {
        detected: LANGUAGES.brainfuck,
        confidence: 99.5,
        candidates: [{ language: LANGUAGES.brainfuck, score: 100 }],
        reasoning: [
          'Source code consists exclusively of Brainfuck tape memory manipulation symbols [><+-.,[]]',
          'Unstructured Turing-complete esoteric language pattern'
        ],
        paradigm: PARADIGMS.UNSTRUCTURED.name
      };
    }

    // 2. Tokenize and extract lexical primitives
    const normalizedCode = sourceCode;
    const lowerCode = sourceCode.toLowerCase();
    const words = sourceCode.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    const wordCounts = {};
    for (const w of words) {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    }

    // 3. Score all registered languages
    const scores = [];

    for (const lang of getAllLanguages()) {
      if (lang.id === 'brainfuck') continue;

      let score = 0;
      const matchedFeatures = [];

      // A. Characteristic Signature Regexes (High Weight: 25-40 points each)
      if (lang.signatureRegexes) {
        for (const regex of lang.signatureRegexes) {
          if (regex.test(normalizedCode)) {
            score += 35;
            matchedFeatures.push(`Matched signature: ${regex.toString()}`);
          }
        }
      }

      // B. Keyword Frequency & Lexical Density
      if (lang.keywords) {
        let matchedKeywordCount = 0;
        let totalOccurrences = 0;

        for (const kw of lang.keywords) {
          const count = lang.features?.caseInsensitive
            ? (wordCounts[kw.toLowerCase()] || 0) + (wordCounts[kw.toUpperCase()] || 0)
            : (wordCounts[kw] || 0);

          if (count > 0) {
            matchedKeywordCount++;
            totalOccurrences += count;
            // Higher weight for very language-specific keywords
            const specificity = this.getKeywordSpecificity(kw);
            score += 4 * specificity;
          }
        }

        if (matchedKeywordCount > 0) {
          matchedFeatures.push(`Matched ${matchedKeywordCount} characteristic keywords (${totalOccurrences} occurrences)`);
        }
      }

      // C. Syntactic Structure & Grammar Indicators
      // Indentation-based languages (Python)
      if (lang.features?.indentationBased) {
        if (/:\s*[\r\n]+\s{2,}/.test(sourceCode)) {
          score += 15;
          matchedFeatures.push('Matched indentation-based block syntax');
        }
      }

      // Braced languages with semicolons
      if (lang.features?.blockDelimiters && lang.features.blockDelimiters[0] === '{') {
        const openBraces = (sourceCode.match(/\{/g) || []).length;
        const closeBraces = (sourceCode.match(/\}/g) || []).length;
        if (openBraces > 0 && openBraces === closeBraces) {
          score += 6;
        }
      }

      // Languages using 'begin ... end' (Pascal, Ada, Ruby)
      if (lang.features?.blockDelimiters && lang.features.blockDelimiters[0] === 'begin') {
        if (/\bbegin\b/i.test(sourceCode) && /\bend\b/i.test(sourceCode)) {
          score += 25;
          matchedFeatures.push('Matched structured begin...end block delimiters');
        }
      }

      // Sigil variables (PHP $, Perl $,@,%)
      if (lang.features?.sigilVariables) {
        if (lang.id === 'php' && /\$[a-zA-Z_]/.test(sourceCode) && /<\?php/.test(sourceCode)) {
          score += 40;
          matchedFeatures.push('Matched PHP variable sigils ($) and open tag');
        } else if (lang.id === 'perl' && /[$@%][a-zA-Z_]/.test(sourceCode) && /use\s+strict/.test(sourceCode)) {
          score += 35;
          matchedFeatures.push('Matched Perl sigil syntax and strict pragma');
        }
      }

      // S-Expressions (Lisp / Clojure)
      if (lang.features?.blockDelimiters && lang.features.blockDelimiters[0] === '(') {
        if (/^\s*\([a-zA-Z_-]+/m.test(sourceCode)) {
          score += 30;
          matchedFeatures.push('Matched S-expression prefix syntax');
        }
      }

      // Low-level Assembly register syntax
      if (lang.features?.hasRegisters) {
        if (/\b(rax|rbx|rcx|rdx|eax|ebx|ecx|edx|rsi|rdi)\b/i.test(sourceCode)) {
          score += 30;
          matchedFeatures.push('Detected hardware register references');
        }
      }

      // Crystal uses Ruby-like syntax, but typed method parameters/returns are a
      // strong Crystal discriminator. Give this compound signature priority over Ruby.
      if (lang.id === 'crystal' && /\bdef\s+[a-zA-Z_]\w*\s*\([^)]*:\s*(?:String|Int32|Int64|Float32|Float64|Bool|Char)\b/i.test(sourceCode)) {
        score += 55;
        matchedFeatures.push('Matched Crystal typed method signature');
      }

      // Fish shell's local-variable declaration plus `$variable` loop syntax
      // distinguishes it from PHP's shared `echo` keyword.
      if (lang.id === 'fish' && /\bset\s+-l\s+[a-zA-Z_]\w*/.test(sourceCode) && /\bfor\s+[a-zA-Z_]\w*\s+in\s+\$[a-zA-Z_]\w*/.test(sourceCode)) {
        score += 35;
        matchedFeatures.push('Matched Fish local-variable and list-loop syntax');
      }

      // Nim's typed proc declaration distinguishes its `let`/`var` syntax
      // from Kotlin and other indentation-oriented languages.
      if (lang.id === 'nim' && /\bproc\s+[a-zA-Z_]\w*\s*\([^)]*:\s*(?:int|float|string|bool|seq|array|ref|var)\b/i.test(sourceCode)) {
        score += 35;
        matchedFeatures.push('Matched Nim typed procedure declaration');
      }

      // Negative heuristics (Disambiguation)
      // If code has #include <iostream>, it is definitely NOT C
      if (lang.id === 'c' && /#include\s+<iostream>/i.test(sourceCode)) {
        score -= 50;
      }
      // If code has std::cout, definitely NOT C
      if (lang.id === 'c' && /std::cout/i.test(sourceCode)) {
        score -= 60;
      }
      // If code has System.out.println, NOT C/C++
      if ((lang.id === 'c' || lang.id === 'cpp') && /System\.out\.println/i.test(sourceCode)) {
        score -= 60;
      }
      // If code has Console.WriteLine, it is C# not Java
      if (lang.id === 'java' && /Console\.WriteLine/i.test(sourceCode)) {
        score -= 50;
      }
      // If code has def __init__, it is Python
      if (lang.id === 'python' && /def\s+__init__\s*\(/i.test(sourceCode)) {
        score += 30;
      }

      if (score > 0) {
        scores.push({
          language: lang,
          rawScore: score,
          matchedFeatures
        });
      }
    }

    // Sort candidates descending by score
    scores.sort((a, b) => b.rawScore - a.rawScore);

    if (scores.length === 0) {
      // Default to Python or C if unrecognized
      return {
        detected: LANGUAGES.python,
        confidence: 45.0,
        candidates: [{ language: LANGUAGES.python, score: 45 }],
        reasoning: ['General scripting patterns detected; low confidence.'],
        paradigm: PARADIGMS.SCRIPTING.name
      };
    }

    const top = scores[0];
    const secondScore = scores.length > 1 ? scores[1].rawScore : 0;

    // Calculate normalized confidence percentage (up to 99.8%)
    let confidence = 50.0;
    if (top.rawScore >= 70) {
      const margin = top.rawScore - secondScore;
      confidence = Math.min(99.6, Math.max(68.0, 75 + margin * 0.35 + top.rawScore * 0.15));
    } else {
      confidence = Math.min(80.0, 40 + top.rawScore * 0.5);
    }

    // Format top 4 candidates
    const formattedCandidates = scores.slice(0, 4).map((s) => ({
      id: s.language.id,
      name: s.language.name,
      paradigm: s.language.paradigm,
      category: s.language.category,
      rawScore: s.rawScore,
      percentage: Math.min(99, Math.round((s.rawScore / (top.rawScore + 1)) * confidence))
    }));

    const detectedLang = top.language;
    const paradigmInfo = Object.values(PARADIGMS).find((p) => p.id === detectedLang.paradigm) || {
      name: detectedLang.category
    };

    return {
      detected: detectedLang,
      confidence: Math.round(confidence * 10) / 10,
      candidates: formattedCandidates,
      reasoning: top.matchedFeatures.length > 0
        ? top.matchedFeatures
        : [`Dominant lexical matches for ${detectedLang.name}`],
      paradigm: paradigmInfo.name,
      paradigmDescription: paradigmInfo.description
    };
  }

  /**
   * Assigns higher weight to keywords unique to specific languages
   */
  static getKeywordSpecificity(kw) {
    const highSpecificity = [
      'println', 'fmt', 'defmodule', 'package', 'public', 'static', 'val',
      'subroutine', 'implicit', 'writeln', 'readln', 'program', 'fn', 'mut',
      'trait', 'impl', 'std', 'iostream', 'cout', 'cin', 'endl', 'console',
      'syscall', 'putStrLn', 'defn', 'defun', 'comptime', 'SELECT', 'FROM'
    ];
    if (highSpecificity.includes(kw)) return 2.5;
    return 1.0;
  }
}

module.exports = LanguageDetector;
