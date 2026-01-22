const bedrock = require('bedrock-protocol')
process.env.DEBUG = 'minecraft-protocol*,bedrock-protocol*,prismarine-auth'

const client = bedrock.createClient({
  host: 'acdc.my-serv.com',
  port: 19132,

  username: 'kim@damsleth.com',
  profilesFolder: './bot-profiles',

  flow: 'live',               // required by prismarine-auth v2+  [oai_citation:1‡GitHub](https://github.com/PrismarineJS/prismarine-auth?utm_source=chatgpt.com)

  raknetBackend: 'jsp-raknet',
  connectTimeout: 60000,

  // remove “smart” stuff while debugging:
  version: '1.21.130',
  skipPing: true,
  followPort: false,          // options exist in bedrock-protocol  [oai_citation:2‡app.unpkg.com](https://app.unpkg.com/bedrock-protocol%403.49.0/files/docs/API.md)
})

client.on('status', s => console.log('STATUS:', s))          // event documented  [oai_citation:3‡app.unpkg.com](https://app.unpkg.com/bedrock-protocol%403.49.0/files/docs/API.md)
client.on('packet', (data, meta) => console.log('IN:', meta.name))
client.on('disconnect', p => console.log('DISCONNECT:', p))
client.on('error', e => console.log('ERROR:', e))