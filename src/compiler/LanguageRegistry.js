/**
 * PolyCompile - Language Registry
 * Comprehensive catalog of programming languages spanning all paradigms:
 * - Structured / Procedural (C, Pascal, Fortran, Ada, BASIC)
 * - Unstructured / Low-Level (Assembly x86/NASM, Brainfuck, Unstructured BASIC)
 * - Object-Oriented (Java, C++, C#, Kotlin, Ruby, Swift, Scala)
 * - Functional (Haskell, Clojure, Elixir, OCaml, Scheme/Lisp, Erlang)
 * - Scripting & Dynamic (Python, JavaScript, TypeScript, PHP, Perl, Lua, Bash)
 * - Systems (Rust, Go, Zig, D, Nim)
 * - Declarative & Domain-Specific (SQL, R, Julia, Prolog)
 */

const PARADIGMS = {
  STRUCTURED: {
    id: 'structured',
    name: 'Structured / Procedural',
    description: 'Emphasizes modularity, blocks, procedures, and structured control flow (while/for/if) avoiding arbitrary jumps.'
  },
  UNSTRUCTURED: {
    id: 'unstructured',
    name: 'Unstructured / Low-Level',
    description: 'Relies on flat control flow, direct memory addresses, unconditional jumps (JMP/GOTO), or minimal instruction sets.'
  },
  OBJECT_ORIENTED: {
    id: 'oop',
    name: 'Object-Oriented (OOP)',
    description: 'Organizes code around classes, objects, encapsulation, inheritance, and polymorphic method dispatch.'
  },
  FUNCTIONAL: {
    id: 'functional',
    name: 'Functional Programming (FP)',
    description: 'Treats computation as evaluating pure mathematical functions, avoiding mutable state and side effects.'
  },
  SCRIPTING: {
    id: 'scripting',
    name: 'Dynamic / Scripting',
    description: 'Interpreted or JIT-compiled dynamic languages prioritizing developer speed, rapid prototyping, and high-level abstractions.'
  },
  SYSTEMS: {
    id: 'systems',
    name: 'Systems Programming',
    description: 'High-performance, bare-metal or low-overhead languages offering direct memory control, concurrency, and safety guarantees.'
  },
  DECLARATIVE: {
    id: 'declarative',
    name: 'Declarative / Logic / Domain',
    description: 'Expresses logic of computation without describing control flow; specifies WHAT to achieve rather than HOW.'
  }
};

const LANGUAGES = {
  // ==========================================
  // STRUCTURED / PROCEDURAL
  // ==========================================
  c: {
    id: 'c',
    name: 'C',
    pistonName: 'c',
    pistonVersion: '10.2.0',
    paradigm: PARADIGMS.STRUCTURED.id,
    extension: '.c',
    mimeType: 'text/x-csrc',
    monacoLang: 'c',
    category: 'Structured',
    description: 'The foundation of modern procedural programming, providing low-level hardware access with structured block scoping.',
    signatureRegexes: [
      /#include\s+<stdio\.h>/i,
      /#include\s+<stdlib\.h>/i,
      /int\s+main\s*\(\s*(void|int\s+argc)?/i,
      /printf\s*\(/i,
      /scanf\s*\(/i,
      /\btypedef\s+struct\b/i
    ],
    keywords: [
      'int', 'char', 'float', 'double', 'void', 'struct', 'typedef', 'sizeof',
      'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
      'continue', 'goto', 'auto', 'register', 'static', 'extern', 'const', 'volatile'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      statementTerminator: ';',
      commentStyles: ['//', '/*'],
      hasPointers: true,
      hasPreprocessors: true
    }
  },

  pascal: {
    id: 'pascal',
    name: 'Pascal',
    pistonName: 'pascal',
    pistonVersion: '3.2.2',
    paradigm: PARADIGMS.STRUCTURED.id,
    extension: '.pas',
    mimeType: 'text/x-pascal',
    monacoLang: 'pascal',
    category: 'Structured',
    description: 'Archetypal block-structured language designed by Niklaus Wirth to teach structured programming and strong typing.',
    signatureRegexes: [
      /^\s*program\s+[a-zA-Z0-9_]+\s*;/im,
      /\bbegin\b[\s\S]*\bend\s*\./i,
      /\bwriteln\s*\(/i,
      /\breadln\s*\(/i,
      /var\s+[a-zA-Z0-9_,\s]+:\s*(integer|string|real|boolean)/i
    ],
    keywords: [
      'program', 'begin', 'end', 'var', 'procedure', 'function', 'if', 'then',
      'else', 'while', 'do', 'for', 'to', 'downto', 'repeat', 'until', 'case',
      'of', 'const', 'type', 'array', 'record', 'writeln', 'readln'
    ],
    features: {
      blockDelimiters: ['begin', 'end'],
      statementTerminator: ';',
      commentStyles: ['{', '(*', '//'],
      caseInsensitive: true
    }
  },

  fortran: {
    id: 'fortran',
    name: 'Fortran',
    pistonName: 'fortran',
    pistonVersion: '10.2.0',
    paradigm: PARADIGMS.STRUCTURED.id,
    extension: '.f90',
    mimeType: 'text/x-fortran',
    monacoLang: 'fortran',
    category: 'Structured',
    description: 'Pioneering scientific structured language optimized for intense numerical computation and array manipulation.',
    signatureRegexes: [
      /^\s*program\s+[a-zA-Z0-9_]+/im,
      /implicit\s+none/i,
      /print\s*\*\s*,/i,
      /end\s+program/i,
      /real\s*::/i,
      /integer\s*::/i
    ],
    keywords: [
      'program', 'end', 'subroutine', 'function', 'module', 'implicit', 'none',
      'integer', 'real', 'character', 'logical', 'do', 'if', 'then', 'else',
      'print', 'write', 'read', 'allocate', 'deallocate', 'call'
    ],
    features: {
      blockDelimiters: ['do', 'end do'],
      commentStyles: ['!'],
      caseInsensitive: true
    }
  },

  ada: {
    id: 'ada',
    name: 'Ada',
    pistonName: 'ada',
    pistonVersion: '12.2.0',
    paradigm: PARADIGMS.STRUCTURED.id,
    extension: '.adb',
    mimeType: 'text/x-ada',
    monacoLang: 'ada',
    category: 'Structured',
    description: 'Extremely robust, safety-critical structured programming language developed for the US Department of Defense.',
    signatureRegexes: [
      /with\s+Ada\.Text_IO/i,
      /procedure\s+[a-zA-Z0-9_]+\s+is/i,
      /Ada\.Text_IO\.Put_Line/i,
      /Put_Line\s*\(/i,
      /\bbegin\b[\s\S]*\bend\s+[a-zA-Z0-9_]+;/i
    ],
    keywords: [
      'with', 'use', 'procedure', 'function', 'is', 'begin', 'end', 'package',
      'type', 'subtype', 'loop', 'if', 'then', 'else', 'elsif', 'case', 'when',
      'null', 'return', 'declare'
    ],
    features: {
      blockDelimiters: ['begin', 'end'],
      statementTerminator: ';',
      commentStyles: ['--'],
      caseInsensitive: true
    }
  },

  basic: {
    id: 'basic',
    name: 'BASIC',
    pistonName: 'basic',
    pistonVersion: '1.0.0',
    paradigm: PARADIGMS.STRUCTURED.id,
    extension: '.bas',
    mimeType: 'text/x-basic',
    monacoLang: 'vb',
    category: 'Structured',
    description: 'Beginner\'s All-purpose Symbolic Instruction Code with structured constructs (DO/LOOP, SELECT CASE) and line-based routines.',
    signatureRegexes: [
      /PRINT\s+"[^"]*"/i,
      /FOR\s+[A-Z]+\s*=\s*\d+\s+TO\s+\d+/i,
      /NEXT\s+[A-Z]+/i,
      /GOSUB\s+\d+/i,
      /DIM\s+[A-Za-z0-9_]+\s+AS\s+/i
    ],
    keywords: [
      'PRINT', 'INPUT', 'LET', 'IF', 'THEN', 'ELSE', 'FOR', 'TO', 'STEP', 'NEXT',
      'WHILE', 'WEND', 'DIM', 'AS', 'SUB', 'FUNCTION', 'END', 'GOTO', 'GOSUB', 'RETURN', 'REM'
    ],
    features: {
      commentStyles: ['REM', "'"],
      caseInsensitive: true
    }
  },

  // ==========================================
  // UNSTRUCTURED / LOW-LEVEL / ESOTERIC
  // ==========================================
  assembly: {
    id: 'assembly',
    name: 'Assembly (x86/NASM)',
    pistonName: 'nasm',
    pistonVersion: '2.15.5',
    paradigm: PARADIGMS.UNSTRUCTURED.id,
    extension: '.asm',
    mimeType: 'text/x-asm',
    monacoLang: 'nasm',
    category: 'Unstructured',
    description: 'Low-level hardware-direct representation featuring registers, flat memory offsets, and unconditional jumps.',
    signatureRegexes: [
      /section\s+\.(text|data|bss)/i,
      /global\s+(_start|main)/i,
      /\bmov\s+(eax|rax|rbx|rcx|rdx|rsp|ebx|ecx|edx),/i,
      /\bint\s+0x80\b/i,
      /\bsyscall\b/i,
      /\bjmp\s+[a-zA-Z0-9_.]+/i
    ],
    keywords: [
      'section', 'global', 'extern', 'mov', 'add', 'sub', 'mul', 'div', 'inc',
      'dec', 'cmp', 'jmp', 'je', 'jne', 'jg', 'jl', 'call', 'ret', 'push',
      'pop', 'syscall', 'int', 'db', 'dw', 'dd', 'dq', 'resb'
    ],
    features: {
      commentStyles: [';'],
      hasRegisters: true,
      caseInsensitive: true
    }
  },

  brainfuck: {
    id: 'brainfuck',
    name: 'Brainfuck',
    pistonName: 'brainfuck',
    pistonVersion: '2.7.3',
    paradigm: PARADIGMS.UNSTRUCTURED.id,
    extension: '.bf',
    mimeType: 'text/x-brainfuck',
    monacoLang: 'plaintext',
    category: 'Unstructured',
    description: 'Famous Turing-complete esoteric language operating with 8 commands on a flat unstructured tape memory.',
    signatureRegexes: [
      /^[><+\-.,\[\]\s\n\r]+$/,
      /\+\+\+\+\+[\+\-\<\>\.\[\]]{5,}/
    ],
    keywords: ['>', '<', '+', '-', '.', ',', '[', ']'],
    features: {
      minimalist: true
    }
  },

  // ==========================================
  // OBJECT-ORIENTED PROGRAMMING (OOP)
  // ==========================================
  java: {
    id: 'java',
    name: 'Java',
    pistonName: 'java',
    pistonVersion: '15.0.2',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.java',
    mimeType: 'text/x-java-source',
    monacoLang: 'java',
    category: 'Object-Oriented',
    description: 'Robust, strongly typed, class-based object-oriented programming language designed for write-once run-anywhere portability.',
    signatureRegexes: [
      /public\s+class\s+[a-zA-Z0-9_]+/i,
      /public\s+static\s+void\s+main\s*\(\s*String\s*(\[\s*\]|\.\.\.)\s+[a-zA-Z0-9_]+\s*\)/i,
      /System\.out\.println\s*\(/i,
      /import\s+java\.[a-zA-Z0-9_.*]+;/i
    ],
    keywords: [
      'public', 'private', 'protected', 'class', 'interface', 'extends', 'implements',
      'static', 'final', 'void', 'int', 'boolean', 'double', 'new', 'this', 'super',
      'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'package', 'import'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      statementTerminator: ';',
      commentStyles: ['//', '/*'],
      strictOOP: true
    }
  },

  cpp: {
    id: 'cpp',
    name: 'C++',
    pistonName: 'c++',
    pistonVersion: '10.2.0',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.cpp',
    mimeType: 'text/x-c++src',
    monacoLang: 'cpp',
    category: 'Object-Oriented',
    description: 'High-performance multi-paradigm language combining low-level systems capabilities with advanced OOP and template metaprogramming.',
    signatureRegexes: [
      /#include\s+<iostream>/i,
      /#include\s+<vector>/i,
      /std::cout\s*<</i,
      /cout\s*<<\s*.*<<\s*(std::)?endl/i,
      /using\s+namespace\s+std;/i,
      /class\s+[a-zA-Z0-9_]+\s*\{[\s\S]*public:/i,
      /template\s*<\s*typename/i
    ],
    keywords: [
      'class', 'public', 'private', 'protected', 'virtual', 'override', 'template',
      'typename', 'namespace', 'using', 'new', 'delete', 'cout', 'cin', 'endl',
      'int', 'float', 'double', 'bool', 'auto', 'const', 'return', 'include'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      statementTerminator: ';',
      commentStyles: ['//', '/*']
    }
  },

  csharp: {
    id: 'csharp',
    name: 'C#',
    pistonName: 'csharp.net',
    pistonVersion: '5.0.201',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.cs',
    mimeType: 'text/x-csharp',
    monacoLang: 'csharp',
    category: 'Object-Oriented',
    description: 'Modern, type-safe, component-oriented language developed by Microsoft for enterprise applications and the .NET runtime.',
    signatureRegexes: [
      /using\s+System(\.[a-zA-Z0-9_]+)?;/i,
      /Console\.WriteLine\s*\(/i,
      /namespace\s+[a-zA-Z0-9_.]+/i,
      /static\s+void\s+Main\s*\(\s*string\s*\[\s*\]\s*args\s*\)/i,
      /internal\s+class|public\s+class/i
    ],
    keywords: [
      'using', 'namespace', 'class', 'struct', 'interface', 'public', 'private',
      'protected', 'internal', 'static', 'void', 'string', 'int', 'bool', 'var',
      'Console', 'WriteLine', 'get', 'set', 'async', 'await', 'return'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      statementTerminator: ';',
      commentStyles: ['//', '/*']
    }
  },

  kotlin: {
    id: 'kotlin',
    name: 'Kotlin',
    pistonName: 'kotlin',
    pistonVersion: '1.8.20',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.kt',
    mimeType: 'text/x-kotlin',
    monacoLang: 'kotlin',
    category: 'Object-Oriented',
    description: 'Modern concise JVM language marrying object-oriented and functional paradigms with first-class null-safety.',
    signatureRegexes: [
      /fun\s+main\s*\(\s*(args:\s*Array<String>)?\s*\)/i,
      /\bval\s+[a-zA-Z0-9_]+\s*[:=]/i,
      /\bvar\s+[a-zA-Z0-9_]+\s*[:=]/i,
      /println\s*\(/i,
      /data\s+class\s+[a-zA-Z0-9_]+/i
    ],
    keywords: [
      'fun', 'val', 'var', 'class', 'interface', 'data', 'object', 'package',
      'import', 'when', 'if', 'else', 'for', 'while', 'return', 'null', 'is', 'in'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      commentStyles: ['//', '/*']
    }
  },

  ruby: {
    id: 'ruby',
    name: 'Ruby',
    pistonName: 'ruby',
    pistonVersion: '3.0.1',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.rb',
    mimeType: 'text/x-ruby',
    monacoLang: 'ruby',
    category: 'Object-Oriented',
    description: 'Pure object-oriented scripting language emphasizing programmer happiness, elegant syntax, and dynamic metaprogramming.',
    signatureRegexes: [
      /def\s+[a-zA-Z0-9_!?]+(\s*\(.*\))?[\s\S]*?\bend\b/i,
      /puts\s+["']/i,
      /attr_accessor|attr_reader|attr_writer/i,
      /class\s+[A-Z][a-zA-Z0-9_]*[\s\S]*?\bend\b/i,
      /#\{[a-zA-Z0-9_.]+\}/
    ],
    keywords: [
      'def', 'end', 'class', 'module', 'puts', 'print', 'if', 'elsif', 'else',
      'unless', 'while', 'until', 'for', 'in', 'do', 'yield', 'self', 'nil',
      'true', 'false', 'return', 'require'
    ],
    features: {
      blockDelimiters: ['do', 'end'],
      commentStyles: ['#']
    }
  },

  swift: {
    id: 'swift',
    name: 'Swift',
    pistonName: 'swift',
    pistonVersion: '5.3.3',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.swift',
    mimeType: 'text/x-swift',
    monacoLang: 'swift',
    category: 'Object-Oriented',
    description: 'Apple\'s modern, protocol-oriented systems language with type inference, ARC memory management, and expressiveness.',
    signatureRegexes: [
      /import\s+Foundation/i,
      /import\s+SwiftUI/i,
      /func\s+[a-zA-Z0-9_]+\s*\(.*\)\s*(->\s*[a-zA-Z0-9_<>]+)?\s*\{/i,
      /print\s*\(.*\\\([a-zA-Z0-9_.]+\).*\)/i,
      /guard\s+let\s+[a-zA-Z0-9_]+/i
    ],
    keywords: [
      'import', 'func', 'let', 'var', 'class', 'struct', 'enum', 'protocol',
      'extension', 'guard', 'if', 'else', 'switch', 'case', 'return', 'print'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      commentStyles: ['//', '/*']
    }
  },

  scala: {
    id: 'scala',
    name: 'Scala',
    pistonName: 'scala',
    pistonVersion: '3.2.2',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.scala',
    mimeType: 'text/x-scala',
    monacoLang: 'scala',
    category: 'Object-Oriented',
    description: 'Seamless integration of object-oriented and functional paradigms running at scale on the Java Virtual Machine.',
    signatureRegexes: [
      /object\s+[a-zA-Z0-9_]+\s*(extends\s+App)?\s*\{/i,
      /def\s+main\s*\(\s*args:\s*Array\[String\]\s*\)/i,
      /case\s+class\s+[a-zA-Z0-9_]+/i,
      /println\s*\(/i
    ],
    keywords: [
      'object', 'class', 'trait', 'def', 'val', 'var', 'extends', 'with',
      'package', 'import', 'match', 'case', 'if', 'else', 'for', 'yield'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      commentStyles: ['//', '/*']
    }
  },

  // ==========================================
  // FUNCTIONAL PROGRAMMING
  // ==========================================
  haskell: {
    id: 'haskell',
    name: 'Haskell',
    pistonName: 'haskell',
    pistonVersion: '9.0.1',
    paradigm: PARADIGMS.FUNCTIONAL.id,
    extension: '.hs',
    mimeType: 'text/x-haskell',
    monacoLang: 'haskell',
    category: 'Functional',
    description: 'Pure, statically typed, lazy functional language featuring type inference and mathematical monads.',
    signatureRegexes: [
      /main\s*::\s*IO\s*\(\s*\)/i,
      /putStrLn\s+/i,
      /[a-zA-Z0-9_]+\s*::\s*[A-Z][a-zA-Z0-9_]*\s*->/i,
      /import\s+Data\.[a-zA-Z0-9_.]+/i,
      /where\s+[\r\n]/i
    ],
    keywords: [
      'module', 'where', 'import', 'let', 'in', 'do', 'case', 'of', 'if', 'then',
      'else', 'data', 'type', 'newtype', 'class', 'instance', 'deriving', 'putStrLn'
    ],
    features: {
      commentStyles: ['--', '{-'],
      indentationBased: true
    }
  },

  clojure: {
    id: 'clojure',
    name: 'Clojure',
    pistonName: 'clojure',
    pistonVersion: '1.10.3',
    paradigm: PARADIGMS.FUNCTIONAL.id,
    extension: '.clj',
    mimeType: 'text/x-clojure',
    monacoLang: 'clojure',
    category: 'Functional',
    description: 'Dynamic, functional Lisp dialect targeting the JVM, emphasizing immutable data structures and software transactional memory.',
    signatureRegexes: [
      /\(ns\s+[a-zA-Z0-9_.-]+/i,
      /\(defn\s+[a-zA-Z0-9_.-]+/i,
      /\(println\s+/i,
      /\(def\s+[a-zA-Z0-9_.-]+/i
    ],
    keywords: [
      'def', 'defn', 'fn', 'let', 'do', 'if', 'when', 'cond', 'loop', 'recur',
      'ns', 'quote', 'var', 'println', 'assoc', 'dissoc', 'map', 'filter', 'reduce'
    ],
    features: {
      blockDelimiters: ['(', ')'],
      commentStyles: [';']
    }
  },

  elixir: {
    id: 'elixir',
    name: 'Elixir',
    pistonName: 'elixir',
    pistonVersion: '1.11.3',
    paradigm: PARADIGMS.FUNCTIONAL.id,
    extension: '.ex',
    mimeType: 'text/x-elixir',
    monacoLang: 'elixir',
    category: 'Functional',
    description: 'Dynamic functional language designed for building scalable, fault-tolerant systems on the Erlang BEAM VM.',
    signatureRegexes: [
      /defmodule\s+[A-Z][a-zA-Z0-9_.]+\s+do/i,
      /IO\.puts\s*\(/i,
      /\|>/, // Pipe operator
      /def\s+[a-z0-9_!?]+.*do/i
    ],
    keywords: [
      'defmodule', 'def', 'defp', 'do', 'end', 'case', 'cond', 'if', 'unless',
      'fn', 'import', 'require', 'use', 'alias', 'IO', 'puts'
    ],
    features: {
      blockDelimiters: ['do', 'end'],
      commentStyles: ['#']
    }
  },

  ocaml: {
    id: 'ocaml',
    name: 'OCaml',
    pistonName: 'ocaml',
    pistonVersion: '4.12.0',
    paradigm: PARADIGMS.FUNCTIONAL.id,
    extension: '.ml',
    mimeType: 'text/x-ocaml',
    monacoLang: 'ocaml',
    category: 'Functional',
    description: 'Industrial-strength functional language emphasizing expressive type systems, pattern matching, and efficiency.',
    signatureRegexes: [
      /let\s+rec\s+[a-zA-Z0-9_]+/i,
      /let\s+()=\s*print_endline/i,
      /print_endline\s+/i,
      /match\s+[a-zA-Z0-9_]+\s+with/i,
      /open\s+Printf/i
    ],
    keywords: [
      'let', 'rec', 'in', 'match', 'with', 'type', 'val', 'open', 'module',
      'fun', 'function', 'if', 'then', 'else', 'begin', 'end', 'print_endline'
    ],
    features: {
      commentStyles: ['(*']
    }
  },

  lisp: {
    id: 'lisp',
    name: 'Common Lisp / Scheme',
    pistonName: 'commonlisp',
    pistonVersion: '2.1.2',
    paradigm: PARADIGMS.FUNCTIONAL.id,
    extension: '.lisp',
    mimeType: 'text/x-common-lisp',
    monacoLang: 'scheme',
    category: 'Functional',
    description: 'Pioneering homoiconic programming language where code is represented directly as nested list data structures (S-expressions).',
    signatureRegexes: [
      /\(defun\s+[a-zA-Z0-9_-]+\s*\(/i,
      /\(format\s+t\s+/i,
      /\(print\s+/i,
      /\(define\s+\(/i,
      /\(write-line\s+/i
    ],
    keywords: [
      'defun', 'define', 'lambda', 'let', 'cond', 'if', 'car', 'cdr', 'cons',
      'list', 'format', 'print', 'setq', 'loop', 'return'
    ],
    features: {
      blockDelimiters: ['(', ')'],
      commentStyles: [';']
    }
  },

  // ==========================================
  // DYNAMIC & SCRIPTING
  // ==========================================
  python: {
    id: 'python',
    name: 'Python',
    pistonName: 'python',
    pistonVersion: '3.10.0',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.py',
    mimeType: 'text/x-python',
    monacoLang: 'python',
    category: 'Scripting',
    description: 'High-level, dynamically typed language emphasizing readable code, indentation-based syntax, and massive ecosystem.',
    signatureRegexes: [
      /def\s+[a-zA-Z0-9_]+\s*\(.*\)\s*:/i,
      /print\s*\(/i,
      /if\s+__name__\s*==\s*['"]__main__['"]\s*:/i,
      /import\s+sys|import\s+os|import\s+math/i,
      /from\s+[a-zA-Z0-9_.]+\s+import/i,
      /class\s+[a-zA-Z0-9_]+(\s*\(.*\))?\s*:/i
    ],
    keywords: [
      'def', 'class', 'import', 'from', 'as', 'return', 'if', 'elif', 'else',
      'for', 'while', 'in', 'is', 'not', 'and', 'or', 'try', 'except', 'finally',
      'with', 'yield', 'lambda', 'pass', 'None', 'True', 'False', 'print'
    ],
    features: {
      indentationBased: true,
      commentStyles: ['#']
    }
  },

  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    pistonName: 'javascript',
    pistonVersion: '18.15.0',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.js',
    mimeType: 'text/javascript',
    monacoLang: 'javascript',
    category: 'Scripting',
    description: 'The ubiquitous, dynamic scripting language of the web featuring prototype inheritance, first-class functions, and event loops.',
    signatureRegexes: [
      /console\.log\s*\(/i,
      /const\s+[a-zA-Z0-9_]+\s*=/i,
      /let\s+[a-zA-Z0-9_]+\s*=/i,
      /function\s+[a-zA-Z0-9_]+\s*\(/i,
      /=>\s*\{?/,
      /require\s*\(['"][a-zA-Z0-9_./-]+['"]\)/i,
      /import\s+.*\s+from\s+['"][a-zA-Z0-9_./-]+['"]/i
    ],
    keywords: [
      'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
      'switch', 'case', 'break', 'class', 'new', 'this', 'async', 'await', 'try',
      'catch', 'console', 'log', 'import', 'export', 'default'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      statementTerminator: ';',
      commentStyles: ['//', '/*']
    }
  },

  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    pistonName: 'typescript',
    pistonVersion: '5.0.3',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.ts',
    mimeType: 'text/typescript',
    monacoLang: 'typescript',
    category: 'Scripting',
    description: 'Typed superset of JavaScript adding static type definitions, interfaces, generics, and compiler-checked contracts.',
    signatureRegexes: [
      /interface\s+[A-Z][a-zA-Z0-9_]*\s*\{/i,
      /type\s+[A-Z][a-zA-Z0-9_]*\s*=/i,
      /const\s+[a-zA-Z0-9_]+:\s*(string|number|boolean|any|void)\s*=/i,
      /function\s+[a-zA-Z0-9_]+<.*>/i,
      /:\s*(string|number|boolean|Record|Array<.*>)/i
    ],
    keywords: [
      'interface', 'type', 'enum', 'namespace', 'implements', 'declare', 'as',
      'keyof', 'readonly', 'function', 'const', 'let', 'return', 'async', 'await'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      statementTerminator: ';',
      commentStyles: ['//', '/*']
    }
  },

  php: {
    id: 'php',
    name: 'PHP',
    pistonName: 'php',
    pistonVersion: '8.2.3',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.php',
    mimeType: 'text/x-php',
    monacoLang: 'php',
    category: 'Scripting',
    description: 'Server-side web scripting language embedding dynamically within markup and running vast portions of the modern web.',
    signatureRegexes: [
      /<\?php/i,
      /\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/,
      /echo\s+["'$]/i,
      /var_dump\s*\(/i
    ],
    keywords: [
      'php', 'echo', 'print', 'function', 'class', 'public', 'private', 'protected',
      'return', 'if', 'else', 'elseif', 'foreach', 'as', 'while', 'new', 'array'
    ],
    features: {
      sigilVariables: '$',
      blockDelimiters: ['{', '}'],
      statementTerminator: ';',
      commentStyles: ['//', '#', '/*']
    }
  },

  ruby_script: {
    id: 'ruby',
    name: 'Ruby',
    pistonName: 'ruby',
    pistonVersion: '3.0.1',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.rb',
    mimeType: 'text/x-ruby',
    monacoLang: 'ruby',
    category: 'Scripting',
    description: 'Highly expressive dynamic scripting language designed for natural readability and rapid text processing.',
    signatureRegexes: [
      /puts\s+["']/i,
      /def\s+[a-z0-9_]+\b/i
    ],
    keywords: ['puts', 'def', 'end', 'class', 'module', 'require', 'yield'],
    features: { commentStyles: ['#'] }
  },

  perl: {
    id: 'perl',
    name: 'Perl',
    pistonName: 'perl',
    pistonVersion: '5.36.0',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.pl',
    mimeType: 'text/x-perl',
    monacoLang: 'perl',
    category: 'Scripting',
    description: 'Practical Extraction and Report Language famous for text munging, regular expressions, and syntactic versatility.',
    signatureRegexes: [
      /use\s+strict;/i,
      /use\s+warnings;/i,
      /my\s+(\$[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+|%[a-zA-Z0-9_]+)/i,
      /print\s+["'].*\\n["'];/i
    ],
    keywords: [
      'my', 'our', 'local', 'sub', 'use', 'strict', 'warnings', 'print', 'if',
      'unless', 'while', 'foreach', 'return', 'exit'
    ],
    features: {
      sigilVariables: '$,@,%',
      commentStyles: ['#']
    }
  },

  lua: {
    id: 'lua',
    name: 'Lua',
    pistonName: 'lua',
    pistonVersion: '5.4.4',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.lua',
    mimeType: 'text/x-lua',
    monacoLang: 'lua',
    category: 'Scripting',
    description: 'Ultra-lightweight, embeddable scripting language widely used in gaming engines and high-performance embedded systems.',
    signatureRegexes: [
      /local\s+[a-zA-Z0-9_]+\s*=/i,
      /print\s*\(/i,
      /function\s+[a-zA-Z0-9_.:]+\s*\(.*\)[\s\S]*?\bend\b/i,
      /io\.write\s*\(/i
    ],
    keywords: [
      'local', 'function', 'end', 'if', 'then', 'else', 'elseif', 'while', 'do',
      'repeat', 'until', 'for', 'in', 'return', 'break', 'nil', 'true', 'false', 'print'
    ],
    features: {
      blockDelimiters: ['then/do', 'end'],
      commentStyles: ['--']
    }
  },

  bash: {
    id: 'bash',
    name: 'Bash / Shell',
    pistonName: 'bash',
    pistonVersion: '5.2.0',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.sh',
    mimeType: 'application/x-sh',
    monacoLang: 'shell',
    category: 'Scripting',
    description: 'Unix standard command language and scripting environment automating operating system tasks and pipelines.',
    signatureRegexes: [
      /^#!\/bin\/(bash|sh|zsh)/m,
      /echo\s+["']/i,
      /if\s+\[\s+.*\s+\];\s*then/i,
      /fi\b/m,
      /\bchmod\s+|\bmkdir\s+|\bgrep\s+/i
    ],
    keywords: [
      'echo', 'if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done',
      'while', 'case', 'esac', 'function', 'export', 'source', 'exit'
    ],
    features: {
      commentStyles: ['#']
    }
  },

  // ==========================================
  // SYSTEMS PROGRAMMING
  // ==========================================
  rust: {
    id: 'rust',
    name: 'Rust',
    pistonName: 'rust',
    pistonVersion: '1.68.2',
    paradigm: PARADIGMS.SYSTEMS.id,
    extension: '.rs',
    mimeType: 'text/x-rustsrc',
    monacoLang: 'rust',
    category: 'Systems',
    description: 'Empowering everyone to build reliable and efficient software with memory safety guaranteed at compile-time without GC.',
    signatureRegexes: [
      /fn\s+main\s*\(\s*\)\s*(->\s*.*)?\s*\{/i,
      /println!\s*\(/i,
      /let\s+mut\s+[a-zA-Z0-9_]+/i,
      /use\s+std::[a-zA-Z0-9_:]+;/i,
      /match\s+[a-zA-Z0-9_]+\s*\{/i,
      /impl\s+[a-zA-Z0-9_]+/i
    ],
    keywords: [
      'fn', 'let', 'mut', 'const', 'struct', 'enum', 'impl', 'trait', 'use',
      'pub', 'match', 'if', 'else', 'loop', 'while', 'for', 'return', 'println'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      statementTerminator: ';',
      commentStyles: ['//', '/*']
    }
  },

  go: {
    id: 'go',
    name: 'Go',
    pistonName: 'go',
    pistonVersion: '1.16.2',
    paradigm: PARADIGMS.SYSTEMS.id,
    extension: '.go',
    mimeType: 'text/x-gosrc',
    monacoLang: 'go',
    category: 'Systems',
    description: 'Google\'s open source programming language for fast, reliable, and concurrent cloud-native services.',
    signatureRegexes: [
      /package\s+main/i,
      /import\s+(\(\s*"fmt"|"fmt"\))/i,
      /func\s+main\s*\(\s*\)\s*\{/i,
      /fmt\.Println\s*\(/i,
      /fmt\.Printf\s*\(/i,
      /:=\s*/ // Go short variable declaration
    ],
    keywords: [
      'package', 'import', 'func', 'var', 'const', 'type', 'struct', 'interface',
      'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'go', 'chan', 'select'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      commentStyles: ['//', '/*']
    }
  },

  zig: {
    id: 'zig',
    name: 'Zig',
    pistonName: 'zig',
    pistonVersion: '0.10.1',
    paradigm: PARADIGMS.SYSTEMS.id,
    extension: '.zig',
    mimeType: 'text/x-zig',
    monacoLang: 'zig',
    category: 'Systems',
    description: 'General-purpose systems language maintaining robustness and simplicity with comptime execution and zero hidden control flow.',
    signatureRegexes: [
      /const\s+std\s*=\s*@import\s*\(\s*"std"\s*\);/i,
      /pub\s+fn\s+main\s*\(\s*\)\s*(void|!\s*void)\s*\{/i,
      /std\.debug\.print\s*\(/i
    ],
    keywords: [
      'const', 'var', 'fn', 'pub', 'return', 'if', 'else', 'while', 'for',
      'switch', 'struct', 'enum', 'union', 'comptime', 'try', 'catch'
    ],
    features: {
      blockDelimiters: ['{', '}'],
      statementTerminator: ';',
      commentStyles: ['//']
    }
  },

  // ==========================================
  // DECLARATIVE / DOMAIN-SPECIFIC / LOGIC
  // ==========================================
  sql: {
    id: 'sql',
    name: 'SQL',
    pistonName: 'sqlite3',
    pistonVersion: '3.36.0',
    paradigm: PARADIGMS.DECLARATIVE.id,
    extension: '.sql',
    mimeType: 'text/x-sql',
    monacoLang: 'sql',
    category: 'Declarative',
    description: 'Domain-specific declarative query language for relational database definition, querying, and transaction control.',
    signatureRegexes: [
      /SELECT\s+.*FROM\s+[a-zA-Z0-9_]+/i,
      /CREATE\s+TABLE\s+[a-zA-Z0-9_]+/i,
      /INSERT\s+INTO\s+[a-zA-Z0-9_]+/i,
      /UPDATE\s+[a-zA-Z0-9_]+\s+SET/i,
      /WHERE\s+[a-zA-Z0-9_.]+\s*=/i
    ],
    keywords: [
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'DELETE', 'CREATE',
      'TABLE', 'DROP', 'ALTER', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON', 'GROUP',
      'BY', 'ORDER', 'HAVING', 'LIMIT', 'VALUES', 'PRIMARY', 'KEY'
    ],
    features: {
      caseInsensitive: true,
      statementTerminator: ';',
      commentStyles: ['--', '/*']
    }
  },

  prolog: {
    id: 'prolog',
    name: 'Prolog',
    pistonName: 'prolog',
    pistonVersion: '8.2.4',
    paradigm: PARADIGMS.DECLARATIVE.id,
    extension: '.pl',
    mimeType: 'text/x-prolog',
    monacoLang: 'prolog',
    category: 'Declarative',
    description: 'Logic programming language based on first-order predicate calculus, rule unification, and depth-first backtracking.',
    signatureRegexes: [
      /:-/m, // Prolog rule operator
      /write\s*\(['"].*['"]\)/i,
      /nl\s*,/i,
      /[a-z][a-zA-Z0-9_]*\s*\(.*\)\s*:-/i
    ],
    keywords: [
      'is', 'fail', 'true', 'write', 'nl', 'read', 'assert', 'retract', 'consult'
    ],
    features: {
      statementTerminator: '.',
      commentStyles: ['%']
    }
  },

  r: {
    id: 'r',
    name: 'R',
    pistonName: 'r',
    pistonVersion: '4.1.1',
    paradigm: PARADIGMS.DECLARATIVE.id,
    extension: '.r',
    mimeType: 'text/x-r',
    monacoLang: 'r',
    category: 'Declarative',
    description: 'Domain-specific language and environment designed for statistical analysis, data modeling, and graphical plotting.',
    signatureRegexes: [
      /<-/, // R assignment operator
      /c\s*\(\s*\d+(\s*,\s*\d+)*\s*\)/,
      /library\s*\([a-zA-Z0-9_.]+\)/i,
      /data\.frame\s*\(/i,
      /summary\s*\(/i
    ],
    keywords: [
      'function', 'if', 'else', 'for', 'while', 'repeat', 'return', 'library',
      'require', 'c', 'data.frame', 'print', 'summary', 'plot'
    ],
    features: {
      commentStyles: ['#']
    }
  },

  cobol: {
    id: 'cobol',
    name: 'COBOL',
    pistonName: 'cobol',
    pistonVersion: '3.1.2',
    paradigm: PARADIGMS.STRUCTURED.id,
    extension: '.cob',
    extensions: ['.cob', '.cbl'],
    mimeType: 'text/x-cobol',
    monacoLang: 'cobol',
    category: 'Enterprise & Legacy',
    description: 'Business-oriented, English-like procedural programming language designed for enterprise finance and administrative systems.',
    signatureRegexes: [
      /IDENTIFICATION\s+DIVISION/i,
      /PROGRAM-ID\./i,
      /PROCEDURE\s+DIVISION/i,
      /DISPLAY\s+/i,
      /STOP\s+RUN/i
    ],
    keywords: ['IDENTIFICATION', 'DIVISION', 'PROGRAM-ID', 'DATA', 'WORKING-STORAGE', 'SECTION', 'PROCEDURE', 'DISPLAY', 'STOP', 'RUN', 'PERFORM', 'PIC', 'VALUE'],
    features: {
      statementTerminator: '.',
      commentStyles: ['*']
    }
  },

  d: {
    id: 'd',
    name: 'D',
    pistonName: 'd',
    pistonVersion: '2.109.0',
    paradigm: PARADIGMS.SYSTEMS.id,
    extension: '.d',
    extensions: ['.d'],
    mimeType: 'text/x-d',
    monacoLang: 'd',
    category: 'Systems',
    description: 'High-performance systems programming language combining efficiency with modern productivity features and garbage collection option.',
    signatureRegexes: [
      /import\s+std\.stdio\s*;/i,
      /writeln\s*\(/i,
      /void\s+main\s*\(\s*\)/i
    ],
    keywords: ['import', 'void', 'int', 'string', 'writeln', 'writefln', 'immutable', 'auto', 'struct', 'class', 'interface'],
    features: {
      blockDelimiters: ['{', '}'],
      statementTerminator: ';',
      commentStyles: ['//', '/*']
    }
  },

  nim: {
    id: 'nim',
    name: 'Nim',
    pistonName: 'nim',
    pistonVersion: '2.2.0',
    paradigm: PARADIGMS.SYSTEMS.id,
    extension: '.nim',
    extensions: ['.nim'],
    mimeType: 'text/x-nim',
    monacoLang: 'nim',
    category: 'Systems',
    description: 'Expressive, statically typed, compiled systems programming language with Python-like clean indentation and C-like speed.',
    signatureRegexes: [
      /echo\s+["'].*["']/,
      /proc\s+[a-zA-Z0-9_]+\s*\(.*\)/,
      /proc\s+[a-zA-Z0-9_]+\s*\([^)]*:\s*(?:int|float|string|bool|seq|array|ref|var)\b/i,
      /import\s+[a-zA-Z0-9_]+/
    ],
    keywords: ['echo', 'proc', 'var', 'let', 'const', 'import', 'type', 'discard', 'return', 'if', 'elif', 'else', 'for', 'while'],
    features: {
      commentStyles: ['#']
    }
  },

  erlang: {
    id: 'erlang',
    name: 'Erlang',
    pistonName: 'erlang',
    pistonVersion: '27.1',
    paradigm: PARADIGMS.FUNCTIONAL.id,
    extension: '.erl',
    extensions: ['.erl', '.hrl'],
    mimeType: 'text/x-erlang',
    monacoLang: 'erlang',
    category: 'Functional',
    description: 'Actor-model functional language designed for massively scalable soft real-time concurrent fault-tolerant systems.',
    signatureRegexes: [
      /-module\s*\([a-z0-9_]+\)\./i,
      /-export\s*\(\[.*\]\)\./i,
      /io:format\s*\(/i
    ],
    keywords: ['module', 'export', 'io', 'format', 'case', 'of', 'end', 'fun', 'receive', 'after', 'spawn'],
    features: {
      statementTerminator: '.',
      commentStyles: ['%']
    }
  },

  scheme: {
    id: 'scheme',
    name: 'Scheme',
    pistonName: 'scheme',
    pistonVersion: '0.9.9',
    paradigm: PARADIGMS.FUNCTIONAL.id,
    extension: '.scm',
    extensions: ['.scm', '.ss'],
    mimeType: 'text/x-scheme',
    monacoLang: 'scheme',
    category: 'Functional',
    description: 'Minimalist Lisp dialect emphasizing functional programming, lexical scope, and first-class continuations.',
    signatureRegexes: [
      /\(define\s+\(/,
      /\(display\s+/,
      /\(newline\)/,
      /\(lambda\s+\(/
    ],
    keywords: ['define', 'lambda', 'display', 'newline', 'let', 'if', 'cond', 'map', 'car', 'cdr', 'cons'],
    features: {
      blockDelimiters: ['(', ')'],
      commentStyles: [';']
    }
  },

  tcl: {
    id: 'tcl',
    name: 'Tcl',
    pistonName: 'tcl',
    pistonVersion: '8.6',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.tcl',
    extensions: ['.tcl'],
    mimeType: 'text/x-tcl',
    monacoLang: 'tcl',
    category: 'Scripting',
    description: 'Dynamic scripting language where everything is a string and command, popular for embedded tooling and rapid automation.',
    signatureRegexes: [
      /puts\s+["'].*["']/,
      /set\s+[a-zA-Z0-9_]+\s+/,
      /proc\s+[a-zA-Z0-9_]+/
    ],
    keywords: ['puts', 'set', 'proc', 'expr', 'if', 'else', 'for', 'foreach', 'while', 'return'],
    features: {
      commentStyles: ['#']
    }
  },

  awk: {
    id: 'awk',
    name: 'AWK',
    pistonName: 'awk',
    pistonVersion: '5.1.0',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.awk',
    extensions: ['.awk'],
    mimeType: 'text/x-awk',
    monacoLang: 'awk',
    category: 'Scripting',
    description: 'Pattern-directed scanning and text-processing language fundamental to Unix text pipelines and tabular data manipulation.',
    signatureRegexes: [
      /BEGIN\s*\{/,
      /END\s*\{/,
      /print\s+\$/
    ],
    keywords: ['BEGIN', 'END', 'print', 'printf', 'getline', 'split', 'length', 'substr'],
    features: {
      blockDelimiters: ['{', '}'],
      commentStyles: ['#']
    }
  },

  forth: {
    id: 'forth',
    name: 'Forth',
    pistonName: 'forth',
    pistonVersion: '0.7.3',
    paradigm: PARADIGMS.UNSTRUCTURED.id,
    extension: '.fs',
    extensions: ['.fs', '.forth'],
    mimeType: 'text/x-forth',
    monacoLang: 'forth',
    category: 'Unstructured',
    description: 'Stack-oriented, concatenative extensible language operating directly on data stacks with reverse Polish notation.',
    signatureRegexes: [
      /:\s+[a-zA-Z0-9_-]+\s+.*?;/,
      /\.\"/,
      /CR\s+/i
    ],
    keywords: ['CR', 'EMIT', 'DUP', 'DROP', 'SWAP', 'ROT', 'OVER', 'IF', 'THEN', 'ELSE', 'DO', 'LOOP'],
    features: {
      commentStyles: ['\\']
    }
  },

  fish: {
    id: 'fish',
    name: 'Fish Shell',
    pistonName: 'fish',
    pistonVersion: '3.3.1',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.fish',
    extensions: ['.fish'],
    mimeType: 'text/x-sh',
    monacoLang: 'shell',
    category: 'Scripting',
    description: 'User-friendly command-line shell with syntax highlighting, autosuggestions, and clean scripting syntax.',
    signatureRegexes: [
      /function\s+[a-zA-Z0-9_]+/,
      /set\s+-l\s+/,
      /echo\s+["'].*["']/,
      /\bfor\s+[a-zA-Z_]\w*\s+in\s+\$[a-zA-Z_]\w*[\s\S]*?\bend\b/
    ],
    keywords: ['function', 'end', 'set', 'echo', 'if', 'else', 'switch', 'case', 'for', 'while'],
    features: {
      commentStyles: ['#']
    }
  },

  octave: {
    id: 'octave',
    name: 'GNU Octave (MATLAB)',
    pistonName: 'octave',
    pistonVersion: '7.1.0',
    paradigm: PARADIGMS.DECLARATIVE.id,
    extension: '.m',
    extensions: ['.m'],
    mimeType: 'text/x-matlab',
    monacoLang: 'matlab',
    category: 'Declarative',
    description: 'High-level mathematical programming language primarily intended for numerical computations and MATLAB compatibility.',
    signatureRegexes: [
      /disp\s*\(/i,
      /printf\s*\(/i,
      /function\s+.*=/,
      /ones\s*\(|zeros\s*\(/
    ],
    keywords: ['disp', 'printf', 'function', 'endfunction', 'ones', 'zeros', 'eye', 'plot', 'for', 'while', 'if', 'end'],
    features: {
      commentStyles: ['%', '#']
    }
  },

  verilog: {
    id: 'verilog',
    name: 'Verilog',
    pistonName: 'verilog',
    pistonVersion: '11.0',
    paradigm: PARADIGMS.DECLARATIVE.id,
    extension: '.v',
    extensions: ['.v', '.sv'],
    mimeType: 'text/x-verilog',
    monacoLang: 'verilog',
    category: 'Declarative',
    description: 'Hardware Description Language (HDL) used to model and simulate electronic digital systems and FPGA/ASIC circuits.',
    signatureRegexes: [
      /module\s+[a-zA-Z0-9_]+\s*\(/,
      /endmodule/,
      /initial\s+begin/,
      /\$display\s*\(/
    ],
    keywords: ['module', 'endmodule', 'input', 'output', 'wire', 'reg', 'initial', 'begin', 'end', '$display', '$finish'],
    features: {
      blockDelimiters: ['begin', 'end'],
      statementTerminator: ';',
      commentStyles: ['//', '/*']
    }
  },

  vhdl: {
    id: 'vhdl',
    name: 'VHDL',
    pistonName: 'vhdl',
    pistonVersion: '0.37',
    paradigm: PARADIGMS.DECLARATIVE.id,
    extension: '.vhd',
    extensions: ['.vhd', '.vhdl'],
    mimeType: 'text/x-vhdl',
    monacoLang: 'vhdl',
    category: 'Declarative',
    description: 'Strongly-typed VHSIC Hardware Description Language used for formally specifying and verifying digital electronic circuits.',
    signatureRegexes: [
      /entity\s+[a-zA-Z0-9_]+\s+is/i,
      /architecture\s+[a-zA-Z0-9_]+\s+of/i,
      /library\s+IEEE;/i
    ],
    keywords: ['library', 'use', 'entity', 'is', 'port', 'end', 'architecture', 'of', 'begin', 'process', 'signal'],
    features: {
      statementTerminator: ';',
      commentStyles: ['--']
    }
  },

  julia: {
    id: 'julia',
    name: 'Julia',
    pistonName: 'julia',
    pistonVersion: '1.10.5',
    paradigm: PARADIGMS.DECLARATIVE.id,
    extension: '.jl',
    extensions: ['.jl'],
    mimeType: 'text/x-julia',
    monacoLang: 'julia',
    category: 'Scientific',
    description: 'High-level, high-performance dynamic programming language designed for numerical and scientific computing.',
    signatureRegexes: [/println\s*\(/, /function\s+[a-zA-Z0-9_]+\s*\(/, /\bend\b/],
    keywords: ['function', 'end', 'println', 'let', 'const', 'struct', 'macro', 'if', 'else', 'for', 'while', 'in', 'using'],
    features: { blockDelimiters: ['begin', 'end'], commentStyles: ['#'] }
  },

  dart: {
    id: 'dart',
    name: 'Dart',
    pistonName: 'dart',
    pistonVersion: '2.19.2',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.dart',
    extensions: ['.dart'],
    mimeType: 'text/x-dart',
    monacoLang: 'dart',
    category: 'Object-Oriented',
    description: 'Client-optimized object-oriented language developed by Google for fast multi-platform and web applications.',
    signatureRegexes: [/void\s+main\s*\(/, /print\s*\(/, /import\s+['"]package:/],
    keywords: ['void', 'main', 'class', 'extends', 'implements', 'var', 'final', 'const', 'print', 'if', 'else', 'return'],
    features: { blockDelimiters: ['{', '}'], statementTerminator: ';', commentStyles: ['//', '/*'] }
  },

  groovy: {
    id: 'groovy',
    name: 'Groovy',
    pistonName: 'groovy',
    pistonVersion: '4.0.23',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.groovy',
    extensions: ['.groovy', '.gvy'],
    mimeType: 'text/x-groovy',
    monacoLang: 'groovy',
    category: 'Object-Oriented',
    description: 'Dynamic object-oriented programming language for the Java platform with concise syntax and closures.',
    signatureRegexes: [/println\s+["']/, /def\s+[a-zA-Z0-9_]+/, /class\s+[a-zA-Z0-9_]+/],
    keywords: ['def', 'class', 'println', 'static', 'void', 'main', 'if', 'else', 'for', 'in', 'return'],
    features: { blockDelimiters: ['{', '}'], commentStyles: ['//', '/*'] }
  },

  fsharp: {
    id: 'fsharp',
    name: 'F#',
    pistonName: 'fsharp.net',
    pistonVersion: '3.1.202',
    paradigm: PARADIGMS.FUNCTIONAL.id,
    extension: '.fs',
    extensions: ['.fs', '.fsi', '.fsx'],
    mimeType: 'text/x-fsharp',
    monacoLang: 'fsharp',
    category: 'Functional',
    description: 'Universal strongly typed functional-first language on the .NET runtime with type inference and pattern matching.',
    signatureRegexes: [/printfn\s+["']/, /let\s+rec\b/, /open\s+System/],
    keywords: ['let', 'rec', 'open', 'printfn', 'match', 'with', 'type', 'module', 'if', 'then', 'else'],
    features: { commentStyles: ['//', '(*'] }
  },

  crystal: {
    id: 'crystal',
    name: 'Crystal',
    pistonName: 'crystal',
    pistonVersion: '1.13.3',
    paradigm: PARADIGMS.SYSTEMS.id,
    extension: '.cr',
    extensions: ['.cr'],
    mimeType: 'text/x-crystal',
    monacoLang: 'ruby',
    category: 'Systems',
    description: 'Object-oriented systems language with Ruby-like syntax that compiles directly to native machine code via LLVM.',
    signatureRegexes: [
      /puts\s+["']/, /def\s+[a-zA-Z0-9_]+/, /class\s+[a-zA-Z0-9_]+/,
      /\bdef\s+[a-zA-Z_]\w*\s*\([^)]*:\s*(?:String|Int32|Int64|Float32|Float64|Bool|Char)\b/
    ],
    keywords: ['def', 'class', 'puts', 'end', 'struct', 'module', 'if', 'else', 'while', 'return'],
    features: { commentStyles: ['#'] }
  },

  objectivec: {
    id: 'objectivec',
    name: 'Objective-C',
    pistonName: 'objective-c',
    pistonVersion: '7.0.1',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.m',
    extensions: ['.m', '.mm'],
    mimeType: 'text/x-objectivec',
    monacoLang: 'objective-c',
    category: 'Object-Oriented',
    description: 'General-purpose, object-oriented language adding Smalltalk-style messaging to the C programming language.',
    signatureRegexes: [/#import\s+<Foundation\/Foundation\.h>/, /NSLog\s*\(/, /@interface\b/],
    keywords: ['NSLog', 'int', 'main', 'return', 'id', 'BOOL', 'YES', 'NO', 'nil', '@interface', '@implementation', '@end'],
    features: { blockDelimiters: ['{', '}'], statementTerminator: ';', commentStyles: ['//', '/*'] }
  },

  vbnet: {
    id: 'vbnet',
    name: 'Visual Basic .NET',
    pistonName: 'basic.net',
    pistonVersion: '0.0.0.5943',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.vb',
    extensions: ['.vb'],
    mimeType: 'text/x-vb',
    monacoLang: 'vb',
    category: 'Object-Oriented',
    description: 'Multi-paradigm, object-oriented language implemented on the .NET Framework designed for clear English readability.',
    signatureRegexes: [/Module\s+[a-zA-Z0-9_]+/i, /Sub\s+Main\s*\(/i, /Console\.WriteLine/i],
    keywords: ['Module', 'End', 'Sub', 'Main', 'Console', 'WriteLine', 'Dim', 'As', 'Integer', 'String', 'If', 'Then'],
    features: { commentStyles: ["'"] }
  },

  powershell: {
    id: 'powershell',
    name: 'PowerShell',
    pistonName: 'powershell',
    pistonVersion: '7.1.4',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.ps1',
    extensions: ['.ps1', '.psm1'],
    mimeType: 'text/x-powershell',
    monacoLang: 'powershell',
    category: 'Scripting',
    description: 'Task automation and configuration management framework consisting of a command-line shell and scripting language.',
    signatureRegexes: [/Write-Host\b/i, /Write-Output\b/i, /\$[a-zA-Z0-9_]+\s*=/],
    keywords: ['Write-Host', 'Write-Output', 'function', 'param', 'if', 'else', 'foreach', 'in', 'return'],
    features: { blockDelimiters: ['{', '}'], commentStyles: ['#'] }
  },

  racket: {
    id: 'racket',
    name: 'Racket',
    pistonName: 'racket',
    pistonVersion: '8.3.0',
    paradigm: PARADIGMS.FUNCTIONAL.id,
    extension: '.rkt',
    extensions: ['.rkt', '.rktl'],
    mimeType: 'text/x-racket',
    monacoLang: 'scheme',
    category: 'Functional',
    description: 'General-purpose multi-paradigm programming language in the Lisp-Scheme family designed for language creation.',
    signatureRegexes: [/#lang\s+racket/, /\(displayln\s+/, /\(define\s+/],
    keywords: ['#lang', 'racket', 'define', 'displayln', 'printf', 'let', 'cond', 'lambda'],
    features: { blockDelimiters: ['(', ')'], commentStyles: [';'] }
  },

  vlang: {
    id: 'vlang',
    name: 'V (Vlang)',
    pistonName: 'vlang',
    pistonVersion: '0.3.3',
    paradigm: PARADIGMS.SYSTEMS.id,
    extension: '.v',
    extensions: ['.vsh'],
    mimeType: 'text/x-v',
    monacoLang: 'go',
    category: 'Systems',
    description: 'Simple, fast, safe compiled language designed for building maintainable software with zero dependencies.',
    signatureRegexes: [/fn\s+main\s*\(\s*\)/, /println\s*\(/],
    keywords: ['fn', 'main', 'println', 'mut', 'const', 'struct', 'if', 'else', 'for', 'return'],
    features: { blockDelimiters: ['{', '}'], statementTerminator: ';', commentStyles: ['//', '/*'] }
  },
  'common-lisp': {
    id: 'common-lisp',
    name: 'Common Lisp (SBCL)',
    pistonName: 'common-lisp',
    pistonVersion: '2.1.1',
    paradigm: PARADIGMS.FUNCTIONAL.id,
    extension: '.lisp',
    extensions: ['.lisp', '.lsp', '.cl'],
    mimeType: 'text/x-common-lisp',
    monacoLang: 'scheme',
    category: 'Functional',
    description: 'ANSI Common Lisp implementation using the high-performance Steel Bank Common Lisp native compiler.',
    signatureRegexes: [/\(defun\s+/, /\(format\s+t/, /\(defvar\s+/],
    keywords: ['defun', 'format', 'let', 'cond', 'defvar', 'lambda', 'loop', 'print'],
    features: { blockDelimiters: ['(', ')'], commentStyles: [';'] }
  },

  zsh: {
    id: 'zsh',
    name: 'Zsh',
    pistonName: 'zsh',
    pistonVersion: '5.8',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.zsh',
    extensions: ['.zsh'],
    mimeType: 'text/x-sh',
    monacoLang: 'shell',
    category: 'Scripting',
    description: 'Extended Unix shell with advanced programmable completion, globbing, and interactive scripting.',
    signatureRegexes: [/#!\/bin\/zsh/, /print\s+-r/, /autoload\s+/],
    keywords: ['echo', 'print', 'if', 'then', 'else', 'fi', 'for', 'while', 'function', 'return'],
    features: { commentStyles: ['#'] }
  },

  jq: {
    id: 'jq',
    name: 'jq',
    pistonName: 'jq',
    pistonVersion: '1.6',
    paradigm: PARADIGMS.DECLARATIVE.id,
    extension: '.jq',
    extensions: ['.jq'],
    mimeType: 'application/json',
    monacoLang: 'json',
    category: 'Declarative',
    description: 'Lightweight and flexible command-line JSON processor and stream-transform functional language.',
    signatureRegexes: [/def\s+\w+:/, /\.\w+/, /map\(/, /select\(/],
    keywords: ['def', 'map', 'select', 'keys', 'length', 'if', 'then', 'else', 'end', 'empty'],
    features: { commentStyles: ['#'] }
  },

  sed: {
    id: 'sed',
    name: 'GNU sed',
    pistonName: 'sed',
    pistonVersion: '4.8',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.sed',
    extensions: ['.sed'],
    mimeType: 'text/plain',
    monacoLang: 'shell',
    category: 'Scripting',
    description: 'Unix stream editor for filtering, replacing, and transforming text with regular expression patterns.',
    signatureRegexes: [/s\/.*\/.*\//, /[0-9]+,[0-9]+[dp]/],
    keywords: ['s', 'p', 'd', 'q', 'g', 'i', 'a', 'c', 'n', 'y'],
    features: { commentStyles: ['#'] }
  },

  dash: {
    id: 'dash',
    name: 'POSIX Shell (dash)',
    pistonName: 'dash',
    pistonVersion: '0.5.11',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.sh',
    extensions: ['.sh', '.dash'],
    mimeType: 'text/x-sh',
    monacoLang: 'shell',
    category: 'Scripting',
    description: 'Standard POSIX-compliant Unix shell designed for fast execution speed and minimal resource usage.',
    signatureRegexes: [/#!\/bin\/dash/, /printf\s+/, /echo\s+/],
    keywords: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'case', 'esac', 'return', 'exit'],
    features: { commentStyles: ['#'] }
  },

  makefile: {
    id: 'makefile',
    name: 'GNU Makefile',
    pistonName: 'make',
    pistonVersion: '4.3',
    paradigm: PARADIGMS.DECLARATIVE.id,
    extension: '.mk',
    extensions: ['.mk', 'Makefile'],
    mimeType: 'text/x-makefile',
    monacoLang: 'makefile',
    category: 'Declarative',
    description: 'Rule-based build automation tool that describes dependencies, compilation targets, and recipes.',
    signatureRegexes: [/\ball:\b/, /^[a-zA-Z0-9_\-\.]+\s*:\s*/m, /\.PHONY\s*:/],
    keywords: ['all', 'clean', 'CFLAGS', 'CC', 'include', 'ifeq', 'ifneq', 'else', 'endif'],
    features: { commentStyles: ['#'] }
  },

  raku: {
    id: 'raku',
    name: 'Raku (Perl 6)',
    pistonName: 'raku',
    pistonVersion: '2022.07',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.raku',
    extensions: ['.raku', '.p6', '.pl6'],
    mimeType: 'text/x-perl',
    monacoLang: 'perl',
    category: 'Scripting',
    description: 'High-level expressive multi-paradigm language featuring gradual typing, grammars, and rich concurrency.',
    signatureRegexes: [/sub\s+MAIN\s*\(/, /say\s+/, /my\s+\$\w+/],
    keywords: ['sub', 'MAIN', 'say', 'my', 'has', 'class', 'method', 'if', 'for', 'given', 'when'],
    features: { blockDelimiters: ['{', '}'], commentStyles: ['#'] }
  },

  solidity: {
    id: 'solidity',
    name: 'Solidity',
    pistonName: 'solidity',
    pistonVersion: '0.8.20',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.sol',
    extensions: ['.sol'],
    mimeType: 'text/x-solidity',
    monacoLang: 'sol',
    category: 'Smart Contracts',
    description: 'Statically-typed contract-oriented programming language for writing decentralized applications and Ethereum EVM smart contracts.',
    signatureRegexes: [/pragma\s+solidity/, /contract\s+\w+/, /function\s+\w+.*public/],
    keywords: ['pragma', 'solidity', 'contract', 'function', 'public', 'private', 'view', 'pure', 'returns', 'address', 'uint256', 'mapping', 'event', 'emit'],
    features: { blockDelimiters: ['{', '}'], statementTerminator: ';', commentStyles: ['//', '/*'] }
  },

  haxe: {
    id: 'haxe',
    name: 'Haxe',
    pistonName: 'haxe',
    pistonVersion: '4.2.5',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.hx',
    extensions: ['.hx'],
    mimeType: 'text/x-haxe',
    monacoLang: 'haxe',
    category: 'Object-Oriented',
    description: 'High-level, statically typed language that compiles to JavaScript, C++, Java, JVM, Python, and native binaries.',
    signatureRegexes: [/class\s+\w+.*\{/, /static\s+function\s+main\s*\(\s*\)/, /trace\s*\(/],
    keywords: ['class', 'function', 'static', 'var', 'final', 'public', 'private', 'override', 'trace', 'return', 'if', 'else', 'for', 'while'],
    features: { blockDelimiters: ['{', '}'], statementTerminator: ';', commentStyles: ['//', '/*'] }
  },

  coffeescript: {
    id: 'coffeescript',
    name: 'CoffeeScript',
    pistonName: 'coffeescript',
    pistonVersion: '2.6.1',
    paradigm: PARADIGMS.SCRIPTING.id,
    extension: '.coffee',
    extensions: ['.coffee', '.litcoffee'],
    mimeType: 'text/x-coffeescript',
    monacoLang: 'coffeescript',
    category: 'Scripting',
    description: 'Clean, expressive language that compiles into JavaScript using a concise Python- and Ruby-inspired syntax.',
    signatureRegexes: [/->/, /=>/, /console\.log\s+/, /for\s+\w+\s+in\s+/],
    keywords: ['then', 'is', 'isnt', 'unless', 'when', 'loop', 'and', 'or', 'not', 'yes', 'no'],
    features: { commentStyles: ['#'] }
  },

  emacslisp: {
    id: 'emacslisp',
    name: 'Emacs Lisp (Elisp)',
    pistonName: 'emacs',
    pistonVersion: '27.2',
    paradigm: PARADIGMS.FUNCTIONAL.id,
    extension: '.el',
    extensions: ['.el'],
    mimeType: 'text/x-lisp',
    monacoLang: 'scheme',
    category: 'Functional',
    description: 'Dialect of Lisp used by the GNU Emacs editor as a dynamic extension and scripting language.',
    signatureRegexes: [/\(defun\s+/, /\(message\s+/, /\(provide\s+'/],
    keywords: ['defun', 'defvar', 'setq', 'message', 'let', 'if', 'cond', 'while', 'lambda', 'provide'],
    features: { blockDelimiters: ['(', ')'], commentStyles: [';'] }
  },

  smalltalk: {
    id: 'smalltalk',
    name: 'GNU Smalltalk',
    pistonName: 'smalltalk',
    pistonVersion: '3.2.92',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.st',
    extensions: ['.st'],
    mimeType: 'text/x-stsrc',
    monacoLang: 'smalltalk',
    category: 'Object-Oriented',
    description: 'Pure, reflective object-oriented programming language where everything is an object communicating via messages.',
    signatureRegexes: [/Transcript\s+show:/, /Object\s+subclass:/],
    keywords: ['self', 'super', 'true', 'false', 'nil', 'Transcript', 'show', 'cr', 'subclass'],
    features: { blockDelimiters: ['[', ']'], statementTerminator: '.', commentStyles: ['"'] }
  },

  bc: {
    id: 'bc',
    name: 'GNU bc (Calculator)',
    pistonName: 'bc',
    pistonVersion: '1.07.1',
    paradigm: PARADIGMS.STRUCTURED.id,
    extension: '.bc',
    extensions: ['.bc'],
    mimeType: 'text/plain',
    monacoLang: 'c',
    category: 'Structured',
    description: 'Arbitrary-precision numeric processing language with C-like syntax for scientific and financial math.',
    signatureRegexes: [/scale\s*=/, /define\s+\w+\s*\(/, /print\s+/],
    keywords: ['scale', 'define', 'print', 'return', 'if', 'while', 'for', 'break', 'quit', 'sqrt', 'length'],
    features: { blockDelimiters: ['{', '}'], commentStyles: ['/*'] }
  },

  wat: {
    id: 'wat',
    name: 'WebAssembly Text (WAT)',
    pistonName: 'wat',
    pistonVersion: '1.0',
    paradigm: PARADIGMS.UNSTRUCTURED.id,
    extension: '.wat',
    extensions: ['.wat', '.wast'],
    mimeType: 'text/plain',
    monacoLang: 'scheme',
    category: 'Low-Level',
    description: 'Human-readable S-expression format of binary WebAssembly (.wasm) modules executing at near-native speed.',
    signatureRegexes: [/\(module\b/, /\(func\b/, /\(export\b/, /i32\.const/],
    keywords: ['module', 'func', 'param', 'result', 'export', 'import', 'i32', 'i64', 'f32', 'f64', 'call', 'local'],
    features: { blockDelimiters: ['(', ')'], commentStyles: [';;'] }
  },

  simula: {
    id: 'simula',
    name: 'Simula (Simula 67)',
    pistonName: 'simula',
    pistonVersion: '5.1',
    paradigm: PARADIGMS.OBJECT_ORIENTED.id,
    extension: '.sim',
    extensions: ['.sim'],
    mimeType: 'text/plain',
    monacoLang: 'pascal',
    category: 'Historical',
    description: 'The historic first object-oriented language developed at the Norwegian Computing Center that introduced classes and inheritance.',
    signatureRegexes: [/Begin\b/i, /OutText\s*\(/i, /Class\s+\w+/i],
    keywords: ['Begin', 'End', 'Class', 'Procedure', 'Integer', 'Real', 'Text', 'OutText', 'OutImage', 'New'],
    features: { statementTerminator: ';', commentStyles: ['comment'] }
  }

};

module.exports = {
  PARADIGMS,
  LANGUAGES,
  getLanguageById: (id) => LANGUAGES[id] || null,
  getAllLanguages: () => Object.values(LANGUAGES)
};
