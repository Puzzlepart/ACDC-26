const bedrock = require('bedrock-protocol')

process.env.DEBUG = 'minecraft-protocol*' // optional but useful  [oai_citation:1‡GitHub](https://github.com/PrismarineJS/bedrock-protocol)

const client = bedrock.createClient({
  host: "acdc.my-serv.com",
  port: 19132,
  username: 'ComradeBot',
  offline: true,
  raknetBackend: 'jsp-raknet', // <--- avoids raknet-native crash  [oai_citation:2‡UNPKG](https://app.unpkg.com/bedrock-protocol%403.49.0/files/docs/API.md?utm_source=chatgpt.com)
  version: '1.21.130',         // be explicit
})

client.on('join', () => console.log('JOINED (offline worked!)'))
client.on('disconnect', p => console.log('DISCONNECT:', p))
client.on('error', e => console.log('ERROR:', e))
