const mineflayer = require('mineflayer')

const randomNum = Math.floor(Math.random() * 1000);
const comradeName = `comrade_${randomNum}`;

const bot = mineflayer.createBot({
  host: 'mc.craycon.no',
  username: comradeName
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  bot.chat(message)
})

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)