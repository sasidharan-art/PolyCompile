$ErrorActionPreference = 'Stop'
$Image = 'polycompile-runner:latest'
$Cases = [System.Collections.Generic.List[object]]::new()

function Add-Case {
    param(
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][string]$File,
        [Parameter(Mandatory)][string]$Expected,
        [Parameter(Mandatory)][string]$Source,
        [string]$Stdin = ''
    )
    $Cases.Add([pscustomobject]@{ Id = $Id; File = $File; Expected = $Expected; Source = $Source; Stdin = $Stdin })
}

Add-Case -Id 'c' -File 'main.c' -Expected 'C execution works!' -Source @'
#include <stdio.h>
int main(void) { puts("C execution works!"); return 0; }
'@
Add-Case -Id 'cpp' -File 'main.cpp' -Expected 'C++ execution works!' -Source @'
#include <iostream>
int main() { std::cout << "C++ execution works!" << std::endl; }
'@
Add-Case -Id 'java' -File 'Main.java' -Expected 'Java execution works!' -Source @'
public class Main { public static void main(String[] args) { System.out.println("Java execution works!"); } }
'@
Add-Case -Id 'python' -File 'main.py' -Expected 'Python execution works!' -Source @'
print("Python execution works!")
'@
Add-Case -Id 'javascript' -File 'main.js' -Expected 'JavaScript execution works!' -Source @'
console.log("JavaScript execution works!");
'@
Add-Case -Id 'typescript' -File 'main.ts' -Expected 'TypeScript execution works!' -Source @'
console.log("TypeScript execution works!");
'@
Add-Case -Id 'go' -File 'main.go' -Expected 'Go execution works!' -Source @'
package main
import "fmt"
func main() { fmt.Println("Go execution works!") }
'@
Add-Case -Id 'rust' -File 'main.rs' -Expected 'Rust execution works!' -Source @'
fn main() { println!("Rust execution works!"); }
'@
Add-Case -Id 'ruby' -File 'main.rb' -Expected 'Ruby execution works!' -Source @'
puts "Ruby execution works!"
'@
Add-Case -Id 'php' -File 'main.php' -Expected 'PHP execution works!' -Source @'
<?php echo "PHP execution works!\n";
'@
Add-Case -Id 'perl' -File 'main.pl' -Expected 'Perl execution works!' -Source @'
print "Perl execution works!\n";
'@
Add-Case -Id 'lua' -File 'main.lua' -Expected 'Lua execution works!' -Source @'
print("Lua execution works!")
'@
Add-Case -Id 'bash' -File 'main.sh' -Expected 'Bash execution works!' -Source @'
echo "Bash execution works!"
'@
Add-Case -Id 'kotlin' -File 'Main.kt' -Expected 'Kotlin execution works!' -Source @'
fun main() { println("Kotlin execution works!") }
'@
Add-Case -Id 'scala' -File 'Main.scala' -Expected 'Scala execution works!' -Source @'
object Main { def main(args: Array[String]): Unit = println("Scala execution works!") }
'@
Add-Case -Id 'csharp' -File 'Main.cs' -Expected 'C# execution works!' -Source @'
using System;
class Program { static void Main() { Console.WriteLine("C# execution works!"); } }
'@
Add-Case -Id 'r' -File 'main.R' -Expected 'R execution works!' -Source @'
cat("R execution works!\n")
'@
Add-Case -Id 'fortran' -File 'main.f90' -Expected 'Fortran execution works!' -Source @'
program main
print *, "Fortran execution works!"
end program main
'@
Add-Case -Id 'pascal' -File 'main.pas' -Expected 'Pascal execution works!' -Source @'
program Main;
begin
  writeln('Pascal execution works!');
end.
'@
Add-Case -Id 'haskell' -File 'main.hs' -Expected 'Haskell execution works!' -Source @'
main = putStrLn "Haskell execution works!"
'@
Add-Case -Id 'ocaml' -File 'main.ml' -Expected 'OCaml execution works!' -Source @'
print_endline "OCaml execution works!";;
'@
Add-Case -Id 'common-lisp' -File 'main.lisp' -Expected 'Common Lisp execution works!' -Source @'
(format t "Common Lisp execution works!~%")
'@
Add-Case -Id 'scheme' -File 'main.scm' -Expected 'Scheme execution works!' -Source @'
(display "Scheme execution works!") (newline)
'@
Add-Case -Id 'tcl' -File 'main.tcl' -Expected 'Tcl execution works!' -Source @'
puts "Tcl execution works!"
'@
Add-Case -Id 'sql' -File 'main.sql' -Expected 'SQL execution works!' -Source @'
SELECT 'SQL execution works!';
'@
Add-Case -Id 'octave' -File 'main.m' -Expected 'Octave execution works!' -Source @'
disp("Octave execution works!");
'@
Add-Case -Id 'ada' -File 'main.adb' -Expected 'Ada execution works!' -Source @'
with Ada.Text_IO; use Ada.Text_IO;
procedure Main is
begin
  Put_Line ("Ada execution works!");
end Main;
'@
Add-Case -Id 'd' -File 'main.d' -Expected 'D execution works!' -Source @'
import std.stdio;
void main() { writeln("D execution works!"); }
'@
Add-Case -Id 'assembly' -File 'main.asm' -Expected 'Assembly execution works!' -Source @'
global _start
section .data
msg db "Assembly execution works!", 10
len equ $ - msg
section .text
_start:
    mov rax, 1
    mov rdi, 1
    mov rsi, msg
    mov rdx, len
    syscall
    mov rax, 60
    xor rdi, rdi
    syscall
'@
Add-Case -Id 'cobol' -File 'main.cob' -Expected 'COBOL execution works!' -Source @'
       IDENTIFICATION DIVISION.
       PROGRAM-ID. HELLO.
       PROCEDURE DIVISION.
           DISPLAY "COBOL execution works!".
           STOP RUN.
'@
Add-Case -Id 'prolog' -File 'main.pro' -Expected 'Prolog execution works!' -Source @'
main :- writeln('Prolog execution works!').
'@
Add-Case -Id 'verilog' -File 'main.v' -Expected 'Verilog execution works!' -Source @'
module main;
initial begin
  $display("Verilog execution works!");
  $finish;
end
endmodule
'@
Add-Case -Id 'vhdl' -File 'main.vhd' -Expected 'VHDL execution works!' -Source @'
library std;
use std.env.all;
entity main is end entity;
architecture sim of main is
begin
  process
  begin
    report "VHDL execution works!" severity note;
    finish;
    wait;
  end process;
end architecture;
'@
Add-Case -Id 'zsh' -File 'main.zsh' -Expected 'Zsh execution works!' -Source @'
print -r -- "Zsh execution works!"
'@
Add-Case -Id 'clojure' -File 'main.clj' -Expected 'Clojure execution works!' -Source @'
(println "Clojure execution works!")
'@
Add-Case -Id 'erlang' -File 'main.erl' -Expected 'Erlang execution works!' -Source @'
-module(main).
-export([main/0]).
main() -> io:format("Erlang execution works!~n").
'@
Add-Case -Id 'elixir' -File 'main.exs' -Expected 'Elixir execution works!' -Source @'
IO.puts("Elixir execution works!")
'@
Add-Case -Id 'awk' -File 'main.awk' -Expected 'AWK execution works!' -Source @'
BEGIN { print "AWK execution works!" }
'@
Add-Case -Id 'basic' -File 'main.bas' -Expected 'BASIC execution works!' -Source @'
10 PRINT "BASIC execution works!"
20 END
'@
Add-Case -Id 'brainfuck' -File 'main.bf' -Expected 'A' -Source @'
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++.
'@

Add-Case -Id 'nim' -File 'main.nim' -Expected 'Nim execution works!' -Source @'
echo "Nim execution works!"
'@
Add-Case -Id 'forth' -File 'main.fs' -Expected 'Forth execution works!' -Source @'
." Forth execution works!" cr
'@
Add-Case -Id 'fish' -File 'main.fish' -Expected 'Fish execution works!' -Source @'
echo "Fish execution works!"
'@
Add-Case -Id 'jq' -File 'main.jq' -Expected 'jq execution works!' -Source @'
"jq execution works!"
'@
Add-Case -Id 'sed' -File 'main.sed' -Expected 'Sed execution works!' -Stdin "sample input`n" -Source @'
s/.*/Sed execution works!/
'@
Add-Case -Id 'dash' -File 'main.dash' -Expected 'Dash execution works!' -Source @'
printf '%s\n' 'Dash execution works!'
'@
Add-Case -Id 'makefile' -File 'Makefile' -Expected 'Makefile execution works!' -Source @'
.PHONY: all
all:
	@printf '%s\n' 'Makefile execution works!'
'@


$root = Join-Path ([System.IO.Path]::GetTempPath()) ('polycompile-smoke-' + [guid]::NewGuid().ToString('N'))
[void][System.IO.Directory]::CreateDirectory($root)
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$passed = 0
$failed = 0
$results = [System.Collections.Generic.List[object]]::new()

try {
    $null = & docker image inspect $Image 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Docker image '$Image' is not available. Build it first from the runner folder." }

    foreach ($case in $Cases) {
        $dir = Join-Path $root $case.Id
        [void][System.IO.Directory]::CreateDirectory($dir)
        [System.IO.File]::WriteAllText((Join-Path $dir $case.File), $case.Source, $utf8NoBom)
        $payload = @{ language = $case.Id; stdin = $case.Stdin; timeoutMs = 60000; maxOutputBytes = 20000 } | ConvertTo-Json -Compress
        $dockerOutput = @($payload | & docker run --rm -i --network none --memory 768m --cpus 2 --pids-limit 128 --read-only --tmpfs /tmp:rw,exec,nosuid,size=128m,mode=1777 --tmpfs /exec:rw,exec,nosuid,size=128m,mode=1777 --tmpfs /home/runner:rw,nosuid,size=128m,mode=1777 -v "${dir}:/work:ro" $Image)
        $dockerExit = $LASTEXITCODE
        $raw = ($dockerOutput | ForEach-Object { [string]$_ }) -join "`n"
        $ok = $false
        $detail = ''
        if ($dockerExit -ne 0) {
            $detail = "docker exit ${dockerExit}: $raw"
        } else {
            try {
                $result = $raw | ConvertFrom-Json
                $combined = [string]$result.stdout + "`n" + [string]$result.stderr
                $ok = ($result.exitCode -eq 0 -and -not $result.timedOut -and $combined.Contains($case.Expected))
                if (-not $ok) {
                    $detail = "exitCode=$($result.exitCode), timedOut=$($result.timedOut); stdout=$($result.stdout); stderr=$($result.stderr)"
                }
            } catch {
                $detail = "Could not parse runner response: $raw"
            }
        }
        if ($ok) { $passed++; Write-Host ("PASS  {0}" -f $case.Id) -ForegroundColor Green }
        else { $failed++; Write-Host ("FAIL  {0} -- {1}" -f $case.Id, $detail) -ForegroundColor Red }
        $results.Add([pscustomobject]@{ Language = $case.Id; Passed = $ok; Detail = $detail })
    }

    Write-Host "`nResult: $passed passed; $failed failed; $($Cases.Count) total."
    $reportPath = Join-Path (Get-Location) 'language-smoke-results.csv'
    $results | Export-Csv -NoTypeInformation -Encoding UTF8 $reportPath
    Write-Host "Detailed report: $reportPath"
    if ($failed -gt 0) { exit 1 }
} finally {
    Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}
