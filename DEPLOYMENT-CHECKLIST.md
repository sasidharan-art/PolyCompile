# PolyCompile production deployment checklist

## Recommended topology

- **Web application:** Render Node.js Web Service (serves the frontend and Express API from one origin).
- **Execution:** Judge0 CE/Wandbox for the languages they support, plus a private/self-hosted Piston-compatible service or another managed sandbox for the remaining catalogue entries.
- **Secrets:** Provider keys belong in Render environment variables only, never in Git or browser code.

Render cannot run the project's standalone Docker runner just because `runner/Dockerfile` exists. That runner is not connected to `ExecutionManager` in this version.

## Before deployment

- [ ] Push the cleaned project to GitHub.
- [ ] Confirm `npm ci`, `npm test`, `npm run verify`, and `npm run stress` pass in CI.
- [ ] Create a Render Blueprint from `render.yaml`.
- [ ] Use a persistent paid instance for a live demonstration; a free instance may spin down while idle.
- [ ] Configure a managed Judge0 endpoint and its key if required.
- [ ] Configure `PISTON_URL` to a private/self-hosted Piston-compatible `/api/v2/execute` endpoint if using it; configure `PISTON_KEY` only if that service requires it.
- [ ] Verify the remote provider's installed runtime names and versions against `src/compiler/LanguageRegistry.js`.
- [ ] Keep the Piston service private or protected; do not expose an unrestricted arbitrary-code endpoint to the public internet.

## After deployment

- [ ] `GET /health` returns HTTP 200.
- [ ] `GET /api/languages` returns the expected language catalogue.
- [ ] `GET /api/snippets` returns the curated snippets.
- [ ] `POST /api/detect` correctly identifies representative examples, including Nim, Fish, and Crystal.
- [ ] Test a real compile-and-run sample for every language enabled in production.
- [ ] Test stdin, syntax errors, runtime errors, timeout termination, output truncation, and concurrent submissions.
- [ ] Confirm provider outages return a clear 503 instead of simulated success.

## Important provider note

The public Piston API requires authorization as of February 15, 2026. Do not assume the public endpoint is available without a key. Self-host Piston or use a managed provider if the project requires its additional language runtimes.
