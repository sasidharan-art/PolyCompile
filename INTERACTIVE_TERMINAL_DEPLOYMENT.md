# PolyCompile live interactive terminal deployment

## Expected terminal behaviour

PolyCompile uses one Output terminal for the complete execution transcript. Program prompts, user-entered values, stdout, and stderr appear in the same order as they occur. The program starts before input is requested; input is sent to the running process over WebSocket.

- Press **Enter** to send the current input line (including an empty line).
- Paste multiple lines to send a multi-line stdin block without losing spaces or blank lines.
- Press **Ctrl+D** on an empty input line to send EOF.
- The runtime uses a pseudo-terminal (PTY), so prompts without a trailing newline are flushed and shown before the user responds.
- C `scanf`, C++ `cin` / `getline`, Java `Scanner`, Python `input()`, and equivalent line-based stdin APIs use the same terminal path.

## Architecture and deployment requirement

The existing Render Node web service remains the UI and API. It cannot safely launch per-run Docker containers itself. The interactive execution gateway must run on a separate Docker-capable Linux host (VPS or equivalent). The runtime image contains the 47 languages registered in `runner/languages.json`. The compiler dropdown currently has 54 language IDs; 13 IDs (`swift`, `lisp`, `zig`, `julia`, `dart`, `groovy`, `fsharp`, `crystal`, `objectivec`, `vbnet`, `powershell`, `racket`, `vlang`) still need interactive runtime definitions/toolchains. Those entries must not be described as live-interactive until added to the runtime image.

### 1. Build the isolated execution image

From the repository root on the Docker host:

```bash
docker build -t polycompile-exec:latest -f runner/Dockerfile .
```

### 2. Build the WebSocket gateway image

```bash
docker build -t polycompile-interactive-gateway:latest -f interactive-runner/Dockerfile .
```

### 3. Generate one shared ticket secret

```bash
openssl rand -hex 32
```

Use the exact same secret value on the Render web service and the gateway host. Do not commit it to Git.

### 4. Start the gateway on the Docker host

Replace `YOUR_LONG_RANDOM_SECRET` with the generated value. Put a TLS reverse proxy (Caddy/Nginx) in front of port 8080 and enable WebSocket upgrades. Expose only the reverse proxy publicly.

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

**Security warning:** access to `/var/run/docker.sock` is effectively host-administrator access. Use a dedicated, patched host; restrict inbound traffic to the reverse proxy; and protect the gateway with TLS. The execution containers run as non-root, with no network, read-only root filesystem, resource limits, and temporary per-run filesystems.

### 5. Configure the existing Render web service

Add these environment variables to the existing PolyCompile Render Web Service:

- `INTERACTIVE_GATEWAY_URL` = `wss://YOUR-GATEWAY-DOMAIN/session`
- `INTERACTIVE_TICKET_SECRET` = the exact same secret used by the gateway

Save and redeploy the existing web service. Do not set the gateway URL to the Render app's own `/session` route; the gateway is a separate Docker-backed service.

### 6. Verify the deployed terminal

Run these examples in the website:

**Python**

```python
name = input("Enter your name: ")
print("Hello", name)
```

**C**

```c
#include <stdio.h>
int main(void) {
    int a, b;
    printf("Enter two numbers: ");
    if (scanf("%d %d", &a, &b) != 2) return 1;
    printf("Sum = %d\\n", a + b);
    return 0;
}
```

**C++**

```cpp
#include <iostream>
#include <string>
int main() {
    std::string name;
    std::cout << "Enter full name: ";
    std::getline(std::cin, name);
    std::cout << "Hello " << name << '\\n';
}
```

**Java**

```java
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Enter a number: ");
        int n = sc.nextInt();
        System.out.println("Square = " + n * n);
    }
}
```

The `npm run verify:interactive` check validates all 47 configured runtime entries, source filenames, compile/run command shapes, the PTY dependency, runtime-image files, and non-root writable tmpfs settings; it also prints any compiler catalog IDs that lack live runtime definitions. The main test suite and 54-snippet verification remain separate checks. End-to-end execution of every language must be tested on the deployed Docker gateway because the Render web process does not contain the language toolchains or Docker daemon.

## Operational notes

- The `/api/execute` cloud batch endpoint remains available as a fallback. If the interactive gateway is not configured, programs that do not read stdin run automatically through batch execution; programs detected as stdin-driven show an inline input area and submit that input with the batch request. This fallback is not live prompt-by-prompt input. The Run & Compile UI automatically switches back to true interactive WebSocket execution when the signed gateway is configured.
- The ticket currently is not bound to a user identity because the project does not have an authenticated-user session model for this feature. Add application authentication, per-user quotas, queueing, monitoring, and a security review before opening this service to a large public audience.
