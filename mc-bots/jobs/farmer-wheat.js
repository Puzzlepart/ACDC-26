const { Vec3 } = require('vec3')
const { sleep, stopMotion } = require('./utils')

const CROP = {
  block: 'wheat',
  seed: 'wheat_seeds',
  ripeMeta: 7,
  name: 'wheat'
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

async function giveStarterKit(bot) {
  console.log(`[farmer-wheat] Giving starter kit to ${bot.username}`)
  
  // Give equipment via cheat commands
  bot.chat('/give @s minecraft:diamond_hoe 1')
  await sleep(200)
  bot.chat('/give @s minecraft:diamond_shovel 1')
  await sleep(200)
  bot.chat('/give @s minecraft:wheat_seeds 64')
  await sleep(200)
  bot.chat('/give @s minecraft:dirt 64')
  await sleep(200)
  
  bot.chat('Wheat farmer ready!')
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
    
    // Give kit once when bot spawns
    if (!kitGiven) {
      await giveStarterKit(bot)
      kitGiven = true
    }

    // Look for ripe wheat
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
  name: 'farmer-wheat',
  label: 'Wheat Farmer',
  run
}
