# PolyCompile production deployment checklist

## Recommended topology

- **Web application:** Render Node.js Web Service (serves the frontend and Express API from one origin).
- **Batch execution:** Judge0 CE/Wandbox for the languages they support, plus a private/self-hosted provider for additional batch-only coverage.
- **Live interactive execution:** A separate Docker-capable Linux host running `polycompile-interactive-gateway` and the `polycompile-exec` image. The web app issues short-lived signed tickets and the browser connects to the gateway over WebSocket.
- **Secrets:** Provider keys and the shared interactive ticket secret belong in deployment environment variables only, never in Git, ZIP files, or browser code.

Render's Node service does not launch per-run Docker containers. The interactive gateway must run separately on a Docker-capable host; configuring only the Render web service does not enable live terminal input.

## Before deployment

- [ ] Push the cleaned project to GitHub; verify `.env`, `.env.*`, secrets, `node_modules`, and local build artifacts are excluded.
- [ ] Confirm `npm ci`, `npm test`, `npm run verify`, and `npm run stress` pass in CI.
- [ ] Confirm `npm run verify:interactive` reports 55/55 catalogue runtime definitions.
- [ ] Build `polycompile-exec:latest` with `docker build --pull -t polycompile-exec:latest -f runner/Dockerfile .`. The image build must pass the strict runtime executable check and all 55 compile/launch smoke tests.
- [ ] Run `npm run verify:interactive:e2e` inside the runtime image to verify prompt flushing and live line-by-line input for the mainstream tested languages.
- [ ] Build the gateway image: `docker build -t polycompile-interactive-gateway:latest -f interactive-runner/Dockerfile .`.
- [ ] Generate a strong shared secret with `openssl rand -hex 32`.
- [ ] Start the gateway on a dedicated, patched Linux host with Docker socket access; put a TLS reverse proxy with WebSocket upgrade support in front of it.
- [ ] Configure `INTERACTIVE_GATEWAY_URL=wss://YOUR-GATEWAY-DOMAIN/session` and the shared `INTERACTIVE_TICKET_SECRET` on the Render web service.
- [ ] Configure the same `INTERACTIVE_TICKET_SECRET`, `EXECUTION_IMAGE=polycompile-exec:latest`, and an appropriate `MAX_SESSIONS` on the gateway.
- [ ] Use a persistent paid web instance for a live demonstration; a free instance may spin down while idle.
- [ ] Configure a managed Judge0 endpoint and its key if required for batch fallback.
- [ ] Configure `PISTON_URL` only to a private/self-hosted Piston-compatible endpoint if using it; configure `PISTON_KEY` only if required.
- [ ] Keep all execution providers private or protected; do not expose an unrestricted arbitrary-code endpoint to the public internet.

## After deployment

- [ ] Gateway `GET /health` returns HTTP 200 and reports active session count.
- [ ] Web `GET /health` returns HTTP 200.
- [ ] `GET /api/languages` returns the expected 55-language catalogue.
- [ ] `GET /api/snippets` returns the curated snippets.
- [ ] `POST /api/detect` correctly identifies representative examples, including Nim, Fish, and Crystal.
- [ ] Test C `scanf`, C++ `cin` and `getline`, Java `Scanner`, Python `input()`, JS `readline`, Go `bufio.Reader`, and the other included PTY smoke tests using terminal input only.
- [ ] Test two or more lines, blank lines, strings with spaces, Unicode, pasted multi-line input, EOF, and Ctrl+C.
- [ ] Test syntax errors, runtime errors, infinite loops/timeouts, output truncation, and concurrent submissions.
- [ ] Confirm container removal after normal exit, timeout, browser disconnect, and cancellation.
- [ ] Confirm provider outages return clear service errors rather than simulated success.
- [ ] Re-run the 55-language image build gate whenever the runtime image, language registry, or compiler versions change.

## Important provider note

The public Piston API requires authorization as of February 15, 2026. Do not assume the public endpoint is available without a key. Self-host Piston or use a managed provider if the project requires its additional batch runtimes. Standard batch APIs do not provide live terminal input after execution starts; the WebSocket PTY gateway is the interactive path.
