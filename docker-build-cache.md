# Docker Build Cache Guide — PolyCompile

## Overview

The `runner/Dockerfile` uses **BuildKit multi-stage builds** to separate slow
toolchain installs into distinct cache layers.  On typical rebuilds you only
pay the cost of the stages that actually changed.

```
Stage 1  base          apt packages          ~3 min   (rarely changes)
Stage 2  nim-stage     Gforth + Nim          ~8 min   (rarely changes)
Stage 3  dart-dotnet   Dart + .NET           ~5 min   (pin version to cache)
Stage 4  ps-zig        PowerShell + Zig      ~3 min   (pin version to cache)
Stage 5  julia-vlang   Julia + V lang        ~10 min  (rarely changes)
Stage 6  app           npm global + files    ~1 min   (changes with app files)
Stage 7  final         smoke tests           ~2 min   (depends on stage 6)
```

---

## Full Build

```bash
# Via Docker Compose (recommended)
docker compose build polycompile-exec-image

# Or directly with BuildKit enabled
DOCKER_BUILDKIT=1 docker build -f runner/Dockerfile -t polycompile-exec .
```

> [!NOTE]
> The first full build fetches all toolchains and takes **30–40 minutes**.
> Subsequent builds re-use cached stages and typically finish in **1–3 minutes**
> when only application files (`runner/*.js`, `runner/languages.json`, etc.) changed.

---

## Incremental Rebuild (app files only changed)

When you edit `runner/runner.js`, `runner/languages.json`, or other app-layer
files, Docker only re-runs **Stage 6 (app)** and **Stage 7 (final)**.

```bash
# This completes in ~3 minutes even with no local cache on the toolchain stages,
# because the intermediate stage images are already cached by Docker.
DOCKER_BUILDKIT=1 docker build -f runner/Dockerfile -t polycompile-exec .
```

---

## BuildKit Setup

### Enable BuildKit globally

Add to `~/.docker/daemon.json` (or Docker Desktop → Settings → Docker Engine):

```json
{
  "features": {
    "buildkit": true
  }
}
```

### Enable per-command

```bash
export DOCKER_BUILDKIT=1
docker build ...
```

### Compose (v2+)

BuildKit is enabled by default in Docker Compose v2.  If you use the legacy
`docker-compose` binary, prefix with:

```bash
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build
```

---

## Apt Layer Cache (BuildKit cache mounts)

The base and Dart stages use `--mount=type=cache` so the apt package cache is
**shared across builds without being baked into the image layer**:

```dockerfile
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y ...
```

This means repeated apt installs skip the network download for packages already
in the host's BuildKit cache volume.

---

## Forcing a Clean Rebuild

```bash
# Invalidate all caches (use sparingly — full 30-40 min build)
DOCKER_BUILDKIT=1 docker build --no-cache -f runner/Dockerfile -t polycompile-exec .

# Invalidate only from a specific stage onward (e.g. after bumping JULIA_VERSION)
DOCKER_BUILDKIT=1 docker build \
  --build-arg JULIA_VERSION=1.11.0 \
  -f runner/Dockerfile -t polycompile-exec .
```

---

## Pinning Versions for Cache Stability

| ARG                | Default     | Controls cache layer |
|--------------------|-------------|----------------------|
| `GFORTH_VERSION`   | `0.7.3`     | Stage 2              |
| `POWERSHELL_VERSION` | `7.5.4`   | Stage 4              |
| `ZIG_VERSION`      | `0.13.0`    | Stage 4              |
| `JULIA_VERSION`    | `1.10.10`   | Stage 5              |

Bump an ARG only when you need a newer version; this intentionally invalidates
only that stage and everything after it.

---

## Nim Permission Fix

The original image had `nim: exit=126 Permission denied` because the choosenim
toolchain was not executable by uid=10001 (runner).

**Fix applied in Stage 2:**

```dockerfile
cp -a "$NIM_TOOLCHAIN" /opt/nim/toolchain
chmod -R 0755 /opt/nim/toolchain/bin   # <-- ensures executability for all UIDs
chmod -R a+rX /opt/nim
ln -sf /opt/nim/toolchain/bin/nim /usr/local/bin/nim
```

The smoke-test `su -s /bin/sh nobody -c "nim --version"` in Stage 2 verifies
this at build time.

---

## Rust — Separate Compile & Run

`runner/languages.json` for Rust now uses separate `compile` and `run` keys:

```json
"compile": ["rustc", "/work/main.rs", "-o", "/exec/program"],
"run": ["/exec/program"]
```

This lets the runner report compilation errors separately from runtime errors,
and avoids running a login shell (`sh -lc`) just to chain two commands.
