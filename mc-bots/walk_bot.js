const mineflayer = require('mineflayer')

const randomNum = Math.floor(Math.random() * 1000);
const comradeName = `comrade_${randomNum}`;

const bot = mineflayer.createBot({
  host: 'shell.craycon.no',
  username: comradeName
})

// bot that walks around
bot.on('spawn', () => { 
  setInterval(() => {
    // Stop all movement first
    bot.clearControlStates();
    
    // Random direction
    const forward = Math.random() > 0.5;
    const back = !forward && Math.random() > 0.5;
    const left = Math.random() > 0.5;
    const right = !left && Math.random() > 0.5;
    
    // Set random movement controls
    bot.setControlState('forward', forward);
    bot.setControlState('back', back);
    bot.setControlState('left', left);
    bot.setControlState('right', right);
    bot.setControlState('jump', Math.random() > 0.8);
  }, 5000);
});

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  bot.chat(message)
})

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)