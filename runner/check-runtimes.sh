#!/bin/sh
set -eu
for x in gcc g++ javac java python3 node tsc go rustc ruby php perl lua bash zsh fish dash sed make nim gforth bc jq kotlinc scala mono-csc mono Rscript gfortran fpc ghc ocamlc sbcl guile tclsh sqlite3 octave gdc gnatmake cobc swipl iverilog ghdl clojure erl elixir awk bwbasic nasm ld; do
  if command -v "$x" >/dev/null 2>&1; then echo "OK      $x"; else echo "MISSING $x"; fi
done
