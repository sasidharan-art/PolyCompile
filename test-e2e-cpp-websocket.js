const { WebSocket } = require('ws');

const ws = new WebSocket('ws://127.0.0.1:8081/');

ws.on('open', () => {
  console.log('Connected to ws://127.0.0.1:8081/');
  const cppCode = `
#include <iostream>
#include <string>
using namespace std;
int main() {
    cout << "Enter your hobby: ";
    string hobby;
    if (cin >> hobby) {
        cout << "Great hobby: " << hobby << "!" << endl;
    }
    return 0;
}
`;
  console.log('Sending start event for C++...');
  ws.send(JSON.stringify({
    type: 'start',
    languageId: 'cpp',
    sourceCode: cppCode,
    timeoutMs: 15000
  }));
});

ws.on('message', data => {
  const msg = JSON.parse(data.toString('utf8'));
  console.log('WS MSG:', JSON.stringify(msg));

  if (msg.type === 'stdout' && msg.data && msg.data.includes('Enter your hobby:')) {
    console.log('>>> Saw C++ prompt! Sending "Coding"...');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'Coding',
      newline: true
    }));
  }

  if (msg.type === 'stdout' && msg.data && msg.data.includes('Great hobby: Coding!')) {
    console.log('>>> SUCCESS! Received C++ output!');
  }

  if (msg.type === 'exit') {
    console.log('>>> C++ exited with code:', msg.code);
    ws.close();
    process.exit(msg.code === 0 ? 0 : 1);
  }
});

ws.on('error', err => {
  console.error('WS Error:', err);
  process.exit(1);
});
