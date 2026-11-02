
const fs = require("node:fs");
const { spawn } = require("node:child_process");

const registry = JSON.parse(
  fs.readFileSync("/opt/polycompile/languages.json", "utf8")
);

const MAX_OUTPUT_BYTES = 20000;
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_TIMEOUT_MS = 60000;
const KILL_GRACE_MS = 250;

let input = "";
let requestHandled = false;

process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("error", (error) => {
  if (requestHandled) return;
  requestHandled = true;

  emit({
    stdout: "",
    stderr: `Input error: ${error.message}`,
    exitCode: 2,
    timedOut: false,
  });
});

process.stdin.on("end", async () => {
  if (requestHandled) return;
  requestHandled = true;

  let request;

  try {
    request = JSON.parse(input);
  } catch {
    return emit({
      stdout: "",
      stderr: "Invalid runner request. Expected JSON.",
      exitCode: 2,
      timedOut: false,
    });
  }

  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    return emit({
      stdout: "",
      stderr: "Invalid runner request.",
      exitCode: 2,
      timedOut: false,
    });
  }

  const lang = registry.find(
    (item) => item.id === request.language
  );

  if (!lang) {
    return emit({
      stdout: "",
      stderr: "Unsupported language.",
      exitCode: 2,
      timedOut: false,
    });
  }

  if (
    !Array.isArray(lang.run) ||
    lang.run.length === 0 ||
    (lang.compile !== undefined &&
      (!Array.isArray(lang.compile) || lang.compile.length === 0))
  ) {
    return emit({
      stdout: "",
      stderr: "Invalid language configuration.",
      exitCode: 2,
      timedOut: false,
    });
  }

  const requestedTimeout = Number(request.timeoutMs);
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.max(250, Math.min(requestedTimeout, MAX_TIMEOUT_MS))
    : DEFAULT_TIMEOUT_MS;

  const requestedLimit = Number(request.maxOutputBytes);
  const maxOutputBytes = Number.isFinite(requestedLimit)
    ? Math.max(1024, Math.min(requestedLimit, MAX_OUTPUT_BYTES))
    : MAX_OUTPUT_BYTES;

  const stdin =
    typeof request.stdin === "string" ? request.stdin : "";

  const started = Date.now();

  try {
    // Compilation and execution have separate timeout periods.
    if (lang.compile) {
      const compileResult = await execute(
        lang.compile,
        "",
        timeoutMs,
        maxOutputBytes
      );

      if (
        compileResult.timedOut ||
        compileResult.exitCode !== 0
      ) {
        return emit({
          stdout: compileResult.stdout,
          stderr: compileResult.stderr,
          exitCode: compileResult.exitCode,
          timedOut: compileResult.timedOut,
          compileFailed: true,
          durationMs: Date.now() - started,
        });
      }
    }

    const result = await execute(
      lang.run,
      stdin,
      timeoutMs,
      maxOutputBytes
    );

    emit({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      durationMs: Date.now() - started,
    });
  } catch (error) {
    emit({
      stdout: "",
      stderr: error.message || "Runner execution failed.",
      exitCode: 2,
      timedOut: false,
      durationMs: Date.now() - started,
    });
  }
});

function execute(argv, stdin, timeoutMs, maxBytes) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let totalBytes = 0;
    let timedOut = false;
    let outputLimitReached = false;
    let stopping = false;
    let done = false;
    let timer;
    let killTimer;
    let child;

    const finish = (exitCode) => {
      if (done) return;
      done = true;

      clearTimeout(timer);

      if (killTimer) {
        clearTimeout(killTimer);
      }

      resolve({
        stdout,
        stderr,
        exitCode: Number.isInteger(exitCode) ? exitCode : 1,
        timedOut,
      });
    };

    try {
      // The command and arguments must come from the trusted registry.
      // A separate process group allows timeout cleanup of descendants.
      child = spawn(argv[0], argv.slice(1), {
        cwd: "/work",
        detached: true,
        env: {
          PATH:
            "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          HOME: "/home/runner",
          TMPDIR: "/exec",
          GOCACHE: "/exec/go-cache",
          LANG: "C.UTF-8",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      return resolve({
        stdout: "",
        stderr: error.message || "Failed to start process.",
        exitCode: 127,
        timedOut: false,
      });
    }

    const signalProcessGroup = (signal) => {
      if (!child || !child.pid) return;

      try {
        // Linux: negative PID targets the process group.
        process.kill(-child.pid, signal);
      } catch {
        // Fall back to the direct child.
        try {
          child.kill(signal);
        } catch {
          // The process may already have exited.
        }
      }
    };

    const stopChild = () => {
      if (done || stopping) return;
      stopping = true;

      signalProcessGroup("SIGTERM");

      killTimer = setTimeout(() => {
        if (!done) {
          signalProcessGroup("SIGKILL");
        }
      }, KILL_GRACE_MS);

      killTimer.unref?.();
    };

    const appendOutput = (stream, chunk) => {
      totalBytes += chunk.length;

      const current =
        stream === "stdout" ? stdout : stderr;

      const remaining = Math.max(
        0,
        maxBytes - Buffer.byteLength(current, "utf8")
      );

      let addition = "";

      if (remaining > 0) {
        addition = chunk.toString("utf8");

        // Trim at character boundaries to stay within the byte limit.
        while (
          Buffer.byteLength(addition, "utf8") > remaining
        ) {
          addition = addition.slice(0, -1);
        }
      }

      if (stream === "stdout") {
        stdout += addition;
      } else {
        stderr += addition;
      }

      if (totalBytes > maxBytes && !outputLimitReached) {
        outputLimitReached = true;
        stderr += "\n[output limit reached]";
        stopChild();
      }
    };

    child.stdout.on("data", (chunk) => {
      appendOutput("stdout", chunk);
    });

    child.stderr.on("data", (chunk) => {
      appendOutput("stderr", chunk);
    });

    child.stdin.on("error", (error) => {
      // EPIPE is expected when a process exits without reading stdin.
      if (error.code !== "EPIPE" && !done) {
        stderr += `\nInput pipe error: ${error.message}`;
      }
    });

    child.on("error", (error) => {
      if (!done) {
        stderr += `\n${error.message}`;
        finish(127);
      }
    });

    child.on("close", (code, signal) => {
      if (signal && code === null && !timedOut) {
        stderr += `\nProcess terminated by signal ${signal}.`;
      }

      finish(code);
    });

    timer = setTimeout(() => {
      timedOut = true;
      stopChild();
    }, timeoutMs);

    try {
      child.stdin.end(stdin);
    } catch (error) {
      if (error.code !== "EPIPE" && !done) {
        stderr += `\nInput pipe error: ${error.message}`;
      }
    }
  });
}

function emit(value) {
  try {
    process.stdout.write(JSON.stringify(value) + "\n");
  } catch {
    process.exitCode = 1;
  }
}
