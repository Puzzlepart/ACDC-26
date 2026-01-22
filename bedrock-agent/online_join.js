const bedrock = require('bedrock-protocol')

process.env.DEBUG = 'minecraft-protocol*'

const client = bedrock.createClient({
  host: 'acdc.my-serv.com',
  port: 19132,

  // IMPORTANT: no offline:true
  // Use the bot's Microsoft login email here
  username: 'kim@damsleth.com',  

  // cache tokens here so you only auth once
  profilesFolder: './bot-profiles',

  raknetBackend: 'jsp-raknet',
  connectTimeout: 30000,

  onMsaCode(data) {
    // device code flow callback  [oai_citation:2‡UNPKG](https://app.unpkg.com/bedrock-protocol%403.49.0/files/docs/API.md?utm_source=chatgpt.com)
    console.log('Microsoft login required:')
    console.log('URL :', data.verification_uri || data.verification_uri_complete)
    console.log('Code:', data.user_code)
  },
})

client.on('join', () => console.log('JOINED ✅'))
client.on('spawn', () => console.log('SPAWNED ✅'))
client.on('text', (p) => console.log('CHAT:', p?.message))
client.on('disconnect', (p) => console.log('DISCONNECT:', p))
client.on('error', (e) => console.log('ERROR:', e))