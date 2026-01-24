// simple websockets server for testing mc bedrock connection
const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 8001 })

wss.on('connection', function connection(ws) {
  console.log('New client connected')

  ws.on('message', function incoming(message) {
    console.log('received: %s', message)
    // Echo the received message back to the client
    ws.send(`Server received: ${message}`)
  })

  ws.on('close', () => {
    console.log('Client disconnected')
  })

  // Send a welcome message to the client
  ws.send('Welcome to the WebSocket server!')
})

console.log('WebSocket server is running on ws://localhost:8001')

