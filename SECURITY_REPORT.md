# PolyCompile — Security Audit Report

## Overview

This document summarises the security measures implemented in PolyCompile to safely execute arbitrary user-submitted code from 55+ languages.

---

## 1. Sandbox Isolation (Docker)

| Control | Implementation | Detail |
|---------|---------------|--------|
| Network isolation | `--network none` | No outbound or inbound network access from inside the container |
| Non-root execution | `uid=10001` (runner) | Programs never run as root |
| Read-only filesystem | `--read-only` | Root filesystem is immutable; only `/work` and `/exec` are writable tmpfs |
| Capability drop | `--cap-drop ALL` | All Linux capabilities removed |
| Memory limit | `--memory 1g` | Prevents memory exhaustion attacks |
| CPU limit | `--cpus 1` | Prevents CPU monopolisation |
| PID limit | `--pids-limit 64` | Prevents fork bombs |
| Execution timeout | 60 seconds | Container killed after timeout |
| Output limit | 1 MB | Stdout/stderr truncated at 1 MB |
| No persistence | Ephemeral container | Each run gets a fresh container; no data survives between runs |

---

## 2. WebSocket Authentication (Ticket System)

- The browser requests a **short-lived HMAC-SHA256-signed ticket** from `/api/interactive-ticket`
- Tickets are single-use and expire in 60 seconds
- The gateway verifies the ticket signature before accepting any WebSocket connection
- The secret (`INTERACTIVE_TICKET_SECRET`) must be at least 32 characters and is never sent to the client
- Prevents unauthorized or unauthenticated code execution requests

---

## 3. Gateway Security

- Gateway (`interactive-runner/gateway.js`) runs outside the sandbox and only bridges stdin/stdout
- It does **not** execute code as host processes — it spawns a new Docker container per session
- Docker socket access is required by the gateway host (not the web server), limiting blast radius
- TLS termination is recommended via a reverse proxy (nginx/Render/Cloudflare) in production

---

## 4. Input Validation

- Language IDs are validated against the registry (`runner/languages.json`) — unknown IDs are rejected
- Source code is written to an in-container tmpfs path; it never touches the host filesystem
- Stdin messages are size-limited (64 KB per message) to prevent buffer overflow attacks
- WebSocket message types are whitelisted (`input`, `stop`) — unknown types are ignored

---

## 5. Compiler Phase Analysis (Server-side)

- The 6-phase compiler analysis (`/api/compile-phases`) runs entirely in the Node.js process
- It performs **static analysis only** — no code is executed server-side during phase inspection
- Output is sanitised before sending to the client

---

## 6. Supply-Chain / Credential Safety

| Risk | Mitigation |
|------|-----------|
| Provider API keys in code | `.env` excluded from Git; `.gitignore` enforced |
| Docker image provenance | Base images pinned; Dockerfile uses official Debian/Ubuntu bases |
| npm dependency auditing | `npm audit` recommended in CI |
| Judge0/Piston keys | Never included in frontend bundles or public responses |

---

## 7. Known Limitations / Accepted Risks

| Item | Notes |
|------|-------|
| Docker socket access | Gateway host has Docker socket — treat as root-equivalent access; isolate from web tier |
| LOCAL_DEV_MODE | Disables sandboxing entirely; intended for development only, never production |
| Third-party providers | Judge0 CE and Wandbox are community services; their security posture is external |
| Verilog/VHDL simulation | HDL tools run simulation testbenches; interactive stdin is not applicable |

---

## 8. Recommended Hardening for Production

1. Use a **dedicated VM or VPS** (not shared hosting) for the Docker gateway
2. Terminate TLS at the gateway with a reverse proxy; never expose port 8080 directly
3. Enable Docker's `userns-remap` for additional uid isolation
4. Rotate `INTERACTIVE_TICKET_SECRET` periodically
5. Set up rate limiting on `/api/interactive-ticket` to throttle abuse
6. Monitor container spawn rates and kill runaway containers with a watchdog
7. Run `npm audit --production` before each release

---

*Report generated from codebase review of PolyCompile interactive-runner, gateway, and runner Dockerfile.*
