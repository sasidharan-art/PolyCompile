# PolyCompile — Hackathon Demonstration Guide

## Quick Start (3 options)

### Option A: Full Docker Setup (Production-grade, recommended for judges)
1. Install Docker Desktop
2. Copy .env.example to .env, set INTERACTIVE_TICKET_SECRET to 32+ random chars
3. `docker compose build polycompile-exec-image` (20-40 min first time, cached after)
4. `docker compose up`
5. Open http://localhost:3000

### Option B: Local Dev Mode (No Docker, development-only, works immediately)
1. `npm install`
2. Set LOCAL_DEV_MODE=true in .env (or run-local-dev.bat/sh)
3. Run `run-local-dev.bat` (Windows) or `bash run-local-dev.sh` (Linux/Mac)
4. Open http://localhost:3000

### Option C: Vercel/Render Deployment
[see README.md for cloud deployment]

---

## Live Demo Script (10-minute presentation)

### Act 1: Python Interactive Input (2 min)
1. Select "Python 3" from language dropdown
2. Enter this program:
   ```python
   name = input("What is your name? ")
   age = int(input("How old are you? "))
   print(f"Hello, {name}!")
   print(f"In 10 years you'll be {age + 10}!")
   ```
3. Click Run (or Ctrl+Enter)
4. SHOW: Terminal shows "What is your name? " as a prompt
5. TYPE: your name in the terminal, press Enter
6. SHOW: Terminal shows "How old are you?"
7. TYPE: your age, press Enter
8. SHOW: Both outputs appear immediately in correct order
9. POINT OUT: Real program output, real stdin forwarding, Programiz-style UX

### Act 2: Compiler Design Phase Inspection (2 min)
1. Keep the Python code
2. Click "Inspect Phases" (or Ctrl+/)
3. SHOW: Lexical Analysis tab — tokenized output
4. SHOW: Syntax Analysis — AST visualization
5. SHOW: Semantic Analysis — symbol table
6. SHOW: Intermediate Code — 3-address code (TAC)
7. SHOW: Optimization — optimized TAC + assembly preview
8. POINT OUT: This is a real 6-phase compiler design system, not a wrapper

### Act 3: Compiled Language Interactive Input (2 min)
1. Select "C" from language dropdown  
2. Enter:
   ```c
   #include <stdio.h>
   int main() {
       char name[100];
       int age;
       printf("Enter name: ");
       scanf("%s", name);
       printf("Enter age: ");
       scanf("%d", &age);
       printf("Hello %s, age %d!\n", name, age);
       return 0;
   }
   ```
3. Click Run — SHOW compilation phase then interactive terminal
4. TYPE name, press Enter, TYPE age, press Enter
5. SHOW: Real GCC compilation + real execution + interactive stdin

### Act 4: Multiple Language Demo (2 min)
Quickly switch through:
- Java: Scanner.nextLine() with interactive input
- JavaScript: readline() or prompt() with interactive input
- Rust: io::stdin().read_line() with interactive input
Show each compiles/runs correctly

### Act 5: Error Handling (1 min)
1. Enter broken code (e.g., syntax error in C)
2. SHOW: Compiler error appears clearly in terminal
3. Fix it and re-run

### Act 6: Language Detection (1 min)
1. Select "Auto-Detect" from dropdown
2. Paste code without selecting language
3. SHOW: AI-powered detection identifies language with confidence %

---

## Key Differentiators vs Simple Online Compilers

| Feature | PolyCompile | Simple Compilers |
|---------|-------------|------------------|
| Interactive stdin | ✅ Real-time WebSocket | ❌ Pre-collected only |
| Compiler phases | ✅ 6-phase inspection | ❌ None |
| Languages | ✅ 55+ | Typically 10-20 |
| Language detection | ✅ AI-powered | ❌ Manual only |
| Sandbox security | ✅ Docker isolation | Varies |
| AST visualization | ✅ Full AST | ❌ None |
| Symbol table | ✅ Full semantic analysis | ❌ None |

---

## Technical Architecture Talking Points

1. **PTY-based Interactive Execution**: Uses Linux `script(1)` to allocate a real pseudo-terminal for each program, ensuring prompts appear immediately (no output buffering)

2. **Ticket-based Security**: WebSocket connections require short-lived HMAC-signed tickets — prevents unauthorized execution

3. **Multi-stage Sandbox**: Docker container with --network none, --cap-drop ALL, --read-only filesystem, cgroup memory/CPU limits

4. **55-language Registry**: JSON-driven language configuration with compile/run command arrays for deterministic execution

5. **Real Compiler Design**: 6-phase compiler pipeline with lexical analysis, parsing, semantic analysis, IR generation, and optimization — not simulated

---

## If Docker Is Unavailable

Run with LOCAL_DEV_MODE=true (see Option B above).
Interactive terminal works for most languages that are installed on the host.
Note: No sandboxing — development only.
