# Programiz-style Input and Output workflow

PolyCompile now presents a dedicated **Input (stdin)** editor above a separate **Output** console, following the familiar online-compiler workflow visible on Programiz: edit source, provide standard input, click Run, and inspect the resulting output.

## User workflow
1. Select the required language (or Auto-Detect).
2. Enter source code in the editor.
3. Enter runtime input in the **Input (stdin)** box. Put each input value on its own line; paste multiple lines when needed.
4. Click **Run & Compile** (or Ctrl+Enter).
5. Read stdout, stderr, and exit status in the Output console.

Input is sent as standard input to the selected execution provider. This is a batch-stdin workflow; it does not promise live, character-by-character stdin streaming after the program has started. A true live interactive session requires a reachable interactive execution gateway with the required language runtimes.

## Deployment
Push the changed files and let the existing Render service deploy. The application uses its configured Judge0/Wandbox/Piston provider for execution; make sure the provider environment variables and network access are configured in Render. Do not enable the unsafe Local Runtime option in production.
