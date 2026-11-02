# PolyCompile language support and execution scope

PolyCompile's selector currently contains **55 language entries** and the project includes **54 curated code snippets**. These counts describe the UI/catalogue, not a guarantee that every language is available from every execution provider.

## Execution providers

| Provider | Role | Important limitation |
|---|---|---|
| Judge0 CE | Primary remote compiler for mapped languages | Only languages present in the configured Judge0 instance and mapping can run |
| Wandbox | Secondary remote compiler for mapped languages | Compiler names and availability are provider-controlled |
| Private/self-hosted Piston | Optional provider for languages with a Piston runtime mapping | Runtime packages must be installed and versions must match the registry |
| Built-in Brainfuck VM | Bounded in-process execution | Restricted to Brainfuck and a fixed instruction budget |
| Local interpreter/simulator paths | Development/testing only, explicitly opt-in | Not a secure boundary for arbitrary user code; disabled in production |

The current Judge0 + Wandbox mappings cover 44 of the 55 catalogue entries. Brainfuck is handled by its bounded built-in VM. The remaining entries requiring a configured Piston-compatible runtime or another real provider are: **Ada, Tcl, AWK, Forth, Fish Shell, Verilog, VHDL, PowerShell, Racket, and V (Vlang)**.

Do not advertise an entry as production-executable until it passes an end-to-end compile/run test against the actual provider, including stdin, compile errors, runtime errors, timeouts, and output limits.

## Security model

Production execution fails closed when a remote provider is unavailable. PolyCompile must not substitute a local interpreter/simulator and label that output as a native compiler result. Use a sandbox provider that isolates each submitted program and enforces CPU, memory, process, time, output, filesystem, and network limits.

The `runner/` folder contains a standalone Docker runner prototype. The current Express `ExecutionManager` does **not** invoke it. Its presence does not mean Docker execution is active in the deployed website.

## Detection

Automatic language detection is heuristic. Shared syntax (for example Ruby/Crystal, shell dialects, or short snippets) can be ambiguous. The UI should allow manual language selection when the confidence is low or syntax overlaps.
