const { WebSocket } = require('ws');

const ws = new WebSocket('ws://127.0.0.1:8081/');

ws.on('open', () => {
  console.log('Connected to ws://127.0.0.1:8081/');
  const cCode = `
#include <stdio.h>
int main() {
    printf("Enter age: ");
    fflush(stdout);
    int age = 0;
    if (scanf("%d", &age) == 1) {
        printf("You are %d years old!\\n", age);
    }
    return 0;
}
`;
  console.log('Sending start event for C...');
  ws.send(JSON.stringify({
    type: 'start',
    languageId: 'c',
    sourceCode: cCode,
    timeoutMs: 15000
  }));
});

ws.on('message', data => {
  const msg = JSON.parse(data.toString('utf8'));
  console.log('WS MSG:', JSON.stringify(msg));

  if (msg.type === 'stdout' && msg.data && msg.data.includes('Enter age:')) {
    console.log('>>> Saw prompt "Enter age:"! Sending input "25"...');
    ws.send(JSON.stringify({
      type: 'input',
      data: '25',
      newline: true
    }));
  }

  if (msg.type === 'stdout' && msg.data && msg.data.includes('You are 25 years old!')) {
    console.log('>>> SUCCESS! Received expected formatted output!');
  }

  if (msg.type === 'exit') {
    console.log('>>> Process exited with code:', msg.code);
    ws.close();
    process.exit(msg.code === 0 ? 0 : 1);
  }
});

ws.on('error', err => {
  console.error('WS Error:', err);
  process.exit(1);
});
