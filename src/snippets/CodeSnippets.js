/**
 * PolyCompile - Code Snippets Library
 * 
 * Preloaded idiomatic code samples across all paradigms and languages:
 * - Structured / Procedural (C, Pascal, Fortran, Ada, BASIC)
 * - Unstructured (x86 Assembly, Brainfuck)
 * - Object-Oriented (Java, C++, C#, Kotlin, Ruby, Swift, Scala)
 * - Functional (Haskell, Clojure, Elixir, OCaml, Lisp/Scheme)
 * - Scripting (Python, JavaScript, TypeScript, PHP, Perl, Lua, Bash)
 * - Systems (Rust, Go, Zig)
 * - Declarative (SQL, Prolog, R)
 */

const SNIPPETS = [
  // ==========================================
  // STRUCTURED / PROCEDURAL
  // ==========================================
  {
    id: 'c-quick-sort',
    languageId: 'c',
    paradigm: 'Structured / Procedural',
    title: 'C: Fibonacci & Procedural Memory Computation',
    code: `#include <stdio.h>

long long fibonacci(int n) {
    if (n <= 1) return n;
    long long a = 0, b = 1, temp;
    for (int i = 2; i <= n; i++) {
        temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

int main(void) {
    printf("--- PolyCompile: C Procedural Execution ---\\n");
    for (int i = 0; i <= 10; i++) {
        printf("Fibonacci(%2d) = %lld\\n", i, fibonacci(i));
    }
    return 0;
}`
  },
  {
    id: 'pascal-structured',
    languageId: 'pascal',
    paradigm: 'Structured / Procedural',
    title: 'Pascal: Structured Block & Factorial Computation',
    code: `program FactorialCalculation;
var
  i, n: integer;
  fact: int64;

function CalculateFactorial(num: integer): int64;
var
  j: integer;
  resultVal: int64;
begin
  resultVal := 1;
  for j := 2 to num do
    resultVal := resultVal * j;
  CalculateFactorial := resultVal;
end;

begin
  writeln('--- PolyCompile: Pascal Structured Programming ---');
  n := 8;
  fact := CalculateFactorial(n);
  writeln('Factorial of ', n, ' is: ', fact);
end.`
  },
  {
    id: 'fortran-matrix',
    languageId: 'fortran',
    paradigm: 'Structured / Procedural',
    title: 'Fortran: Scientific Numerical Computation',
    code: `program MatrixCompute
  implicit none
  integer, parameter :: N = 5
  integer :: i, total_sum
  real :: average

  total_sum = 0
  do i = 1, N
    total_sum = total_sum + (i * i)
  end do

  average = real(total_sum) / real(N)
  print *, "--- PolyCompile: Fortran Scientific Pipeline ---"
  print *, "Sum of squares (1 to 5):", total_sum
  print *, "Mean square value:", average
end program MatrixCompute`
  },
  {
    id: 'ada-safety',
    languageId: 'ada',
    paradigm: 'Structured / Procedural',
    title: 'Ada: Strongly-Typed Safety-Critical Routine',
    code: `with Ada.Text_IO;
with Ada.Integer_Text_IO;

procedure Main is
   Sum : Integer := 0;
begin
   Ada.Text_IO.Put_Line("--- PolyCompile: Ada Structured Reliability ---");
   for I in 1 .. 10 loop
      Sum := Sum + I;
   end loop;
   Ada.Text_IO.Put("Sum 1..10 = ");
   Ada.Integer_Text_IO.Put(Sum);
   Ada.Text_IO.New_Line;
end Main;`
  },
  {
    id: 'basic-classic',
    languageId: 'basic',
    paradigm: 'Structured / Procedural',
    title: 'BASIC: Classic Block Iteration',
    code: `#lang "fblite"
PRINT "--- PolyCompile: BASIC Structured Demo ---"
TOTAL = 0
FOR I = 1 TO 10
  TOTAL = TOTAL + I
  PRINT "Step I = "; I
NEXT I
PRINT "Final Cumulative Sum = "; TOTAL
END`
  },

  // ==========================================
  // UNSTRUCTURED & ESOTERIC
  // ==========================================
  {
    id: 'assembly-x86',
    languageId: 'assembly',
    paradigm: 'Unstructured / Low-Level',
    title: 'Assembly (x86/NASM): Direct Register Manipulation',
    code: `; PolyCompile: x86 Low-Level Unstructured Architecture
section .data
    msg db 'Hello from bare-metal x86 Assembly!', 0xA
    len equ $ - msg

section .text
    global _start

_start:
    ; sys_write (rax=1, rdi=1, rsi=msg, rdx=len)
    mov rax, 1
    mov rdi, 1
    mov rsi, msg
    mov rdx, len
    syscall

    ; sys_exit (rax=60, rdi=0)
    mov rax, 60
    mov rdi, 0
    syscall`
  },
  {
    id: 'brainfuck-hello',
    languageId: 'brainfuck',
    paradigm: 'Unstructured / Esoteric',
    title: 'Brainfuck: Turing-Complete Tape Memory (Hello World)',
    code: `++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.`
  },

  // ==========================================
  // OBJECT-ORIENTED PROGRAMMING (OOP)
  // ==========================================
  {
    id: 'java-shapes',
    languageId: 'java',
    paradigm: 'Object-Oriented (OOP)',
    title: 'Java: Class Encapsulation & Polymorphism',
    code: `import java.util.*;

abstract class Shape {
    abstract double getArea();
}

class Circle extends Shape {
    private final double radius;
    public Circle(double r) { this.radius = r; }
    public double getArea() { return Math.PI * radius * radius; }
}

public class Main {
    public static void main(String[] args) {
        System.out.println("--- PolyCompile: Java OOP Polymorphism ---");
        List<Shape> shapes = new ArrayList<>();
        shapes.add(new Circle(5.0));
        shapes.add(new Circle(10.0));
        
        for (int i = 0; i < shapes.size(); i++) {
            System.out.printf("Shape %d Area: %.2f%n", i + 1, shapes.get(i).getArea());
        }
    }
}`
  },
  {
    id: 'cpp-templates',
    languageId: 'cpp',
    paradigm: 'Object-Oriented (OOP)',
    title: 'C++: Generic Template & RAII Vector Math',
    code: `#include <iostream>
#include <vector>
#include <numeric>

template <typename T>
class MathStack {
private:
    std::vector<T> data;
public:
    void push(T val) { data.push_back(val); }
    T sum() const {
        return std::accumulate(data.begin(), data.end(), static_cast<T>(0));
    }
};

int main() {
    std::cout << "--- PolyCompile: C++ OOP & Generic Pipeline ---" << std::endl;
    MathStack<int> stack;
    stack.push(10);
    stack.push(20);
    stack.push(30);
    std::cout << "Computed Vector Sum = " << stack.sum() << std::endl;
    return 0;
}`
  },
  {
    id: 'csharp-linq',
    languageId: 'csharp',
    paradigm: 'Object-Oriented (OOP)',
    title: 'C#: LINQ & Object Pipeline',
    code: `using System;
using System.Linq;
using System.Collections.Generic;

public class Program {
    public class User {
        public int Id { get; set; }
        public string Name { get; set; }
        public int Score { get; set; }
        public User(int id, string name, int score) {
            Id = id;
            Name = name;
            Score = score;
        }
    }

    public static void Main() {
        Console.WriteLine("--- PolyCompile: C# .NET OOP Execution ---");
        var users = new List<User> {
            new User(1, "Alice", 95),
            new User(2, "Bob", 82),
            new User(3, "Charlie", 99)
        };

        var topUsers = users.Where(u => u.Score >= 90).OrderByDescending(u => u.Score);
        foreach (var u in topUsers) {
            Console.WriteLine($"Honor Roll: {u.Name} - Score: {u.Score}");
        }
    }
}`
  },
  {
    id: 'kotlin-dataclass',
    languageId: 'kotlin',
    paradigm: 'Object-Oriented (OOP)',
    title: 'Kotlin: Data Classes & Null-Safe Transformation',
    code: `data class Book(val title: String, val pages: Int)

fun main() {
    println("--- PolyCompile: Kotlin JVM Multi-Paradigm ---")
    val library = listOf(
        Book("The Art of Computer Programming", 650),
        Book("Structure and Interpretation", 400),
        Book("Compilers: Principles & Techniques", 1000)
    )
    val totalPages = library.sumOf { it.pages }
    println("Total Library Pages = $totalPages across \${library.size} books.")
}`
  },
  {
    id: 'ruby-oop',
    languageId: 'ruby',
    paradigm: 'Object-Oriented (OOP)',
    title: 'Ruby: Pure Object-Oriented Metaprogramming',
    code: `class Account
  attr_reader :holder, :balance

  def initialize(holder, balance = 0)
    @holder = holder
    @balance = balance
  end

  def deposit(amount)
    @balance += amount
    "Deposited \$#{amount}. New balance: \$#{@balance}"
  end
end

puts "--- PolyCompile: Ruby Pure OOP ---"
acc = Account.new("Alex", 500)
puts acc.deposit(250)
puts "Account owner: #{acc.holder}, Total: \$#{acc.balance}"`
  },

  // ==========================================
  // FUNCTIONAL PROGRAMMING
  // ==========================================
  {
    id: 'haskell-fib',
    languageId: 'haskell',
    paradigm: 'Functional Programming (FP)',
    title: 'Haskell: Pure Lazy Evaluation & Pattern Matching',
    code: `quicksort :: (Ord a) => [a] -> [a]
quicksort [] = []
quicksort (x:xs) =
    let smallerSorted = quicksort [a | a <- xs, a <= x]
        biggerSorted  = quicksort [a | a <- xs, a > x]
    in  smallerSorted ++ [x] ++ biggerSorted

main :: IO ()
main = do
    putStrLn "--- PolyCompile: Haskell Pure Functional Execution ---"
    let numbers = [64, 25, 12, 22, 11]
    putStrLn $ "Unsorted list: " ++ show numbers
    putStrLn $ "Sorted with QuickSort: " ++ show (quicksort numbers)`
  },
  {
    id: 'clojure-immutability',
    languageId: 'clojure',
    paradigm: 'Functional Programming (FP)',
    title: 'Clojure: Persistent Data & Higher-Order Functions',
    code: `(ns polycompile.demo)

(defn square [x] (* x x))

(defn -main []
  (println "--- PolyCompile: Clojure Functional Lisp ---")
  (let [numbers [1 2 3 4 5 6]
        squared (map square numbers)
        evens   (filter even? squared)]
    (println "Original: " numbers)
    (println "Even squares: " (vec evens))
    (println "Sum of squares: " (reduce + evens))))

(-main)`
  },
  {
    id: 'elixir-pipe',
    languageId: 'elixir',
    paradigm: 'Functional Programming (FP)',
    title: 'Elixir: Pipe Operator & Concurrent Transformations',
    code: `defmodule Demo do
  def run do
    IO.puts("--- PolyCompile: Elixir Functional BEAM Pipeline ---")
    result = 
      1..10
      |> Enum.map(&(&1 * 3))
      |> Enum.filter(&(&1 > 15))
      |> Enum.sum()

    IO.puts("Piped reduction result = #{result}")
  end
end

Demo.run()`
  },
  {
    id: 'lisp-scheme',
    languageId: 'lisp',
    paradigm: 'Functional Programming (FP)',
    title: 'Common Lisp: Homoiconic S-Expression Evaluation',
    code: `(format t "--- PolyCompile: Lisp S-Expression Execution ---~%")
(defun factorial (n)
  (if (<= n 1)
      1
      (* n (factorial (- n 1)))))

(format t "Factorial of 6 is ~D~%" (factorial 6))`
  },

  // ==========================================
  // DYNAMIC & SCRIPTING
  // ==========================================
  {
    id: 'python-analytics',
    languageId: 'python',
    paradigm: 'Dynamic / Scripting',
    title: 'Python: Data Comprehensions & Generator Pipeline',
    code: `import math

def calculate_primes(limit):
    primes = []
    for num in range(2, limit + 1):
        if all(num % p != 0 for p in primes if p * p <= num):
            primes.append(num)
    return primes

if __name__ == '__main__':
    print("--- PolyCompile: Python Dynamic Execution ---")
    primes_under_50 = calculate_primes(50)
    print(f"Discovered {len(primes_under_50)} prime numbers under 50:")
    print(primes_under_50)
    print(f"Geometric Prime Sum: {sum(primes_under_50)}")`
  },
  {
    id: 'python-dijkstra',
    languageId: 'python',
    paradigm: 'Dynamic / Scripting',
    title: "Python: Dijkstra's Shortest Path Algorithm",
    code: `import heapq

def dijkstra():
    print("--- PolyCompile: Dijkstra's Algorithm ---")
    n = int(input("Enter number of vertices: "))
    m = int(input("Enter number of edges: "))

    graph = [[] for _ in range(n)]

    print("Enter edges (source destination weight):")
    for _ in range(m):
        u, v, w = map(int, input().split())
        graph[u].append((v, w))
        graph[v].append((u, w))

    start = int(input("Enter starting vertex: "))

    dist = [float('inf')] * n
    dist[start] = 0

    pq = [(0, start)]

    while pq:
        current_dist, node = heapq.heappop(pq)

        if current_dist > dist[node]:
            continue

        for neighbor, weight in graph[node]:
            new_dist = current_dist + weight

            if new_dist < dist[neighbor]:
                dist[neighbor] = new_dist
                heapq.heappush(pq, (new_dist, neighbor))

    print(f"\\nShortest distances from vertex {start}:")
    for i in range(n):
        print(f"Vertex {i} -> {dist[i]}")

if __name__ == '__main__':
    dijkstra()`
  },
  {
    id: 'javascript-async',
    languageId: 'javascript',
    paradigm: 'Dynamic / Scripting',
    title: 'JavaScript: Modern ES6 Functional Pipeline',
    code: `console.log("--- PolyCompile: JavaScript V8 Execution ---");

const datasets = [
  { id: 1, name: "Alpha", metric: 88.5 },
  { id: 2, name: "Beta", metric: 94.2 },
  { id: 3, name: "Gamma", metric: 76.8 },
  { id: 4, name: "Delta", metric: 99.1 }
];

const topPerformers = datasets
  .filter(d => d.metric >= 85)
  .map(d => ({ ...d, grade: "A+" }));

console.log("Top Performers:", JSON.stringify(topPerformers, null, 2));
const avgScore = datasets.reduce((acc, curr) => acc + curr.metric, 0) / datasets.length;
console.log(\`Aggregate Average Score: \${avgScore.toFixed(2)}\`);`
  },
  {
    id: 'typescript-typing',
    languageId: 'typescript',
    paradigm: 'Dynamic / Scripting',
    title: 'TypeScript: Strict Interface Contracts & Generics',
    code: `interface CompilerPhase<T> {
  name: string;
  durationMs: number;
  payload: T;
}

function summarizePhase<T>(phase: CompilerPhase<T>): void {
  console.log(\`Phase '\${phase.name}' executed in \${phase.durationMs}ms\`);
}

console.log("--- PolyCompile: TypeScript Static Typecheck ---");
const lexerPhase: CompilerPhase<string[]> = {
  name: "Lexical Scanning",
  durationMs: 4,
  payload: ["IDENTIFIER", "KEYWORD", "OPERATOR"]
};

summarizePhase(lexerPhase);`
  },
  {
    id: 'php-arrays',
    languageId: 'php',
    paradigm: 'Dynamic / Scripting',
    title: 'PHP: Server-Side Dynamic Array Munging',
    code: `<?php
echo "--- PolyCompile: PHP Web Backend Scripting ---\\n";

$languages = [
    ["name" => "C", "paradigm" => "Structured"],
    ["name" => "Rust", "paradigm" => "Systems"],
    ["name" => "Haskell", "paradigm" => "Functional"]
];

foreach ($languages as $lang) {
    echo "Language: " . $lang["name"] . " | Paradigm: " . $lang["paradigm"] . "\\n";
}
?>`
  },
  {
    id: 'lua-tables',
    languageId: 'lua',
    paradigm: 'Dynamic / Scripting',
    title: 'Lua: Lightweight Table Associative Arrays',
    code: `print("--- PolyCompile: Lua Embedded Execution ---")

local inventory = {
    { item = "Compass", weight = 0.5 },
    { item = "Chronometer", weight = 1.2 },
    { item = "Logbook", weight = 0.8 }
}

local totalWeight = 0
for i, entry in ipairs(inventory) do
    totalWeight = totalWeight + entry.weight
    print(string.format("Slot %d: %s (%.1f kg)", i, entry.item, entry.weight))
end

print(string.format("Total Packed Weight: %.2f kg", totalWeight))`
  },
  {
    id: 'bash-pipeline',
    languageId: 'bash',
    paradigm: 'Dynamic / Scripting',
    title: 'Bash: Unix Pipeline & Shell Commands',
    code: `#!/bin/bash
echo "--- PolyCompile: Bash Unix Environment ---"
echo "Host Operating System: $(uname -s 2>/dev/null || echo Windows/Node)"
echo "Listing simulated files:"
for i in {1..5}; do
    echo "Processing batch unit item_$i..."
done
echo "Pipeline complete."`
  },

  // ==========================================
  // SYSTEMS PROGRAMMING
  // ==========================================
  {
    id: 'rust-ownership',
    languageId: 'rust',
    paradigm: 'Systems Programming',
    title: 'Rust: Zero-Cost Abstraction & Memory Safety',
    code: `fn is_prime(n: u64) -> bool {
    if n <= 1 { return false; }
    if n <= 3 { return true; }
    if n % 2 == 0 || n % 3 == 0 { return false; }
    let mut i = 5;
    while i * i <= n {
        if n % i == 0 || n % (i + 2) == 0 { return false; }
        i += 6;
    }
    true
}

fn main() {
    println!("--- PolyCompile: Rust Systems Execution ---");
    let primes: Vec<u64> = (1..50).filter(|&x| is_prime(x)).collect();
    println!("Primes under 50: {:?}", primes);
    println!("Zero GC overhead, compile-time verified memory safety.");
}`
  },
  {
    id: 'go-concurrency',
    languageId: 'go',
    paradigm: 'Systems Programming',
    title: 'Go: Fast Cloud Systems & Goroutines',
    code: `package main

import (
	"fmt"
	"time"
)

func worker(id int, ch chan<- string) {
	time.Sleep(50 * time.Millisecond)
	ch <- fmt.Sprintf("Goroutine %d completed successfully", id)
}

func main() {
	fmt.Println("--- PolyCompile: Go Systems Concurrency ---")
	ch := make(chan string, 3)

	for i := 1; i <= 3; i++ {
		go worker(i, ch)
	}

	for i := 1; i <= 3; i++ {
		msg := <-ch
		fmt.Println("Received:", msg)
	}
	fmt.Println("All goroutines joined.")
}`
  },

  // ==========================================
  // DECLARATIVE / DOMAIN-SPECIFIC
  // ==========================================
  {
    id: 'sql-query',
    languageId: 'sql',
    paradigm: 'Declarative / Logic / Domain',
    title: 'SQL: Relational DDL & Analytical Queries',
    code: `CREATE TABLE compilers (
  id INT,
  name TEXT,
  paradigm TEXT,
  year INT
);

INSERT INTO compilers VALUES (1, 'C', 'Structured', 1972);
INSERT INTO compilers VALUES (2, 'C++', 'Object-Oriented', 1985);
INSERT INTO compilers VALUES (3, 'Haskell', 'Functional', 1990);
INSERT INTO compilers VALUES (4, 'Rust', 'Systems', 2015);
INSERT INTO compilers VALUES (5, 'Python', 'Scripting', 1991);

SELECT * FROM compilers;`
  },
  {
    id: 'swift-demo',
    languageId: 'swift',
    paradigm: 'Object-Oriented (OOP)',
    title: 'Swift: Safe Modern Systems & Structs',
    code: `import Foundation

struct User {
    let name: String
    let role: String
}

let team = [
    User(name: "Ada", role: "Compiler Engineer"),
    User(name: "Linus", role: "Kernel Developer")
]

print("--- PolyCompile: Swift Modern Execution ---")
for member in team {
    print("\\(member.name) -> \\(member.role)")
}`
  },
  {
    id: 'scala-demo',
    languageId: 'scala',
    paradigm: 'Object-Oriented (OOP)',
    title: 'Scala: Functional Object Hybrid',
    code: `object Main {
  def main(args: Array[String]): Unit = {
    println("--- PolyCompile: Scala FP/OOP Execution ---")
    val numbers = List(1, 2, 3, 4, 5)
    val doubled = numbers.map(_ * 2)
    println(s"Doubled list: $doubled")
  }
}`
  },
  {
    id: 'ocaml-demo',
    languageId: 'ocaml',
    paradigm: 'Functional Programming (FP)',
    title: 'OCaml: Expressive Pattern Matching',
    code: `let rec fib n =
  if n <= 1 then n else fib (n - 1) + fib (n - 2)

let () =
  print_endline "--- PolyCompile: OCaml Pure FP ---";
  Printf.printf "Fibonacci(10) = %d\\n" (fib 10)`
  },
  {
    id: 'perl-demo',
    languageId: 'perl',
    paradigm: 'Dynamic / Scripting',
    title: 'Perl: Text Processing & Regular Expressions',
    code: `use strict;
use warnings;

print "--- PolyCompile: Perl Text & Scripting Execution ---\\n";
my %scores = ("Alice" => 95, "Bob" => 87, "Charlie" => 92);
while (my ($name, $score) = each %scores) {
    print "$name achieved score: $score\\n";
}`
  },
  {
    id: 'zig-demo',
    languageId: 'zig',
    paradigm: 'Systems Programming',
    title: 'Zig: Low-Level Robust Systems',
    code: `const std = @import("std");

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    try stdout.print("--- PolyCompile: Zig Systems Execution ---\\n", .{});
    const numbers = [_]i32{ 10, 20, 30, 40 };
    var total: i32 = 0;
    for (numbers) |num| {
        total += num;
    }
    try stdout.print("Total sum: {d}\\n", .{total});
}`
  },
  {
    id: 'prolog-demo',
    languageId: 'prolog',
    paradigm: 'Declarative / Logic / Domain',
    title: 'Prolog: Logic Inference Engine',
    code: `parent(john, mary).
parent(john, tom).
parent(mary, ann).

grandparent(X, Z) :- parent(X, Y), parent(Y, Z).

:- initialization(main).
main :-
    write('--- PolyCompile: Prolog Logic Query ---'), nl,
    ( grandparent(john, ann) -> write('Verified: John is grandparent of Ann.') ; write('Not found') ),
    nl, halt.`
  },
  {
    id: 'r-demo',
    languageId: 'r',
    paradigm: 'Declarative / Logic / Domain',
    title: 'R: Statistical Computing & Vector Math',
    code: `cat("--- PolyCompile: R Statistical Environment ---\\n")
data <- c(12, 15, 23, 42, 56, 78, 90)
cat("Mean:", mean(data), "\\n")
cat("Standard Deviation:", sd(data), "\\n")
cat("Summary Statistics:\\n")
print(summary(data))`
  },
  {
    id: 'cobol-demo',
    languageId: 'cobol',
    paradigm: 'Structured / Procedural',
    title: 'COBOL: Enterprise Business Processing',
    code: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. HELLO-WORLD.
       PROCEDURE DIVISION.
           DISPLAY '--- PolyCompile: COBOL Enterprise Runtime ---'.
           DISPLAY 'PolyCompile Multi-Language Compilation Verified.'.
           STOP RUN.`
  },
  {
    id: 'd-demo',
    languageId: 'd',
    paradigm: 'Systems Programming',
    title: 'D: High-Performance Systems Language',
    code: `import std.stdio;

void main() {
    writeln("--- PolyCompile: D Language Execution ---");
    int[] nums = [1, 2, 3, 4, 5];
    int sum = 0;
    foreach (n; nums) {
        sum += n;
    }
    writeln("Calculated Sum: ", sum);
}`
  },
  {
    id: 'nim-demo',
    languageId: 'nim',
    paradigm: 'Systems Programming',
    title: 'Nim: Pythonic Syntax with C Performance',
    code: `echo "--- PolyCompile: Nim High-Performance Execution ---"
proc sumRange(first: int, last: int): int =
  var total = 0
  for i in first..last:
    total += i
  result = total
let message = "Hello from Nim!"
echo message
echo "Sum 1..5 is: ", sumRange(1, 5)`
  },
  {
    id: 'erlang-demo',
    languageId: 'erlang',
    paradigm: 'Functional Programming (FP)',
    title: 'Erlang: Concurrent Actor Model',
    code: `-module(main).
-export([main/1]).

main(_Args) ->
    io:format("--- PolyCompile: Erlang Distributed Actor Engine ---~n"),
    io:format("Hello from Erlang OTP!~n").`
  },
  {
    id: 'scheme-demo',
    languageId: 'scheme',
    paradigm: 'Functional Programming (FP)',
    title: 'Scheme: Minimalist Lisp Dialect',
    code: `(display "--- PolyCompile: Scheme S-Expression Runtime ---")
(newline)
(define (factorial n)
  (if (<= n 1)
      1
      (* n (factorial (- n 1)))))
(display "Factorial 5 = ")
(display (factorial 5))
(newline)`
  },
  {
    id: 'tcl-demo',
    languageId: 'tcl',
    paradigm: 'Dynamic / Scripting',
    title: 'Tcl: Tool Command Language Scripting',
    code: `puts "--- PolyCompile: Tcl Scripting Runtime ---"
set greeting "Hello, PolyCompile!"
puts $greeting
set sum 0
for {set i 1} {$i <= 5} {incr i} {
    set sum [expr {$sum + $i}]
}
puts "Sum 1..5: $sum"`
  },
  {
    id: 'awk-demo',
    languageId: 'awk',
    paradigm: 'Dynamic / Scripting',
    title: 'AWK: Stream Text & Pattern Processor',
    code: `BEGIN {
    print "--- PolyCompile: AWK Pattern Processor ---"
    total = 0
    for (i = 1; i <= 5; i++) {
        total += i
    }
    print "Processed sum (1..5): " total
}`
  },
  {
    id: 'forth-demo',
    languageId: 'forth',
    paradigm: 'Unstructured / Low-Level',
    title: 'Forth: Stack-Based Execution',
    code: `cr ." --- PolyCompile: Forth Stack-Based Execution ---" cr
5 3 + . cr
bye`
  },
  {
    id: 'fish-demo',
    languageId: 'fish',
    paradigm: 'Dynamic / Scripting',
    title: 'Fish Shell: Friendly Interactive Scripting',
    code: `echo "--- PolyCompile: Fish Shell Runtime ---"
set -l items alpha beta gamma
for item in $items
    echo "Item: $item"
end`
  },
  {
    id: 'octave-demo',
    languageId: 'octave',
    paradigm: 'Declarative / Logic / Domain',
    title: 'GNU Octave / MATLAB: Matrix Computation',
    code: `disp("--- PolyCompile: GNU Octave Matrix Engine ---");
A = [1, 2; 3, 4];
B = [5, 6; 7, 8];
C = A * B;
disp("Matrix Multiplication Result:");
disp(C);`
  },
  {
    id: 'verilog-demo',
    languageId: 'verilog',
    paradigm: 'Declarative / Logic / Domain',
    title: 'Verilog: Hardware Description Language (HDL)',
    code: `module test;
  initial begin
    $display("--- PolyCompile: Verilog HDL Simulation ---");
    $display("Clock and Register State: OK");
    $finish;
  end
endmodule`
  },
  {
    id: 'vhdl-demo',
    languageId: 'vhdl',
    paradigm: 'Declarative / Logic / Domain',
    title: 'VHDL: Hardware Description Language',
    code: `use std.textio.all;

entity test is
end test;

architecture sim of test is
begin
  process
    variable l : line;
  begin
    write(l, string'("--- PolyCompile: VHDL Simulation ---"));
    writeline(output, l);
    wait;
  end process;
end sim;`
  },
  {
    id: 'julia-demo',
    languageId: 'julia',
    paradigm: 'Declarative / Logic / Domain',
    title: 'Julia: High-Performance Numerical Computing',
    code: `println("--- PolyCompile: Julia Scientific Computing ---")
matrix_a = [1 2; 3 4]
matrix_b = [5 6; 7 8]
result = matrix_a * matrix_b
println("Matrix Multiplication:")
println(result)
println("Computed Matrix Sum = ", sum(result))`
  },
  {
    id: 'dart-demo',
    languageId: 'dart',
    paradigm: 'Object-Oriented (OOP)',
    title: 'Dart: Modern Multi-Platform Application',
    code: `void main() {
  print('--- PolyCompile: Dart Client/Server Runtime ---');
  final numbers = [1, 2, 3, 4, 5];
  final sum = numbers.reduce((a, b) => a + b);
  print('Calculated sum 1..5: $sum');
  print('Dart Application Verified.');
}`
  },
  {
    id: 'groovy-demo',
    languageId: 'groovy',
    paradigm: 'Object-Oriented (OOP)',
    title: 'Groovy: JVM Dynamic Scripting',
    code: `println "--- PolyCompile: Apache Groovy Execution ---"
def numbers = [10, 20, 30, 40]
def total = numbers.sum()
println "Sum of items: $total"
println "Hello from Groovy on JVM!"`
  },
  {
    id: 'fsharp-demo',
    languageId: 'fsharp',
    paradigm: 'Functional Programming (FP)',
    title: 'F#: Functional .NET First-Class Pipeline',
    code: `open System

[<EntryPoint>]
let main argv =
    printfn "--- PolyCompile: F# Functional Programming ---"
    let numbers = [1..10]
    let sum = List.sum numbers
    printfn "Sum 1..10 = %d" sum
    printfn "Result = %d" sum
    0`
  },
  {
    id: 'crystal-demo',
    languageId: 'crystal',
    paradigm: 'Systems Programming',
    title: 'Crystal: Fast as C, Slick as Ruby',
    code: `def greet(name : String) : String
  "Hello from #{name}!"
end
puts "--- PolyCompile: Crystal Native LLVM Execution ---"
total = (1..10).sum
puts "Sum 1..10: #{total}"
puts greet("Crystal")`
  },
  {
    id: 'objectivec-demo',
    languageId: 'objectivec',
    paradigm: 'Object-Oriented (OOP)',
    title: 'Objective-C: Foundation Message Dispatch',
    code: `#import <Foundation/Foundation.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSLog(@"--- PolyCompile: Objective-C Runtime ---");
        NSLog(@"Objective-C Class Initialized.");
    }
    return 0;
}`
  },
  {
    id: 'vbnet-demo',
    languageId: 'vbnet',
    paradigm: 'Object-Oriented (OOP)',
    title: 'Visual Basic .NET: Enterprise Object Pipeline',
    code: `Imports System

Module Program
    Sub Main()
        Console.WriteLine("--- PolyCompile: Visual Basic .NET Runtime ---")
        Dim sum As Integer = 0
        For i As Integer = 1 To 10
            sum += i
        Next
        Console.WriteLine("Cumulative Sum: " & sum)
        Console.WriteLine("Visual Basic Program Completed.")
    End Sub
End Module`
  },
  {
    id: 'powershell-demo',
    languageId: 'powershell',
    paradigm: 'Dynamic / Scripting',
    title: 'PowerShell: Object-Based Shell Automation',
    code: `Write-Host "--- PolyCompile: PowerShell Scripting ---"
$items = @("Alpha", "Beta", "Gamma")
foreach ($item in $items) {
    Write-Host "Item: $item"
}
Write-Host "PowerShell 7 Pipeline Verified."`
  },
  {
    id: 'racket-demo',
    languageId: 'racket',
    paradigm: 'Functional Programming (FP)',
    title: 'Racket: Lisp/Scheme Language Ecosystem',
    code: `#lang racket
(displayln "--- PolyCompile: Racket Functional S-Expression ---")
(define (fact n)
  (if (<= n 1) 1 (* n (fact (- n 1)))))
(printf "Factorial 5 = ~a\n" (fact 5))
(displayln "Racket S-Expression Evaluated.")`
  },
  {
    id: 'vlang-demo',
    languageId: 'vlang',
    paradigm: 'Systems Programming',
    title: 'V (Vlang): Fast, Safe Compiled Systems',
    code: `fn main() {
    println('--- PolyCompile: V (Vlang) Fast Systems Runtime ---')
    mut total := 0
    for i in 1..11 {
        total += i
    }
    println('Computed Sum: $total')
    println('V Compilation Unit Verified.')
}`
  }
];

module.exports = {
  SNIPPETS,
  getSnippetById: (id) => SNIPPETS.find(s => s.id === id) || null,
  getAllSnippets: () => SNIPPETS
};
