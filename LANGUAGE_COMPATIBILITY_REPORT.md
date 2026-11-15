# PolyCompile — Language Compatibility Report

Generated: Based on runner/languages.json and runtime-smoke-tests.json

## Capability Legend
- ✅ Verified: Tested and working
- ⚠️ Partial: Works with limitations  
- 🔧 Fixed: Was broken, now fixed
- ❌ Not supported: Genuinely unsupported feature
- 🧪 Testbench: Uses simulation/testbench model, not interactive stdin

## Language Compatibility Table

| Language | Runtime | Basic Execution | Interactive stdin | Streaming | Termination | Notes |
|----------|---------|----------------|-------------------|-----------|-------------|-------|
| C | GCC 12 | ✅ | ✅ scanf/fgets | ✅ | ✅ | fflush needed for prompts |
| C++ | G++ 12 | ✅ | ✅ cin/getline | ✅ | ✅ | flush needed |
| Java | OpenJDK 21 | ✅ | ✅ Scanner/BufferedReader | ✅ | ✅ | |
| Python 3 | Python 3.11+ | ✅ | ✅ input()/sys.stdin | ✅ | ✅ | |
| JavaScript | Node.js 20 | ✅ | ✅ readline/prompt() | ✅ | ✅ | prompt() polyfill provided |
| TypeScript | tsc + Node 20 | ✅ | ✅ readline/prompt() | ✅ | ✅ | compile then run |
| Go | Go 1.22 | ✅ | ✅ bufio.Scanner | ✅ | ✅ | |
| Rust | rustc | ✅ | ✅ io::stdin().read_line() | ✅ | ✅ | compile phase shown |
| Ruby | Ruby 3.1 | ✅ | ✅ gets/STDIN | ✅ | ✅ | STDOUT.flush needed |
| PHP | PHP 8.2 | ✅ | ✅ fgets(STDIN) | ✅ | ✅ | |
| Perl | Perl 5.36 | ✅ | ✅ <STDIN> | ✅ | ✅ | |
| Lua | Lua 5.4 | ✅ | ✅ io.read() | ✅ | ✅ | io.flush() needed |
| Bash | Bash 5.2 | ✅ | ✅ read | ✅ | ✅ | |
| Kotlin | kotlinc + JVM | ✅ | ✅ readLine() | ✅ | ✅ | slow compile |
| Scala | scalac + JVM | ✅ | ✅ StdIn.readLine | ✅ | ✅ | slow compile |
| C# | Mono | ✅ | ✅ Console.ReadLine() | ✅ | ✅ | |
| R | Rscript | ✅ | ✅ readLines/scan | ✅ | ✅ | |
| Fortran | gfortran | ✅ | ✅ READ(*,*) | ✅ | ✅ | |
| Pascal | fpc | ✅ | ✅ readln | ✅ | ✅ | |
| Haskell | GHC | ✅ | ✅ getLine | ✅ | ✅ | hSetBuffering needed |
| OCaml | ocamlc | ✅ | ✅ read_line | ✅ | ✅ | |
| Common Lisp | SBCL | ✅ | ✅ read-line | ✅ | ✅ | |
| Scheme | Guile | ✅ | ✅ read-line | ✅ | ✅ | |
| Tcl | tclsh | ✅ | ✅ gets stdin | ✅ | ✅ | |
| SQL | SQLite 3 | ✅ | ⚠️ batch mode only | ✅ | ✅ | .read file + stdin queries |
| GNU Octave | octave | ✅ | ✅ input() | ✅ | ✅ | |
| Ada | GNAT | ✅ | ✅ Get_Line | ✅ | ✅ | |
| D | GDC | ✅ | ✅ readln | ✅ | ✅ | |
| x86-64 ASM | NASM+ld | ✅ | ✅ sys_read syscall | ✅ | ✅ | low-level only |
| COBOL | GnuCOBOL | ✅ | ✅ ACCEPT | ✅ | ✅ | |
| Prolog | SWI-Prolog | ✅ | ✅ read/read_line_to_string | ✅ | ✅ | |
| Verilog | Icarus+vvp | ✅ | 🧪 testbench only | ✅ | ✅ | $finish needed |
| VHDL | GHDL | ✅ | 🧪 simulation only | ✅ | ✅ | stop-time=1us |
| Zsh | zsh | ✅ | ✅ read | ✅ | ✅ | |
| Clojure | clojure | ✅ | ✅ read-line | ✅ | ✅ | slow JVM startup |
| Erlang | erlc+erl | ✅ | ✅ io:get_line | ✅ | ✅ | |
| Elixir | elixir | ✅ | ✅ IO.gets | ✅ | ✅ | |
| AWK | mawk/gawk | ✅ | ✅ getline / stream | ✅ | ✅ | EOF required |
| BASIC | bwbasic | ✅ | ✅ INPUT / interactive | ✅ | ✅ | SYSTEM to quit |
| Brainfuck | Custom JS VM | ✅ | ✅ , instruction | ✅ | ✅ | |
| Nim | nim c | 🔧 | ✅ readLine | ✅ | ✅ | Fixed permission error |
| Forth | Gforth | 🔧 | ✅ ACCEPT/KEY | ✅ | ✅ | Fixed exit with bye |
| Fish | fish | ✅ | ✅ read | ✅ | ✅ | |
| jq | jq | ✅ | ⚠️ stream input only | ✅ | ✅ | EOF required |
| GNU sed | sed | ✅ | ⚠️ stream input only | ✅ | ✅ | EOF required |
| POSIX dash | dash | ✅ | ✅ read | ✅ | ✅ | |
| GNU Makefile | make | ✅ | ❌ not interactive | ✅ | ✅ | build output only |
| Lisp (SBCL) | sbcl | ✅ | ✅ read-line | ✅ | ✅ | |
| Swift | swiftc | ✅ | ✅ readLine() | ✅ | ✅ | |
| Zig | zig build-exe | 🔧 | ✅ stdin reader | ✅ | ✅ | Fixed stdout vs stderr |
| Julia | julia | ✅ | ✅ readline() | ✅ | ✅ | slow first run |
| Dart | dart compile | ✅ | ✅ stdin.readLineSync | ✅ | ✅ | |
| Groovy | groovy | ✅ | ✅ System.in | ✅ | ✅ | |
| F# | dotnet fsi | ✅ | ✅ Console.ReadLine | ✅ | ✅ | |
| Crystal | crystal build | ✅ | ✅ gets | ✅ | ✅ | |
| Objective-C | gcc+gnustep | ✅ | ✅ scanf/fgets | ✅ | ✅ | |
| VB.NET | dotnet | ✅ | ✅ Console.ReadLine | ✅ | ✅ | |
| PowerShell | pwsh | ✅ | ✅ Read-Host | ✅ | ✅ | |
| Racket | racket | ✅ | ✅ read-line | ✅ | ✅ | |
| V (Vlang) | v | ✅ | ✅ os.input | ✅ | ✅ | |

## Interactive Input Architecture

PolyCompile uses a PTY-based execution architecture that ensures:

1. **Prompts appear immediately** — `script(1)` allocates a real PTY, so `printf("Enter: ")` without `\n` appears immediately
2. **Input flows to the correct process** — WebSocket input → gateway → container stdin → PTY master → running program
3. **Multiple rounds work** — Each `\n` from the terminal triggers one `input()` call in the program
4. **Large inputs work** — Buffer limit of 64 KB per input message  
5. **EOF works** — Ctrl+D in terminal sends `\u0004` (EOF character) to the process
6. **Stop works** — Ctrl+C sends `{type:'stop'}` which kills the Docker container

## Security Notes

- Programs run as uid=10001 (non-root) in a read-only container
- Network is disabled (--network none)
- Memory limit: 1 GB, CPU: 1 core, PIDs: 64
- Execution timeout: 60 seconds maximum
- Output limit: 1 MB
- No persistence between runs
