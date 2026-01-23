const mineflayer = require('mineflayer')
const bot = mineflayer.createBot({
  host: "mc.craycon.no",
  username: 'comrade_01'
})

// random greetings (including soviet curses) upon spawning
const greetings = [
  "Здравствуйте, товарищи!",
  "За Родину!",
  "Слава рабочим!",
  "Долой буржуазию!",
  "Да здравствует революция!",
  "Товарищи, вперед к победе!",
  "Пусть живет социализм!",
  "Рабочие всех стран, соединяйтесь!",
  "За Сталина!",
  "Пусть капитализм сгорит в огне революции!",
  "Товарищ, держись крепче!",
  "Вперёд к коммунизму!",
  "Пусть живет Красная Армия!",
  "Смерть врагам народа!",
  "Товарищи, не сдавайтесь!",
  "За коллективизацию!",
  "Да здравствует партия!",
  "Пусть буржуи трепещут!",
  "Товарищ, не отступай!",
  "Вперед, к светлому будущему!"
]

bot.on('spawn', () => {
  // greet the world with a random greeting when spawning
  const greeting = greetings[Math.floor(Math.random() * greetings.length)]
  bot.chat(greeting)
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  bot.chat(message)
})

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)