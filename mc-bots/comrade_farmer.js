const { Vec3 } = require('vec3')
const mineflayer = require('mineflayer')
const bot = mineflayer.createBot({
  host: "mc.craycon.no",
  username: "comrade_farmer"
})

// To fish we have to give bot the seeds
// /give farmer wheat_seeds 64

function blockToSow() {
  return bot.findBlock({
    point: bot.entity.position,
    matching: bot.registry.blocksByName.farmland.id,
    maxDistance: 6,
    useExtraInfo: (block) => {
      const blockAbove = bot.blockAt(block.position.offset(0, 1, 0))
      return !blockAbove || blockAbove.type === 0
    }
  })
}

// random farmer greetings upon spawning
const greetings = [
  "Привет, товарищи!",
  "Время сеять!",
  "Пусть урожай будет богатым!",
  "За коллективизацию!",
  "Да здравствует сельское хозяйство!",
]

bot.on('spawn', () => {
  // greet the world with a random greeting when spawning
  const greeting = greetings[Math.floor(Math.random() * greetings.length)]
  bot.chat(greeting)
})


function blockToHarvest() {
  return bot.findBlock({
    point: bot.entity.position,
    maxDistance: 6,
    matching: (block) => {
      return block && block.type === bot.registry.blocksByName.wheat.id && block.metadata === 7
    }
  })
}

async function loop() {
  try {
    while (1) {
      const toHarvest = blockToHarvest()
      if (toHarvest) {
        await bot.dig(toHarvest)
      } else {
        break
      }
    }
    while (1) {
      const toSow = blockToSow()
      if (toSow) {
        await bot.equip(bot.registry.itemsByName.wheat_seeds.id, 'hand')
        await bot.placeBlock(toSow, new Vec3(0, 1, 0))
      } else {
        break
      }
    }
  } catch (e) {
    console.log(e)
  }

  // No block to harvest or sow. Postpone next loop a bit
  setTimeout(loop, 1000)
}

bot.once('login', loop)