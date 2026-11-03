# PolyCompile

Multi-language programming workspace with automatic language detection, compiler-phase analysis, code snippets, and remote sandbox execution.

## Production deployment recommendation

Deploy the current Express application as a **Render Web Service**. The Express process serves the frontend and REST API from the same origin. Code execution is delegated to configured remote sandbox providers; submitted programs are not executed as arbitrary child processes inside the production web server.

### Render setup

The repository includes `render.yaml` for a Render Blueprint deployment.

1. Push this project to a GitHub repository.
2. In Render, select **New → Blueprint** and connect the repository.
3. Review the service named `polycompile` and create it.
4. Use a paid Starter instance for a persistent demo experience. A Free instance can spin down when idle and is not recommended for reliable live demonstrations.
5. In the Render service environment, configure a managed Judge0 endpoint/API key or a trusted Piston-compatible endpoint if your usage requires predictable capacity. Never commit provider keys to Git.
6. Wait for the deployment to become Live, then test `/health`, `/api/languages`, `/api/snippets`, `/api/detect`, and `/api/execute` using real programs in each language you intend to demonstrate.

The default Judge0 CE and Wandbox community endpoints are useful for development and demonstrations, but they are third-party services. Their availability, rate limits, language versions, and capacity are outside PolyCompile's control. For dependable production usage, use a managed/private execution provider and verify its supported language list.

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
| `INTERACTIVE_GATEWAY_URL` | Secure WebSocket URL for the isolated interactive execution gateway, e.g. `wss://host/session` |
| `INTERACTIVE_TICKET_SECRET` | Shared HMAC secret used by the web service and interactive gateway |

Copy `.env.example` to `.env` for local development. Do not commit `.env`.

## Local development

Requirements: Node.js 18+ (Node.js 20 or 22 recommended) and npm.

```bash
npm ci
npm start
```

Open `http://localhost:3000`. The live stdin terminal requires the separate Docker-based gateway described in [INTERACTIVE_TERMINAL_DEPLOYMENT.md](INTERACTIVE_TERMINAL_DEPLOYMENT.md). It intentionally fails closed when that gateway is not configured.

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

## Project layout

```text
PolyCompile/
├── public/                 # Frontend assets
├── src/compiler/           # Language detection and compiler analysis phases
├── src/execution/          # Execution routing and provider clients
├── src/snippets/           # Curated language examples
├── runner/                 # Docker execution image and language registry
├── interactive-runner/     # WebSocket gateway and persistent-process session runner
├── api/                    # Optional Vercel API entry point
├── server.js               # Express app and REST API
├── package.json
├── package-lock.json
├── render.yaml              # Recommended Render deployment
├── Dockerfile               # Node.js application container
└── docker-compose.yml       # Local application container orchestration
```

**Runner integration note:** `runner/Dockerfile` and `runner/runner.js` are a standalone command-line runner. The current Express `ExecutionManager` does not invoke that Docker runner. Do not deploy it as an exposed arbitrary-code service without adding an authenticated API, per-job container isolation, resource limits, network restrictions, filesystem cleanup, and security testing. The current production route uses the configured remote sandbox providers.

## REST API

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Application health and catalog count |
| `/api/languages` | GET | Language catalogue and paradigms |
| `/api/snippets` | GET | Curated code examples |
| `/api/detect` | POST | Automatic language detection |
| `/api/compile-phases` | POST | Lexical, syntax, semantic, IR, and optimization analysis |
| `/api/execute` | POST | Compiler analysis plus remote sandbox execution |
| `/api/interactive-ticket` | POST | Issues a short-lived ticket for the interactive WebSocket gateway |
| `/session` | WebSocket | Development-only in-process interactive runner; disabled unless explicitly opted in |

Example execution request:

```json
{
  "languageId": "python",
  "sourceCode": "print('Hello, PolyCompile')",
  "stdin": ""
}
```

## Deployment notes

- Render is the recommended primary host for the existing Express application.
- Vercel configuration is retained as an optional alternative for the web/API tier, but Vercel is not the recommended host for this long-running compiler workflow.
- The root `Dockerfile` packages the Node.js web application; it does not install all language compilers.
- Do not expose provider credentials or sandbox runner endpoints in frontend code.

### Quick single-service interactive terminal demo

The current package includes a same-origin WebSocket fallback at `/session`; it does not require a separately deployed gateway for a controlled demo. Keep Render's `npm ci` / `npm start` commands and do not configure `INTERACTIVE_GATEWAY_URL` or `INTERACTIVE_TICKET_SECRET` in this mode. See `INTERACTIVE_TERMINAL_DEPLOYMENT.md`.

**Security:** this fallback executes child processes on the web-service host and is not a production sandbox. Use only for a controlled hackathon demonstration; public production deployments must use the isolated Docker gateway.
