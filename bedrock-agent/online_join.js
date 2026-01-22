const bedrock = require('bedrock-protocol')
const { Titles } = require('prismarine-auth')

process.env.DEBUG = 'minecraft-protocol*'

const client = bedrock.createClient({
  host: 'acdc.my-serv.com',
  port: 19132,

  username: 'kim@damsleth.com',
  profilesFolder: './bot-profiles',

  raknetBackend: 'jsp-raknet',
  connectTimeout: 45000,

  // ✅ required by prismarine-auth v2+
  flow: 'live', // 'live' | 'msal' | 'sisu'  [oai_citation:2‡Mr.Data](https://git.tpgc.me/tri11paragon/LookAtMySuitBot/src/commit/5f2b208d42ef0c40acc94aa868bddb2e1919e918/js/node_modules/prismarine-auth/docs/API.md?display=source)

  // ✅ do full title auth (recommended for Bedrock servers)  [oai_citation:3‡Mr.Data](https://git.tpgc.me/tri11paragon/LookAtMySuitBot/src/commit/5f2b208d42ef0c40acc94aa868bddb2e1919e918/js/node_modules/prismarine-auth/docs/API.md?display=source)
  authTitle: Titles.MinecraftNintendoSwitch,
  deviceType: 'Nintendo',

  onMsaCode(data) {
    console.log('Microsoft login required:')
    console.log('URL :', data.verification_uri || data.verification_uri_complete)
    console.log('Code:', data.user_code)
  },
})

client.on('join', () => console.log('JOINED ✅'))
client.on('spawn', () => console.log('SPAWNED ✅'))
client.on('disconnect', (p) => console.log('DISCONNECT:', p))
client.on('error', (e) => console.log('ERROR:', e))