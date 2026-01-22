const bedrock = require('bedrock-protocol')
process.env.DEBUG = 'minecraft-protocol*'

const client = bedrock.createClient({
  host: 'acdc.my-serv.com',
  port: 19132,

  // BOT account email (unique)
  // username: 'cccp.comradebot@outlook.com',
  username: 'kim@damsleth.com',

  profilesFolder: './bot-profiles',

  raknetBackend: 'jsp-raknet',
  connectTimeout: 45000,

  // Important for some servers 
  authTitle: 'Minecraft',

  // Sometimes helps compatibility (safe default)
  deviceType: 'Win10',

  onMsaCode(data) {
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