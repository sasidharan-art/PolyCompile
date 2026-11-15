# syntax=docker/dockerfile:1
# PolyCompile interactive runtime image — BuildKit multi-stage build.
# Each slow toolchain is isolated so Docker's layer cache is re-used on every
# incremental rebuild that touches only later stages.
#
# Build:
#   DOCKER_BUILDKIT=1 docker build -f runner/Dockerfile -t polycompile-exec .
# Or via Compose:
#   docker compose build polycompile-exec-image

# ---------------------------------------------------------------------------
# Stage 1 – base: apt packages that rarely change
# ---------------------------------------------------------------------------
FROM swift:6.4.1-trixie AS base

ENV DEBIAN_FRONTEND=noninteractive \
    DOTNET_ROOT=/usr/share/dotnet \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    DOTNET_NOLOGO=1 \
    DART_SDK=/usr/lib/dart \
    PATH=/usr/local/swift/usr/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/share/dotnet:/usr/lib/dart/bin:/opt/zig:/opt/julia/bin:/opt/vlang

# --mount=type=cache keeps the apt cache across builds so re-installing on a
# changed RUN line does not re-download every package from scratch.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      bash zsh dash mawk gawk fish util-linux \
      ca-certificates curl wget gnupg git xz-utils unzip zip make minisign \
      coreutils gcc g++ clang binutils nasm gobjc libobjc-14-dev \
      gnustep-make libgnustep-base-dev \
      libtool libtool-bin libltdl-dev libffi-dev \
      openjdk-21-jdk-headless python3 nodejs npm golang-go rustc ruby php-cli perl lua5.4 \
      kotlin scala mono-devel r-base-core \
      gfortran fp-compiler ghc ocaml-nox sbcl guile-3.0 tcl \
      sqlite3 octave gdc gnat gnucobol3 swi-prolog-nox \
      iverilog ghdl clojure erlang-base elixir bwbasic \
      jq sed bc groovy racket crystal \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Stage 2 – gforth + nim: both slow/rare-change installs, cached together
# ---------------------------------------------------------------------------
FROM base AS nim-stage

# Gforth is not in Debian 13 (Trixie); build from GNU release source.
ARG GFORTH_VERSION=0.7.3
RUN set -eux; \
    curl -fsSL "https://ftp.gnu.org/gnu/gforth/gforth-${GFORTH_VERSION}.tar.gz" -o /tmp/gforth.tar.gz; \
    mkdir -p /tmp/gforth-src; tar -xzf /tmp/gforth.tar.gz -C /tmp/gforth-src --strip-components=1; \
    cd /tmp/gforth-src; \
    grep -q 'for i in $(LIBCC_BUILD_SRC); do' Makefile.in; \
    sed -i '/for i in $(LIBCC_BUILD_SRC); do/ s/; done$/; done || true/' Makefile.in; \
    grep -F 'for i in $(LIBCC_BUILD_SRC); do' Makefile.in | grep -Fq 'done || true'; \
    ./configure --prefix=/usr/local; \
    make -j1; \
    make install; \
    rm -rf /tmp/gforth-src /tmp/gforth.tar.gz; \
    command -v gforth; \
    gforth --version

# Install Nim with choosenim, then copy the real compiler toolchain into a
# world-readable path.  chmod -R 0755 on the bin dir ensures uid=10001 (runner)
# can execute nim without a "Permission denied" (exit 126) error.
ENV CHOOSENIM_NO_ANALYTICS=1
RUN set -eux; \
    curl -fsSL https://nim-lang.org/choosenim/init.sh -o /tmp/choosenim-init.sh; \
    sh /tmp/choosenim-init.sh -y; \
    NIM_COMPILER="$(find /root/.choosenim/toolchains -type f -path '*/bin/nim' -perm /111 -print -quit)"; \
    test -n "$NIM_COMPILER"; \
    NIM_TOOLCHAIN="$(dirname "$(dirname "$NIM_COMPILER")")"; \
    install -d -m 0755 /opt/nim; \
    cp -a "$NIM_TOOLCHAIN" /opt/nim/toolchain; \
    chmod -R 0755 /opt/nim/toolchain/bin; \
    chmod -R a+rX /opt/nim; \
    ln -sf /opt/nim/toolchain/bin/nim /usr/local/bin/nim; \
    /usr/local/bin/nim --version; \
    su -s /bin/sh nobody -c "nim --version"; \
    rm -f /tmp/choosenim-init.sh

# ---------------------------------------------------------------------------
# Stage 3 – dart + .net: official installers, slow on first pull
# ---------------------------------------------------------------------------
FROM nim-stage AS dart-dotnet-stage

# Dart SDK (official signed Google apt repository).
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    set -eux; \
    install -d -m 0755 /usr/share/keyrings; \
    curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/dart.gpg; \
    echo 'deb [signed-by=/usr/share/keyrings/dart.gpg arch=amd64] https://storage.googleapis.com/download.dartlang.org/linux/debian stable main' > /etc/apt/sources.list.d/dart_stable.list; \
    apt-get update; apt-get install -y --no-install-recommends dart; \
    rm -rf /var/lib/apt/lists/*

# .NET SDK supplies both F# interactive and the VB.NET compiler/runtime.
RUN set -eux; \
    curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh; \
    bash /tmp/dotnet-install.sh --version 10.0.100 --install-dir /usr/share/dotnet; \
    ln -sf /usr/share/dotnet/dotnet /usr/local/bin/dotnet; \
    rm -f /tmp/dotnet-install.sh

# ---------------------------------------------------------------------------
# Stage 4 – powershell + zig: medium-speed downloads, pinned releases
# ---------------------------------------------------------------------------
FROM dart-dotnet-stage AS ps-zig-stage

# PowerShell (pinned release archive).
ARG POWERSHELL_VERSION=7.5.4
RUN set -eux; \
    mkdir -p /opt/microsoft/powershell/7; \
    curl -fsSL "https://github.com/PowerShell/PowerShell/releases/download/v${POWERSHELL_VERSION}/powershell-${POWERSHELL_VERSION}-linux-x64.tar.gz" -o /tmp/powershell.tar.gz; \
    echo "1fd7983fe56ca9e6233f126925edb24bf6b6b33e356b69996d925c4db94e2fef  /tmp/powershell.tar.gz" | sha256sum -c -; \
    tar -xzf /tmp/powershell.tar.gz -C /opt/microsoft/powershell/7; \
    chmod +x /opt/microsoft/powershell/7/pwsh; \
    ln -sf /opt/microsoft/powershell/7/pwsh /usr/local/bin/pwsh; \
    rm -f /tmp/powershell.tar.gz

# Zig pinned to a stable release so registry command flags remain deterministic.
ARG ZIG_VERSION=0.13.0
RUN set -eux; \
    curl -fsSL "https://ziglang.org/download/${ZIG_VERSION}/zig-linux-x86_64-${ZIG_VERSION}.tar.xz" -o /tmp/zig.tar.xz; \
    curl -fsSL "https://ziglang.org/download/${ZIG_VERSION}/zig-linux-x86_64-${ZIG_VERSION}.tar.xz.minisig" -o /tmp/zig.tar.xz.minisig; \
    minisign -Vm /tmp/zig.tar.xz -P "RWSGOq2NVecA2UPNdBUZykf1CCb147pkmdtYxgb3Ti+JO/wCYvhbAb/U" -x /tmp/zig.tar.xz.minisig; \
    mkdir -p /opt/zig-dist; tar -xJf /tmp/zig.tar.xz -C /opt/zig-dist --strip-components=1; \
    ln -sf /opt/zig-dist/zig /usr/local/bin/zig; \
    rm -rf /tmp/zig.tar.xz /tmp/zig.tar.xz.minisig

# ---------------------------------------------------------------------------
# Stage 5 – julia + v-lang: both slow builds, cached as a unit
# ---------------------------------------------------------------------------
FROM ps-zig-stage AS julia-vlang-stage

# Julia official generic Linux binary (LTS line for reproducible execution).
ARG JULIA_VERSION=1.10.10
RUN set -eux; \
    curl -fsSL "https://julialang-s3.julialang.org/bin/linux/x64/1.10/julia-${JULIA_VERSION}-linux-x86_64.tar.gz" -o /tmp/julia.tar.gz; \
    echo "6a78a03a71c7ab792e8673dc5cedb918e037f081ceb58b50971dfb7c64c5bf81  /tmp/julia.tar.gz" | sha256sum -c -; \
    mkdir -p /opt/julia-dist; tar -xzf /tmp/julia.tar.gz -C /opt/julia-dist --strip-components=1; \
    ln -sf /opt/julia-dist/bin/julia /usr/local/bin/julia; \
    rm -f /tmp/julia.tar.gz

# V compiler built from upstream source with its bundled C backend.
RUN set -eux; \
    git clone --depth 1 --recurse-submodules https://github.com/vlang/v.git /opt/vlang; \
    cd /opt/vlang && make; \
    ln -sf /opt/vlang/v /usr/local/bin/v

# ---------------------------------------------------------------------------
# Stage 6 – app: npm global packages + user setup + app files (fast to rebuild)
# ---------------------------------------------------------------------------
FROM julia-vlang-stage AS app

RUN npm install --global typescript@5.9.3

RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin runner \
    && mkdir -p /work /home/runner /opt/polycompile /exec \
    && chown -R runner:runner /work /home/runner /exec \
    && chmod 1777 /exec

COPY runner/runner.js          /opt/polycompile/runner.js
COPY runner/brainfuck.js       /opt/polycompile/brainfuck.js
COPY runner/js-runner.js       /opt/polycompile/js-runner.js
COPY runner/languages.json     /opt/polycompile/languages.json
COPY runner/languages.json     /opt/languages.json
COPY interactive-runner/session-runner.js          /opt/session-runner.js
COPY runner/check-runtimes.sh                      /opt/check-runtimes.sh
COPY interactive-runner/runtime-smoke-test.js      /opt/runtime-smoke-test.js
COPY interactive-runner/runtime-smoke-tests.json   /opt/runtime-smoke-tests.json
COPY interactive-runner/test-session-runner.js     /opt/test-session-runner.js

RUN chown -R root:root /opt/polycompile /opt/session-runner.js /opt/languages.json /opt/check-runtimes.sh \
    && chmod -R 0555 /opt/polycompile \
    && chmod 0555 /opt/session-runner.js /opt/check-runtimes.sh /opt/runtime-smoke-test.js /opt/test-session-runner.js \
    && chmod 0444 /opt/runtime-smoke-tests.json

# ---------------------------------------------------------------------------
# Stage 7 – verify: smoke tests run as the restricted runner user (uid=10001)
# ---------------------------------------------------------------------------
FROM app AS final

USER 10001:10001
ENV POLYCOMPILE_LANGUAGE_REGISTRY=/opt/languages.json
WORKDIR /work

# Fail the image build unless every catalogue language actually compiles/starts
# and emits its expected smoke-test output in the sandbox runtime.
RUN node /opt/runtime-smoke-test.js

ENV POLYCOMPILE_SESSION_RUNNER=/opt/session-runner.js \
    POLYCOMPILE_JS_RUNNER=/opt/polycompile/js-runner.js \
    POLYCOMPILE_BRAINFUCK_RUNNER=/opt/polycompile/brainfuck.js

RUN node /opt/test-session-runner.js

ENTRYPOINT ["node", "/opt/polycompile/runner.js"]
