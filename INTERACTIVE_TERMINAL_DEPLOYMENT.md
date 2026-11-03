# PolyCompile true interactive terminal deployment

## What this adds

- A console input line that sends input while the program is running.
- WebSocket streaming for stdout/stderr and process exit events.
- One fresh execution container per session.
- No network access inside code-execution containers, non-root execution, read-only root filesystem, CPU/memory/PID limits, and a 60-second maximum runtime.
- Short-lived HMAC tickets issued by the existing Express service.

The existing Render web service remains the frontend/API. The interactive execution gateway must run on a Docker-capable Linux host that you control (VPS or equivalent). Render's ordinary Web Service does not provide a Docker daemon/socket to safely launch nested per-session containers.

## 1. Build the execution image on the Docker host

From the repository root:

```bash
docker build -t polycompile-exec:latest -f runner/Dockerfile .
```

## 2. Build the WebSocket gateway image

```bash
docker build -t polycompile-interactive-gateway:latest -f interactive-runner/Dockerfile .
```

## 3. Create one shared ticket secret

Generate a long random secret (at least 32 random bytes), for example:

```bash
openssl rand -hex 32
```

Set the exact same value in both the Render web service and the gateway host. Do not commit it to Git.

## 4. Start the gateway on the Docker host

Replace `YOUR_LONG_RANDOM_SECRET` with the generated value. The gateway must be reachable over HTTPS/WSS through a reverse proxy (Caddy/Nginx) with WebSocket upgrade support.

```bash
docker run -d --name polycompile-interactive-gateway --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e PORT=8080 \
  -e INTERACTIVE_TICKET_SECRET=YOUR_LONG_RANDOM_SECRET \
  -e EXECUTION_IMAGE=polycompile-exec:latest \
  -e MAX_SESSIONS=4 \
  polycompile-interactive-gateway:latest
```

**Docker socket warning:** Access to `/var/run/docker.sock` is effectively host-administrator access. Run this gateway only on a dedicated, patched host; do not share that host with sensitive workloads. Restrict inbound access to the reverse proxy and protect the gateway with TLS.

## 5. Configure the existing Render web service

Add these environment variables to the existing `PolyCompile` Render Web Service:

- `INTERACTIVE_GATEWAY_URL` = `wss://YOUR-GATEWAY-DOMAIN/session`
- `INTERACTIVE_TICKET_SECRET` = the exact same secret used by the gateway

Save the changes and let Render redeploy.

## 6. Test

Open the deployed PolyCompile site and run:

### Python

```python
name = input("Enter your name: ")
print("Hello", name)
```

When `Enter your name:` appears, type `Surya` in the input line at the bottom of the Output console and press Enter. Expected output:

```text
Enter your name: Hello Surya
```

Repeat with C (`scanf`), C++ (`cin`), and Java (`Scanner`). The execution image reads its supported interactive runtime commands from `runner/languages.json`; the interactive gateway can execute only language IDs present in that file. The language catalogue in the UI is broader than this runtime list, so verify a language is present in the runner registry before promising live stdin support for it.

## Operational notes

- The Run & Compile button starts the program once. The terminal keeps that process alive and forwards each submitted line to its standard input; it does not rerun the source after every input.
- `runner/Dockerfile` installs the runtime image and copies `runner/languages.json` to `/opt/languages.json`, which is read by `/opt/session-runner.js` inside each session container.
- The old in-process WebSocket runner is disabled by default. `ALLOW_UNSANDBOXED_INTERACTIVE=true` is a development-only opt-in and must not be set on a public production service.

- The gateway uses a short-lived ticket with a 60-second lifetime; the ticket is one-purpose and signed, but currently not bound to a user identity because the project has no authenticated-user session model in this flow. Add application authentication/rate limits before opening this to a public audience.
- The current runner image has broad language runtimes and can be large. Build it once and keep it on the Docker host.
- This patch is a first deployable implementation, not a completed third-party security audit. Before public production use, add per-user quotas, queueing, log redaction, filesystem quotas, stronger syscall policy, and monitoring.
- The old `/api/execute` batch endpoint remains in place for compatibility. The new Run & Compile UI uses the interactive gateway and will report a configuration error until steps 1–5 are complete.

## Single-service demo fallback (quick Render deployment)

This project package also supports a same-origin demo mode: the frontend requests
`/api/interactive-ticket`, receives `/session`, and the existing Render Node
service handles the WebSocket itself. No separate gateway URL or ticket secret
is required for this mode.

The demo fallback launches compiler/runtime child processes directly on the web
service host. This is **not an isolation boundary** and must only be used for a
controlled hackathon demonstration. Do not expose it as a public multi-tenant
production compiler. For production, deploy the isolated Docker gateway above
on a dedicated Docker-capable host and restore the authenticated gateway mode.

For the current single-service demo deployment:

1. Replace the repository files with this package and push to the existing branch.
2. Keep Render's existing `npm ci` build command and `npm start` start command.
3. Do not set `INTERACTIVE_GATEWAY_URL` or `INTERACTIVE_TICKET_SECRET` for this demo mode.
4. Redeploy the main PolyCompile service.
5. Verify `POST /api/interactive-ticket` returns `mode: "builtin-demo"` and `gatewayUrl: "/session"`.
6. Verify `/session` by running a C/C++/Python/Node interactive-input example. The selected language runtime/compiler must be installed on the Render host.

## Language dispatch correction (2026-11-03)

The interactive runner now dispatches by the selected language ID and never treats an unknown language as Python. Fortran uses `gfortran`; C/C++ use `gcc`/`g++`; Java, Go, Rust, and supported scripting runtimes use their own executables. If a compiler is absent on the web host, the runner attempts the configured Judge0/Wandbox cloud execution path for a completed, non-interactive run.

**Important limitation:** Judge0/Wandbox submissions are batch executions. They cannot receive a new stdin line while the remote process is waiting at a prompt. True live, sequential stdin requires an installed runtime in the interactive execution container (or a dedicated interactive sandbox service). Do not describe cloud fallback as live interactive input.
