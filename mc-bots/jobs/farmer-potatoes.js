const { Vec3 } = require('vec3')
const { sleep, stopMotion } = require('./utils')

const CROP = {
  block: 'potatoes',
  seed: 'potato',
  ripeMeta: 7,
  name: 'potatoes'
}

function notifyHarvest(bot, amount) {
  const payload = {
    crop: CROP.name,
    timestamp: Date.now(),
    bot_name: bot.username,
    amount: amount
  }
  
  // Log to console
  console.log('[harvest]', JSON.stringify(payload))
  
  // Chat in-game
  bot.chat(`Harvested ${amount} ${CROP.name}`)
  
  // TODO: POST to webhook endpoint
  // await fetch(WEBHOOK_URL, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload)
  // })
}

async function checkStarterKit(bot) {
  console.log(`[farmer-potatoes] Checking inventory for ${bot.username}`)
  
  // Check if bot has required items (seeds at minimum)
  const seeds = bot.inventory.items().find(item => item.name === CROP.seed)
  
  if (seeds) {
    console.log(`[farmer-potatoes] ${bot.username} has ${seeds.count} ${CROP.seed}`)
    bot.chat('Potato farmer ready!')
  } else {
    console.log(`[farmer-potatoes] WARNING: ${bot.username} has no potatoes! Requesting from brigadier...`)
    bot.chat('Potato farmer ready (need potatoes!)')
    await sleep(1000)
    bot.chat('Need potatoes for the collective!')
  }
  
  // Note: Brigadier bot will auto-supply if present
  // Or manually: /give <bot_name> minecraft:potato 64
}

function findRipeCrop(bot, radius) {
  return bot.findBlock({
    point: bot.entity.position,
    maxDistance: radius,
    matching: block => {
      if (!block) return false
      if (block.name !== CROP.block) return false
      if (typeof block.metadata !== 'number') return false
      return block.metadata >= CROP.ripeMeta
    }
  })
}

function findFarmland(bot, radius) {
  return bot.findBlock({
    point: bot.entity.position,
    matching: bot.registry.blocksByName.farmland.id,
    maxDistance: radius,
    useExtraInfo: block => {
      const blockAbove = bot.blockAt(block.position.offset(0, 1, 0))
      return !blockAbove || blockAbove.type === 0
    }
  })
}

async function run(state, task, options) {
  const bot = state.bot
  const radius = Number(options.radius || 6)
  const idleMs = Number(options.idleMs || 800)
  
  // Give starter kit immediately on spawn
  let kitGiven = false

  while (!task.cancelled) {
    if (!bot.entity) {
      await sleep(500)
      continue
    }
    
    // Check kit once when bot spawns
    if (!kitGiven) {
      await checkStarterKit(bot)
      kitGiven = true
    }

    // Look for ripe potatoes
    const ripe = findRipeCrop(bot, radius)
    if (ripe) {
      await bot.dig(ripe)
      notifyHarvest(bot, 1)
      continue
    }

    // Look for empty farmland to plant
    const plot = findFarmland(bot, radius)
    if (plot) {
      try {
        await bot.equip(bot.registry.itemsByName[CROP.seed].id, 'hand')
        await bot.placeBlock(plot, new Vec3(0, 1, 0))
      } catch (error) {
        await sleep(idleMs)
      }
      continue
    }

    await sleep(idleMs)
  }

  stopMotion(bot)
}

module.exports = {
  name: 'farmer-potatoes',
  label: 'Potato Farmer',
  run
}
