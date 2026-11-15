const { WebSocket } = require('ws');

const ws = new WebSocket('ws://127.0.0.1:8081/');

ws.on('open', () => {
  console.log('Connected to ws://127.0.0.1:8081/');
  const pyCode = `
name = input("Enter your name: ")
age = int(input("Enter your age: "))
print("Hello", name)
print("Your age is", age)
`;
  console.log('Sending start event for Python...');
  ws.send(JSON.stringify({
    type: 'start',
    languageId: 'python',
    sourceCode: pyCode,
    timeoutMs: 15000
  }));
});

let step = 0;
ws.on('message', data => {
  const msg = JSON.parse(data.toString('utf8'));
  console.log('WS MSG:', JSON.stringify(msg));

  if (msg.type === 'stdout' && msg.data && msg.data.includes('Enter your name:') && step === 0) {
    step = 1;
    console.log('>>> Sending John...');
    ws.send(JSON.stringify({ type: 'input', data: 'John', newline: true }));
  } else if (msg.type === 'stdout' && msg.data && msg.data.includes('Enter your age:') && step === 1) {
    step = 2;
    console.log('>>> Sending 20...');
    ws.send(JSON.stringify({ type: 'input', data: '20', newline: true }));
  }

  if (msg.type === 'stdout' && msg.data && msg.data.includes('Your age is 20')) {
    console.log('>>> SUCCESS! Python interactive multi-turn completed!');
  }

  if (msg.type === 'exit') {
    console.log('>>> Python exited with code:', msg.code);
    ws.close();
    process.exit(msg.code === 0 ? 0 : 1);
  }
});

ws.on('error', err => {
  console.error('WS Error:', err);
  process.exit(1);
});
