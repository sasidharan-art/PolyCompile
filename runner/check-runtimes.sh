#!/bin/sh
set -eu
missing=0
for x in \
  gcc g++ javac java python3 node tsc go rustc ruby php perl lua bash zsh fish dash sed make nim gforth bc jq \
  kotlinc scala scalac mono-csc mono Rscript gfortran fpc ghc ocamlc sbcl guile tclsh sqlite3 octave gdc gnatmake cobc swipl \
  iverilog vvp ghdl clojure erl erlc elixir awk bwbasic nasm ld \
  swiftc zig julia dart groovy dotnet crystal clang gnustep-config pwsh racket v; do
  if command -v "$x" >/dev/null 2>&1; then
    printf 'OK      %s\n' "$x"
  else
    printf 'MISSING %s\n' "$x"
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  echo 'One or more required PolyCompile language toolchains are missing.' >&2
  exit 1
fi
