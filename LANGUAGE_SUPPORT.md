# PolyCompile language support and execution scope

PolyCompile's selector contains **55 language entries**. The interactive execution registry now defines a runtime command for every catalogue ID; the registry has 61 entries because it also retains compatibility aliases and helper dialects.

## Execution providers

| Provider | Role | Important limitation |
|---|---|---|
| Judge0 CE | Remote batch execution for mapped languages | Standard API accepts stdin with the submission; it is not a live prompt-by-prompt terminal session |
| Wandbox | Secondary remote batch compiler for mapped languages | Compiler names and availability are provider-controlled; no live PTY stdin |
| Private/self-hosted Piston | Optional batch provider for configured Piston runtimes | Runtime packages and versions must match the registry; ordinary API execution is batch-oriented |
| Interactive Docker gateway | Live PTY-backed stdin/stdout/stderr for the 55-language catalogue | Requires the separately deployed Docker gateway and a successfully built `polycompile-exec` image |
| Built-in Brainfuck VM and development simulators | Specialized offline/development execution paths | Not a replacement for a production sandbox for arbitrary untrusted programs |

The runtime registry is not itself proof that a language is deployable. The Docker image build is now a strict release gate: it checks required executables and compiles/launches one smoke program for each of the 55 catalogue languages. The deployed image must pass that build before the platform advertises all-language execution.

## Interactive input model

The browser terminal sends each submitted line to the already-running process over WebSocket. The execution container allocates a PTY, disables PTY echo, preserves prompt flushing, and streams stdout/stderr back to the terminal. It supports repeated input requests, line-by-line input, blank lines, multi-line paste, and EOF. The local PTY integration suite exercises common C, C++, Java, Python, JavaScript, Go, Swift, Ruby, PHP, and Perl input patterns.

Not every catalogue language has a conventional stdin prompt. SQL and hardware-description languages have their own execution models; GUI applications, arbitrary external libraries, network services, multi-file projects, raw-key terminal UIs, and every possible language feature are outside the scope of a single-file online compiler unless explicitly implemented and tested.

## Security model

Interactive execution uses a fresh container per run, non-root UID, no network, read-only root filesystem, dropped Linux capabilities, `no-new-privileges`, CPU/memory/PID/file-descriptor limits, temporary work directories, output limits, and a hard timeout. The gateway needs Docker socket access, which is equivalent to host-administrator access; it must run on a dedicated, patched host behind a TLS reverse proxy and must not expose the socket publicly.

Production batch execution fails closed when remote providers are unavailable. Do not substitute an unsafe local interpreter and label it as a native compiler result.

## Verification

- `npm test`: project tests and static terminal/security assertions.
- `npm run verify:interactive`: exact coverage check between the 55-language catalogue and runtime registry.
- `npm run verify:interactive:e2e`: live PTY input tests for toolchains installed on the development host.
- `docker build --pull -t polycompile-exec:latest -f runner/Dockerfile .`: strict image build; Dockerfile runs the required-command check and the 55-language compile/launch smoke suite.

A passing catalogue test only proves registry coverage. A successful Docker image build and a deployed gateway test are required before claiming all 55 languages work end to end.
