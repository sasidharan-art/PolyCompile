# PolyCompile — Multi-Language IDE & Interactive Compiler

PolyCompile is a production-grade multi-language programming IDE and compiler system featuring **Programiz-style real-time bidirectional interactive terminal input/output**, automatic language detection, 6-phase compiler design inspection (Lexer, Parser, AST, Semantic Table, TAC/IR, Optimizer), and sandboxed execution across 55+ languages.

---

## ⚡ Programiz-Style Interactive Terminal

PolyCompile's terminal behaves like professional online compilers:
- **Natural bidirectional communication:** Run your code, see prompts instantly (`printf("Enter name: ")` without newline), type input directly in the terminal, press Enter, and immediately see the next output.
- **Pseudo-Terminal (PTY) Architecture:** Linux `script(1)` allocates a true PTY per container, ensuring unbuffered stdout flushing and disabling duplicate kernel echo.
- **Support for all stdin APIs:** `scanf`/`fgets` (C), `cin`/`getline` (C++), `Scanner`/`BufferedReader` (Java), `input()` (Python), `readline`/`prompt()` (JavaScript/Node), `fmt.Scan` (Go), `io::stdin().read_line()` (Rust), Brainfuck `,` instruction, and more.
- **Inline terminal controls:** Integrated prompt (`$ `), visible caret, paste multiline input, EOF (`Ctrl+D`), interrupt (`Ctrl+C`), and real exit code / execution time / memory reporting.

---

## 🚀 Quick Start

### 1. Instant Local Development (No Docker Required)

You can run PolyCompile immediately on any machine with Node.js 18+ and Python:

```bash
npm install

# On Windows:
run-local-dev.bat

# On Linux / macOS:
bash run-local-dev.sh
```

Open `http://localhost:3000`. The local development gateway automatically starts on `ws://localhost:8081` and allows live interactive coding directly on your host machine.

### 2. Production Docker Stack (Full Sandboxing)

For judging, deployment, and national hackathon presentations with full container isolation:

```bash
cp .env.example .env
# Set INTERACTIVE_TICKET_SECRET in .env (minimum 32 characters)

# Fast incremental BuildKit build (cached across toolchain layers):
docker compose build polycompile-exec-image polycompile-interactive-gateway polycompile
docker compose up -d
```

Open `http://localhost:3000`. The interactive gateway runs on port 8080 with strict ephemeral containers (`--network none`, `--cap-drop ALL`, `--read-only`, `uid=10001`).

---

Deploy the current Express application as a **Render Web Service**. The Express process serves the frontend and REST API from the same origin. Batch execution is delegated to configured remote sandbox providers. Live terminal input uses a separately deployed WebSocket gateway that launches one isolated Docker runtime container per run; submitted programs are not executed as arbitrary child processes inside the production web server.

### Environment variables

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Set to `production` on Render |
| `PORT` | Assigned by Render automatically; do not hard-code it in the dashboard |
| `JUDGE0_URL` | Judge0-compatible API base URL; defaults to `https://ce.judge0.com` |
| `JUDGE0_KEY` | Optional authentication key for the configured Judge0 provider |
| `JUDGE0_RAPIDAPI_HOST` | Optional RapidAPI host header when using a RapidAPI endpoint |
| `PISTON_URL` | Optional trusted Piston-compatible execution endpoint |
| `PISTON_KEY` | Optional Piston provider authorization token |
| `INTERACTIVE_GATEWAY_URL` | Public `wss://.../session` URL of the separate interactive gateway |
| `INTERACTIVE_TICKET_SECRET` | Strong shared secret used to sign one-time interactive session tickets |

Copy `.env.example` to `.env` for local development. Do not commit `.env`.

## Full local interactive execution (Docker)

`npm start` alone starts only the web/API process. It does not start the Docker-backed interactive gateway, which is why stdin-driven programs can report that no interactive runner is available. For the complete local stack, use Docker Compose:

```bash
cp .env.example .env
# Set INTERACTIVE_TICKET_SECRET in .env (for example: openssl rand -hex 32)
docker compose build polycompile-exec-image polycompile-interactive-gateway polycompile
docker compose up -d
```

Open `http://localhost:3000` on the same computer. Confirm `http://localhost:8080/health` reports `status: healthy`, `docker: connected`, and `executionImage: polycompile-exec:latest`. The health endpoint now fails readiness when Docker is unavailable or the runtime image is missing. See `INTERACTIVE_TERMINAL_DEPLOYMENT.md` for remote hosting; a Render web service alone does not provide the Docker socket required by the gateway.

## Local development

Requirements: Node.js 18+ (Node.js 20 or 22 recommended) and npm.

```bash
npm ci
npm start
```

Open `http://localhost:3000`.

Local-only interpreter/simulator paths can be explicitly selected during development with `preferLocal: true`. They are not a secure boundary for arbitrary untrusted code and are disabled in production. Brainfuck has a bounded built-in VM. In production, remote provider failures are returned as execution-service errors; PolyCompile does not silently replace a failed real compiler with simulated output.

## Tests

```bash
npm test
npm run verify
npm run stress
```

- `npm test`: language detection, compiler analysis, local engine regression, and production execution-policy tests.
- `npm run verify`: verifies the curated snippet catalogue against the project's current local verification engines. A passing snippet test is not proof of native compilation by a third-party provider.
- `npm run stress`: runs nine complex local analysis/runtime regression scenarios. It is not a cloud-provider load test.
- `npm run verify:interactive`: checks that all 55 catalogue IDs have interactive runtime definitions.
- `npm run verify:interactive:e2e`: exercises live PTY input for 15 real prompt/input cases using toolchains installed on the development host.
- `npm run verify:interactive:runtime`: runs the 55-language smoke suite inside an already-built `polycompile-exec:latest` image.

## Project layout

```text
PolyCompile/
├── public/                 # Frontend assets
├── src/compiler/           # Language detection and compiler analysis phases
├── src/execution/          # Execution routing and provider clients
├── src/snippets/           # Curated language examples
├── runner/                 # Sandboxed runtime image, language registry, and smoke tests
├── interactive-runner/     # WebSocket PTY gateway, live session runner, and input tests
├── api/                    # Optional Vercel API entry point
├── server.js               # Express app and REST API
├── package.json
├── package-lock.json
├── render.yaml              # Recommended Render deployment
├── Dockerfile               # Node.js application container
└── docker-compose.yml       # Local application container orchestration
```

**Interactive execution note:** the browser obtains a short-lived signed ticket from `/api/interactive-ticket` and connects directly to the separately deployed `interactive-runner/gateway.js` over WebSocket. That gateway launches `polycompile-exec:latest`, which runs the selected language in a fresh PTY-backed container. `/api/execute` remains the batch route and cannot accept keyboard input after process start. The 55-language registry is a configuration declaration; deploy only after the Docker image's strict executable checks and 55 compile/launch smoke tests pass. The Docker gateway requires access to the Docker socket (host-administrator equivalent), so use a dedicated host, TLS reverse proxy, strict limits, and security monitoring.

## REST API

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Application health and catalog count |
| `/api/languages` | GET | Language catalogue and paradigms |
| `/api/snippets` | GET | Curated code examples |
| `/api/detect` | POST | Automatic language detection |
| `/api/compile-phases` | POST | Lexical, syntax, semantic, IR, and optimization analysis |
| `/api/execute` | POST | Compiler analysis plus remote sandbox execution |

Example execution request:

```json
{
  "languageId": "python",
  "sourceCode": "print('Hello, PolyCompile')",
  "stdin": ""
}
```


- Render is the recommended primary host for the existing Express application.
- Vercel configuration is retained as an optional alternative for the web/API tier, but Vercel is not the recommended host for this long-running compiler workflow.
- The root `Dockerfile` packages the Node.js web application; `runner/Dockerfile` packages language toolchains and `interactive-runner/Dockerfile` packages the WebSocket gateway.
- Do not expose provider credentials or sandbox runner endpoints in frontend code.
