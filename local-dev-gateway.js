// local-dev-gateway.js — Universal Interactive Execution Gateway
'use strict';

const http = require('node:http');
const { setupInteractiveGateway, isDockerAvailable } = require('./src/execution/InteractiveGateway');

const PORT = Number(process.env.LOCAL_DEV_PORT || 8081);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    const hasDocker = isDockerAvailable();
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      engine: hasDocker ? 'docker-container' : 'hybrid-cloud-fallback',
      executionImage: hasDocker ? 'polycompile-exec:latest' : null
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

setupInteractiveGateway(server);

const hasDocker = isDockerAvailable();
server.listen(PORT, '127.0.0.1', () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(` PolyCompile Interactive Gateway (Port ${PORT})`);
  console.log(` Mode: ${hasDocker ? 'DOCKER CONTAINER (All 55 languages available)' : 'Hybrid Cloud / Host'}`);
  console.log(` WebSocket URL: ws://localhost:${PORT}/session`);
  console.log('═══════════════════════════════════════════════════════');
});
