# PolyCompile live interactive terminal deployment

## Fast local setup (Docker Compose)

The root `docker-compose.yml` now starts the web app and interactive gateway together. It also defines the execution image as a build-only service so the image is built explicitly before the gateway starts.

```bash
cp .env.example .env
# Edit .env and set INTERACTIVE_TICKET_SECRET to: openssl rand -hex 32

docker compose build polycompile-exec-image polycompile-interactive-gateway polycompile
docker compose up -d
docker compose ps
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:3000/health
```

The gateway health endpoint now returns HTTP 503 unless both the Docker daemon is reachable and `polycompile-exec:latest` exists. This prevents a healthy-looking gateway process from being mistaken for a ready compiler service. The web app waits for the gateway readiness check before starting. Open `http://localhost:3000` on the same computer; the browser connects to `ws://localhost:8080/session`.

For access from another device or the public internet, do not use `localhost`: put the gateway behind a TLS reverse proxy and set `INTERACTIVE_GATEWAY_URL` to its public `wss://.../session` address. Keep the Docker socket private.

## Expected terminal behaviour

PolyCompile uses one Output terminal for the complete execution transcript. Program prompts, user-entered values, stdout, compiler diagnostics, and stderr appear in execution order. The program starts before input is requested; each submitted terminal line is sent to the live process over WebSocket.

- Press **Enter** to send the current line, including an empty line.
- Paste multiple lines to send a block while preserving spaces and blank lines.
- Press **Ctrl+D** on an empty prompt to send EOF where supported.
- Press **Ctrl+C** to stop the process and remove its container.
- The runtime uses a PTY so prompts without a trailing newline are flushed before the user responds.
- PTY echo is disabled; the browser echoes each submitted line once, preventing duplicate input.
- The process remains alive between input requests. `scanf`, `cin`, `getline`, Java `Scanner`, Python `input()`, Node `readline`, and equivalent stdin APIs share the same terminal path.

## Language coverage and build gate

The compiler catalogue contains **55 languages**. `runner/languages.json` includes runtime definitions for all 55 catalogue IDs (61 total entries including compatibility aliases). The execution image build now:

1. Installs the toolchains declared by the runtime image.
2. Runs `runner/check-runtimes.sh`, which fails if a required executable is missing.
3. Runs `interactive-runner/runtime-smoke-test.js`, which compiles/launches one program for each of the 55 catalogue languages and checks its expected output.

A successful Docker image build is therefore the release gate for the 55-language smoke suite. The live PTY input suite is `node interactive-runner/test-session-runner.js`; the runtime image build runs it after the 55-language compile/launch suite. It exercises multi-step prompts, spaces, blank lines, Unicode, EOF, numeric token input, JavaScript `readline`/`prompt`, and stream-oriented AWK/sed/jq plus the SQLite shell. The local test suite run in the ChatGPT workspace is not a substitute for building this Docker image or testing it on your deployment host.

## 1. Build the execution runtime image

From the repository root on the dedicated Linux Docker host:

```bash
docker build --pull -t polycompile-exec:latest -f runner/Dockerfile .
```

This image is intentionally large because it carries 55 language toolchains. The build must finish its 55-language smoke test before deployment. If the build fails, do not deploy the image or advertise all-language support; fix the failing runtime package/command and rebuild.

## 2. Build the WebSocket gateway image

```bash
docker build -t polycompile-interactive-gateway:latest -f interactive-runner/Dockerfile .
```

## 3. Generate a shared ticket secret

```bash
openssl rand -hex 32
```

Use the exact same secret on the web service and the gateway. Never commit it to Git or include it in the project ZIP.

## 4. Start the gateway on the Docker host

Use a dedicated, patched Linux host. The gateway requires access to the Docker socket; that socket is effectively host-administrator access. Restrict access to the host, expose the gateway only behind a TLS reverse proxy, and enable WebSocket upgrades.

```bash
docker run -d --name polycompile-interactive-gateway --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e PORT=8080 \
  -e INTERACTIVE_TICKET_SECRET=YOUR_LONG_RANDOM_SECRET \
  -e EXECUTION_IMAGE=polycompile-exec:latest \
  -e MAX_SESSIONS=2 \
  polycompile-interactive-gateway:latest
```

The gateway launches a fresh non-root container per run with no network, read-only root filesystem, dropped Linux capabilities, no-new-privileges, CPU/memory/PID/file-descriptor limits, temporary writable directories, output limits, and a hard timeout. Container removal is explicitly requested on cancellation/disconnect; killing the Docker CLI alone is not treated as sufficient cleanup.

## 5. Configure the web service

Set these environment variables on the existing PolyCompile web service:

- `INTERACTIVE_GATEWAY_URL` = `wss://YOUR-GATEWAY-DOMAIN/session`
- `INTERACTIVE_TICKET_SECRET` = the same secret configured on the gateway

Redeploy the web service. Do not point this URL at the web app itself; the interactive gateway is a separate Docker-backed service.

## 6. Run the verification gates

On the Docker host:

```bash
# Validate that all 55 catalogue IDs have runtime definitions
npm run verify:interactive

# Exercise live PTY stdin locally (requires installed test toolchains)
npm run verify:interactive:e2e

# Rebuild the runtime image; Dockerfile build runs the strict tool check
# and all 55 compile/launch smoke tests automatically.
docker build --pull -t polycompile-exec:latest -f runner/Dockerfile .

# Check gateway health
curl http://127.0.0.1:8080/health
```

Then run these programs through the deployed website, entering input only in the terminal:

**C — numeric, decimal and character input**

```c
#include <stdio.h>
int main(void) {
    int age; double score; char grade;
    printf("Enter age, score and grade: "); fflush(stdout);
    if (scanf("%d %lf %c", &age, &score, &grade) != 3) return 1;
    printf("Received: %d %.1f %c\\n", age, score, grade);
    return 0;
}
```

**C++ — full-line string followed by a number**

```cpp
#include <iostream>
#include <string>
int main() {
    std::string name; int count;
    std::cout << "Enter full name: " << std::flush;
    std::getline(std::cin, name);
    std::cout << "Enter count: " << std::flush;
    std::cin >> count;
    std::cout << "Hello " << name << ", count=" << count << '\\n';
}
```

**Python — repeated line-by-line input**

```python
for i in range(3):
    value = input(f"Value {i + 1}: ")
    print("Received:", value)
```

**Java — Scanner and multiple prompts**

```java
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Name: ");
        String name = sc.nextLine();
        System.out.print("Age: ");
        int age = sc.nextInt();
        System.out.println("Hello " + name + ", age=" + age);
    }
}
```

## Operational notes and honest limitations

- The web service can still use its existing batch providers for programs that do not require interactive stdin. Batch execution is not a substitute for live input.
- The image build test verifies the sample program and toolchain invocation for every catalogue language. It does not prove that every third-party library, GUI framework, network service, multi-file project, or arbitrary language feature is supported.
- The PTY suite verifies common interactive patterns. Terminal input is line-oriented; programs that require raw single-keystroke input, full-screen curses UI, terminal resizing, or custom terminal escape handling need additional PTY features and dedicated tests.
- SQL, HDL simulators, and build/scripting dialects have language-specific execution models; not every one has a meaningful `stdin` prompt.
- Before public hackathon use, run the Docker build gate and deployed test cases on the actual execution host. The current development environment does not have Docker, so a full image build and 55-runtime container test cannot be truthfully reported as completed here.
- For public use, add user authentication, per-user quotas, request rate limits, queueing, audit logs, alerting, and a security review. Do not expose the Docker socket or gateway directly to the public internet.
