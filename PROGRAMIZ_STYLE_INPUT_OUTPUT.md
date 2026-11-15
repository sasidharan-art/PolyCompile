# PolyCompile integrated terminal execution

PolyCompile uses one integrated terminal for program output and live keyboard input. There is no separate stdin textarea or pre-run input form.

## User workflow
1. Select a language from the existing 55-language catalogue and write code in the existing editor.
2. Click **Run**. The output terminal opens and the interactive service starts the program.
3. Compiler diagnostics appear during compilation; runtime stdout and stderr stream into the same terminal with separate visual styles.
4. When the program requests input, type directly on the terminal prompt and press **Enter**. Each submitted line is forwarded to the running process stdin; blank lines and spaces are preserved.
5. Continue entering lines for loops, repeated prompts, and conditional input. Multi-line paste is forwarded as a block with its line breaks intact.
6. Press **Ctrl+D** on an empty terminal line to send EOF where the language/runtime supports it. Press **Ctrl+C** to stop the current run.

## Execution modes
- **Interactive mode:** requires `INTERACTIVE_GATEWAY_URL` and `INTERACTIVE_TICKET_SECRET` on the web service, plus the same ticket secret on the separately deployed Docker gateway. It provides live PTY-backed stdin/stdout/stderr streaming.
- **Batch fallback:** retained only for programs that do not appear to read stdin. Batch providers receive stdin before execution and cannot accept new keyboard input after the process starts. If an input-driven program is detected while the live gateway is unavailable, the terminal reports that interactive execution is unavailable; it never opens a separate stdin box or silently pretends the process is interactive.

## Language coverage
The compiler catalogue contains **55 languages**. `runner/languages.json` now has a runtime entry for every catalogue ID (61 total entries including non-catalogue compatibility aliases). The runtime image performs a strict executable-presence check and a 55-language compile/launch smoke test during its Docker build. The image must build successfully before claiming all 55 languages are deployable. The separate interactive PTY suite also checks repeated line input, prompts without newlines, spaces, blank lines, Unicode, numeric/character input, and EOF for the tested mainstream runtimes.

## Deployment
The interactive gateway is a separate Docker-backed service; the existing Node web service does not itself launch Docker containers. Build the execution image and gateway image on a dedicated Linux Docker host. Set `INTERACTIVE_GATEWAY_URL=wss://YOUR-GATEWAY-DOMAIN/session` and `INTERACTIVE_TICKET_SECRET` on the web service. Set the identical secret and `EXECUTION_IMAGE=polycompile-exec:latest` on the gateway. Expose the gateway through a TLS reverse proxy with WebSocket upgrade support. See `INTERACTIVE_TERMINAL_DEPLOYMENT.md` for the exact steps and security notes.
