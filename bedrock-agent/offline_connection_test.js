const { createClient } = require('bedrock-protocol')

createClient({
  host: process.env.MC_HOST,
  port: 19132,
  username: 'ComradeBot',
  offline: true, // <-- forces no Xbox auth
}).on('join', () => {
  console.log('Joined WITHOUT Xbox auth (server allows offline).')
  process.exit(0)
}).on('disconnect', (p) => {
  console.log('Disconnected:', p)
  process.exit(0)
}).on('error', (e) => {
  console.log('Error:', e)
  process.exit(0)
})
