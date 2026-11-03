FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Keep the established broad-runtime install layer intact so Docker can reuse
# the user's existing cache; install only the newly-added runtimes separately.
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash zsh dash mawk gawk util-linux \
    ca-certificates coreutils make gcc g++ binutils nasm \
    openjdk-17-jdk-headless python3 nodejs npm \
    golang-go rustc ruby php-cli perl lua5.4 \
    kotlin scala mono-devel r-base-core \
    gfortran fp-compiler ghc ocaml-nox sbcl guile-3.0 tcl \
    sqlite3 octave gdc gnat gnucobol3 swi-prolog-nox \
    iverilog ghdl clojure erlang-base elixir bwbasic \
    curl wget unzip \
    && rm -rf /var/lib/apt/lists/*

# Extra language targets added in the 48-language upgrade.
RUN apt-get update && apt-get install -y --no-install-recommends \
    fish bc jq gforth nim \
    && rm -rf /var/lib/apt/lists/*

RUN npm install --global typescript

RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin runner \
    && mkdir -p /work /home/runner /opt/polycompile /exec \
    && chown -R runner:runner /work /home/runner /exec \
    && chmod 1777 /exec

COPY runner/runner.js /opt/polycompile/runner.js
COPY runner/brainfuck.js /opt/polycompile/brainfuck.js
COPY runner/languages.json /opt/polycompile/languages.json
COPY runner/languages.json /opt/languages.json

RUN chown -R root:root /opt/polycompile \
    && chmod -R 0555 /opt/polycompile

USER 10001:10001
WORKDIR /work
ENTRYPOINT ["node", "/opt/polycompile/runner.js"]

# Interactive sessions use the same pinned language runtime image, but each
# session is launched as a fresh, isolated container by interactive-runner/gateway.js.
COPY interactive-runner/session-runner.js /opt/session-runner.js
