#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const registryPath = process.env.POLYCOMPILE_LANGUAGE_REGISTRY || path.join(__dirname, '..', 'runner', 'languages.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const sessionRunnerPath = process.env.POLYCOMPILE_SESSION_RUNNER || path.join(__dirname, 'session-runner.js');
const jsRunnerPath = process.env.POLYCOMPILE_JS_RUNNER || path.join(__dirname, '..', 'runner', 'js-runner.js');
const brainfuckRunnerPath = process.env.POLYCOMPILE_BRAINFUCK_RUNNER || path.join(__dirname, '..', 'runner', 'brainfuck.js');
const byId = new Map(registry.map(x => [x.id, x]));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'polycompile-pty-'));
const work = path.join(root, 'work');
const execDir = path.join(root, 'exec');
fs.mkdirSync(work); fs.mkdirSync(execDir);
const testRegistryPath = path.join(root, 'languages.json');
const testRegistry = registry.map(lang => JSON.parse(JSON.stringify(lang, (key, value) => typeof value === 'string' ? value.replaceAll('/work', work).replaceAll('/exec', execDir).replaceAll('/opt/polycompile/js-runner.js', jsRunnerPath).replaceAll('/opt/polycompile/brainfuck.js', brainfuckRunnerPath) : value)));
fs.writeFileSync(testRegistryPath, JSON.stringify(testRegistry));

const cases = [
  {
    id: 'brainfuck',
    source: ',....',
    inputs: ['A'], prompts: [], expected: ['AAAA']
  },
  {
    id: 'python',
    source: 'name = input("Name: ")\nage = input("Age: ")\nprint(f"RESULT:{name}|{age}")\n',
    inputs: ['Ada Lovelace', '36'], prompts: ['Name: ', 'Age: '], expected: ['RESULT:Ada Lovelace|36']
  },
  {
    id: 'python',
    source: 'import sys\nfor i in range(3):\n    value = input(f"Line {i + 1}: ")\n    print(f"ECHO{i + 1}:{value}")\n',
    inputs: ['hello world', '', '東京'], prompts: ['Line 1: ', 'Line 2: ', 'Line 3: '], expected: ['ECHO1:hello world', 'ECHO2:', 'ECHO3:東京']
  },
  {
    id: 'python',
    source: 'import sys\nprint("Send lines then Ctrl+D: ", end="", flush=True)\ndata = sys.stdin.read()\nprint("EOF:" + repr(data))\n',
    inputs: ['first line', 'second line'], prompts: ['Send lines then Ctrl+D: '], expected: ["EOF:'first line\\nsecond line\\n'"], eof: true
  },
  {
    id: 'c',
    source: '#include <stdio.h>\nint main(void){int n; double d; char c; printf("Values: "); fflush(stdout); if(scanf("%d %lf %c", &n, &d, &c)!=3)return 2; printf("RESULT:%d|%.1f|%c\\n",n,d,c); return 0;}\n',
    inputs: ['42 3.5 Z'], prompts: ['Values: '], expected: ['RESULT:42|3.5|Z']
  },
  {
    id: 'cpp',
    source: '#include <iostream>\n#include <string>\nint main(){std::string name; int n; std::cout<<"Full name: "<<std::flush; std::getline(std::cin,name); std::cout<<"Count: "<<std::flush; std::cin>>n; std::cout<<"RESULT:"<<name<<"|"<<n<<"\\n";}\n',
    inputs: ['Grace Hopper', '7'], prompts: ['Full name: ', 'Count: '], expected: ['RESULT:Grace Hopper|7']
  },
  {
    id: 'java',
    source: 'import java.util.*; public class Main { public static void main(String[] a){ Scanner s=new Scanner(System.in); System.out.print("Name: "); String n=s.nextLine(); System.out.print("Count: "); int c=s.nextInt(); System.out.println("RESULT:"+n+"|"+c); }}\n',
    inputs: ['Katherine Johnson', '9'], prompts: ['Name: ', 'Count: '], expected: ['RESULT:Katherine Johnson|9']
  },
  {
    id: 'javascript',
    source: 'const rl=require("node:readline").createInterface({input:process.stdin,output:process.stdout}); rl.question("Name: ", name=>rl.question("Count: ", count=>{console.log(`RESULT:${name}|${count}`);rl.close();}));\n',
    inputs: ['Linus Torvalds', '11'], prompts: ['Name: ', 'Count: '], expected: ['RESULT:Linus Torvalds|11']
  },
  {
    id: 'javascript',
    source: 'const name = prompt("Name: ");\nconst count = prompt("Count: ");\nconsole.log(`RESULT:${name}|${count}`);\n',
    inputs: ['Ada Lovelace 🚀', '18'], prompts: ['Name: ', 'Count: '], expected: ['RESULT:Ada Lovelace 🚀|18']
  },
  {
    id: 'typescript',
    requires: ['tsc'],
    source: 'export {};\nconst userName: string = prompt("Name: ") ?? "";\nconst count: string = prompt("Count: ") ?? "";\nconsole.log(`RESULT:${userName}|${count}`);\n',
    inputs: ['TypeScript User', '19'], prompts: ['Name: ', 'Count: '], expected: ['RESULT:TypeScript User|19']
  },
  {
    id: 'ruby',
    source: 'STDOUT.write("Name: "); STDOUT.flush; name=STDIN.gets&.chomp; STDOUT.write("Count: "); STDOUT.flush; count=STDIN.gets&.chomp; puts "RESULT:#{name}|#{count}"\n',
    inputs: ['Yukihiro Matsumoto', '12'], prompts: ['Name: ', 'Count: '], expected: ['RESULT:Yukihiro Matsumoto|12']
  },
  {
    id: 'php',
    source: '<?php fwrite(STDOUT, "Name: "); $name=trim(fgets(STDIN)); fwrite(STDOUT, "Count: "); $count=trim(fgets(STDIN)); echo "RESULT:$name|$count\\n"; ?>\n',
    inputs: ['Rasmus Lerdorf', '13'], prompts: ['Name: ', 'Count: '], expected: ['RESULT:Rasmus Lerdorf|13']
  },
  {
    id: 'perl',
    source: 'print "Name: "; my $name=<STDIN>; chomp $name; print "Count: "; my $count=<STDIN>; chomp $count; print "RESULT:$name|$count\\n";\n',
    inputs: ['Larry Wall', '14'], prompts: ['Name: ', 'Count: '], expected: ['RESULT:Larry Wall|14']
  },
  {
    id: 'go',
    source: `package main\nimport("bufio";"fmt";"os";"strings")\nfunc main(){r:=bufio.NewReader(os.Stdin);fmt.Print("Name: " );n,_:=r.ReadString('\\n');fmt.Print("Count: " );c,_:=r.ReadString('\\n');fmt.Printf("RESULT:%s|%s\\n",strings.TrimSpace(n),strings.TrimSpace(c))}\n`,
    inputs: ['Rob Pike', '15'], prompts: ['Name: ', 'Count: '], expected: ['RESULT:Rob Pike|15']
  },
  {
    id: 'swift',
    source: 'import Foundation\nimport Glibc\nprint("Name: ", terminator: ""); fflush(stdout); let name = readLine() ?? ""\nprint("Count: ", terminator: ""); fflush(stdout); let count = readLine() ?? ""\nprint("RESULT:\\(name)|\\(count)")\n',
    inputs: ['Margaret Hamilton', '16'], prompts: ['Name: ', 'Count: '], expected: ['RESULT:Margaret Hamilton|16']
  },
  {
    id: 'sql', source: "SELECT 'SQL source loaded';", inputs: ['SELECT 42 AS TERMINAL_INPUT;'], prompts: [], expected: ['SQL source loaded', '42'], eof: true
  },
  {
    id: 'awk', source: 'BEGIN { print \"AWK_READY\" } { print \"AWK_ROW:\" $0 }', inputs: ['stream input line'], prompts: [], expected: ['AWK_READY', 'AWK_ROW:stream input line'], eof: true
  },
  {
    id: 'sed', source: 's/^/SED_ROW:/', inputs: ['stream input line'], prompts: [], expected: ['SED_ROW:stream input line'], eof: true
  },
  {
    id: 'jq', source: '\"JQ_ROW:\" + .name', inputs: ['{\"name\":\"Ada Lovelace\"}'], prompts: [], expected: ['JQ_ROW:Ada Lovelace'], eof: true
  },
  {
    id: 'rust',
    source: 'use std::io::{self,BufRead,Write};fn main(){let stdin=io::stdin();print!("Name: ");io::stdout().flush().unwrap();let mut name=String::new();stdin.lock().read_line(&mut name).unwrap();let name=name.trim();print!("Count: ");io::stdout().flush().unwrap();let mut count=String::new();stdin.lock().read_line(&mut count).unwrap();let count=count.trim();println!("RESULT:{}|{}",name,count);}',
    inputs: ['Graydon Hoare', '17'],
    prompts: ['Name: ', 'Count: '],
    expected: ['RESULT:Graydon Hoare|17']
  },
  {
    id: 'bash',
    source: 'read -p "Name: " name\nread -p "Count: " count\necho "RESULT:$name|$count"\n',
    inputs: ['Brian Kernighan', '21'],
    prompts: ['Name: '],
    expected: ['RESULT:Brian Kernighan|21']
  },
  {
    id: 'kotlin',
    source: 'fun main() { print("Name: "); val name = readLine(); print("Count: "); val count = readLine(); println("RESULT:$name|$count") }',
    inputs: ['JetBrains Dev', '22'],
    prompts: ['Name: ', 'Count: '],
    expected: ['RESULT:JetBrains Dev|22']
  },
  {
    id: 'haskell',
    source: 'import System.IO\nmain :: IO ()\nmain = do { hSetBuffering stdout NoBuffering; putStr "Name: "; name <- getLine; putStr "Count: "; count <- getLine; putStrLn $ "RESULT:" ++ name ++ "|" ++ count }',
    inputs: ['Simon Peyton Jones', '23'],
    prompts: ['Name: ', 'Count: '],
    expected: ['RESULT:Simon Peyton Jones|23']
  },
  {
    id: 'lua',
    source: 'io.write("Name: "); io.flush(); local name = io.read("*l"); io.write("Count: "); io.flush(); local count = io.read("*l"); print("RESULT:"..name.."|"..count)',
    inputs: ['Roberto Ierusalimschy', '24'],
    prompts: ['Name: ', 'Count: '],
    expected: ['RESULT:Roberto Ierusalimschy|24']
  }
];

function commandExists(cmd) {
  if (cmd === 'sh' || cmd === 'script' || cmd === 'bash' || cmd === 'zsh' || cmd === 'fish') {
    return process.platform !== 'win32';
  }
  if (process.platform === 'win32') {
    if (cmd === 'node') return true;
    if (cmd === 'python' || cmd === 'python3') {
      try {
        const res = require('node:child_process').spawnSync('python', ['--version'], { stdio: 'ignore' });
        return res.status === 0;
      } catch {
        return false;
      }
    }
    const res = require('node:child_process').spawnSync('where.exe', [cmd], { stdio: 'ignore' });
    return res.status === 0;
  }
  return require('node:child_process').spawnSync('sh', ['-lc', `command -v ${cmd}`], { stdio: 'ignore' }).status === 0;
}

function available(lang, test) {
  const cmds = [...(test.requires || []), lang.compile?.[0], lang.run?.[0]].filter(Boolean).filter(cmd => !cmd.startsWith('/'));
  return cmds.every(cmd => commandExists(cmd));
}
function runCase(test) {
  const lang = byId.get(test.id);
  assert.ok(lang, `Missing runtime registry entry for ${test.id}`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [sessionRunnerPath], {
      env: { ...process.env, POLYCOMPILE_LANGUAGE_REGISTRY: testRegistryPath, POLYCOMPILE_WORK_DIR: work, POLYCOMPILE_EXEC_DIR: execDir, POLYCOMPILE_PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let lineBuffer = '';
    let transcript = '';
    let stderr = '';
    let nextInput = 0;
    let eofSent = false;
    let finished = false;
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`${test.id}: test timed out; transcript=${JSON.stringify(transcript)} stderr=${stderr}`)); }, 15000);
    const sendNext = () => {
      if (nextInput >= test.inputs.length) {
        if (test.eof && !eofSent && (!test.prompts.length || transcript.includes(test.prompts[test.prompts.length - 1]))) {
          eofSent = true;
          child.stdin.write('\u0004');
        }
        return;
      }
      const prompt = test.prompts[nextInput];
      if (prompt && !transcript.includes(prompt)) return;
      child.stdin.write(test.inputs[nextInput++] + '\n');
      sendNext();
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      lineBuffer += chunk;
      let i;
      while ((i = lineBuffer.indexOf('\n')) >= 0) {
        const line = lineBuffer.slice(0, i); lineBuffer = lineBuffer.slice(i + 1);
        let event; try { event = JSON.parse(line); } catch { continue; }
        if (event.data) {
          const data = Buffer.from(event.data, 'base64').toString('utf8');
          transcript += data;
          if (event.phase === 'compile' && event.type === 'stderr') stderr += data;
          sendNext();
        }
        if (event.type === 'ready') sendNext();
        if (event.type === 'error') stderr += event.message || '';
        if (event.type === 'exit' && !finished) {
          finished = true; clearTimeout(timer);
          try {
            assert.equal(event.code, 0, `${test.id}: unexpected exit ${event.code}; transcript=${JSON.stringify(transcript)} stderr=${stderr}`);
            for (const expected of test.expected) assert.ok(transcript.includes(expected), `${test.id}: missing ${expected}; transcript=${JSON.stringify(transcript)}`);
            resolve({ id: test.id, transcript });
          } catch (error) { reject(error); }
          child.stdin.end();
        }
      }
    });
    child.stderr.setEncoding('utf8'); child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      if (!finished) { clearTimeout(timer); reject(new Error(`${test.id}: session runner closed with ${code}; transcript=${JSON.stringify(transcript)} stderr=${stderr}`)); }
    });
    child.stdin.write(JSON.stringify({ language: test.id, source: Buffer.from(test.source).toString('base64'), timeoutMs: 12000 }) + '\n');
  });
}

(async () => {
  let passed = 0; let skipped = 0;
  try {
    for (const test of cases) {
      const lang = byId.get(test.id);
      if (!available(lang, test)) { console.log(`[SKIP] ${test.id}: host toolchain unavailable (run this suite inside the runtime image)`); skipped++; continue; }
      const result = await runCase(test);
      console.log(`[PASS] ${test.id}: live terminal stdin, prompts and multi-step input`);
      passed++;
    }
    console.log(`Interactive PTY tests: ${passed} passed, ${skipped} skipped.`);
    if (passed === 0) throw new Error('No interactive PTY test could run.');
  } finally {
    try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }); } catch {}
  }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
