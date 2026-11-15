# PolyCompile correction notes

## Changes in this package

- Kept the existing editor, language catalogue, and integrated output-terminal design.
- Kept live terminal input in the same terminal: programs start first, prompts stream back, and submitted lines are sent to the running process.
- Corrected the Gforth 0.7.3 Docker build step. The previous workaround ignored the whole Makefile recipe, which did not reliably allow installation to continue. The updated step ignores failures only for the optional `libffi.fs`, `cstr.fs`, and `unix/socket.fs` wrapper-generation commands, verifies that the patch matched the generated Makefile, and then runs `make install`.
- Excluded local `.env` secrets, Git history, and editor backup files from this ZIP. Create a fresh `.env` from `.env.example` on your computer.

## Verification performed in this workspace

- `npm test`: passed. Includes 75 core checks and the integrated-terminal/PTY checks; 18 live-input cases passed and the SQL PTY case was skipped because `sqlite3` is not installed in this workspace.
- `npm run verify:interactive`: passed; all 55 catalogue languages have runtime definitions.
- `npm run verify`: passed, 54/54.
- `npm run stress`: passed, 9/9.
- `node --check`: passed for all 33 JavaScript files.
- The Gforth Makefile rewrite was tested against a fixture matching the generated Makefile recipe.

## Important build limitation

A Docker image build was not run in this workspace because Docker is unavailable here. Therefore the Gforth correction is applied and its Makefile transformation is checked, but the full Docker runtime image and its 55-language compile/launch smoke tests still need to be run on your Docker host before deployment.

## Build on Windows PowerShell

From the extracted project folder:

```powershell
Copy-Item .env.example .env
$secret = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
(Get-Content .env -Raw).Replace('REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS', $secret) | Set-Content .env -NoNewline
docker compose build polycompile-exec-image polycompile-interactive-gateway polycompile
docker compose up -d
docker compose ps
```

Then open `http://localhost:3000` and check `http://localhost:8080/health`. The gateway health check must report healthy before live interactive terminal execution can work. Keep `.env` private and never upload it.
