const { Vec3 } = require('vec3')
const { sleep, stopMotion, escapeWater } = require('./utils')

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

async function checkStarterKit(bot) {
  console.log(`[farmer-wheat] Checking inventory for ${bot.username}`)
  
  // Check if bot has required items (seeds at minimum)
  const seeds = bot.inventory.items().find(item => item.name === CROP.seed)
  
  if (seeds) {
    console.log(`[farmer-wheat] ${bot.username} has ${seeds.count} ${CROP.seed}`)
    bot.chat('Wheat farmer ready!')
  } else {
    console.log(`[farmer-wheat] WARNING: ${bot.username} has no seeds! Requesting from brigadier...`)
    bot.chat('Wheat farmer ready (need wheat seeds!)')
    await sleep(1000)
    bot.chat('Need wheat seeds for the collective!')
  }
  
  // Note: Brigadier bot will auto-supply if present
  // Or manually: /give <bot_name> minecraft:wheat_seeds 64
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
  const radius = Number(options.radius || 100)
  const idleMs = Number(options.idleMs || 800)
  
  // Give starter kit immediately on spawn
  let kitGiven = false
  let lastActivity = Date.now()
  let searchCount = 0
  let lastStatus = 'starting'
  let plantCount = 0

  while (!task.cancelled) {
    if (!bot.entity) {
      await sleep(500)
      continue
    }
    
    // Check kit once when bot spawns
    if (!kitGiven) {
      await checkStarterKit(bot)
      kitGiven = true
      lastStatus = 'ready'
    }

    // Check if stuck in water and try to escape
    const inWater = bot.entity.isInWater
    if (inWater) {
      if (lastStatus !== 'escaping_water') {
        bot.chat('Stuck in water! Attempting escape...')
        lastStatus = 'escaping_water'
      }
      await escapeWater(bot)
      await sleep(500)
      continue
    }

    // Look for ripe wheat
    const ripe = findRipeCrop(bot, radius)
    if (ripe) {
      if (lastStatus !== 'harvesting') {
        bot.chat(`Found ripe wheat! Starting harvest.`)
        lastStatus = 'harvesting'
      }
      try {
        await bot.dig(ripe)
        notifyHarvest(bot, 1)
        lastActivity = Date.now()
      } catch (error) {
        console.log(`[farmer-wheat] ${bot.username} harvest failed:`, error.message)
        await sleep(idleMs)
      }
      continue
    }

    // Look for empty farmland to plant
    const plot = findFarmland(bot, radius)
    if (plot) {
      searchCount = 0
      try {
        // Check resources BEFORE announcing
        const seedItem = bot.inventory.items().find(item => item.name === CROP.seed)
        if (!seedItem) {
          if (lastStatus !== 'out_of_seeds') {
            bot.chat(`Out of wheat seeds! Need resupply!`)
            lastStatus = 'out_of_seeds'
          }
          await sleep(idleMs * 5)
          continue
        }
        
        // Announce planting status change only
        if (lastStatus !== 'planting') {
          bot.chat(`Found farmland, starting planting (${seedItem.count} seeds available)`)
          lastStatus = 'planting'
          plantCount = 0
        }
        
        // Equip seeds
        await bot.equip(bot.registry.itemsByName[CROP.seed].id, 'hand')
        
        // Place seeds on farmland
        await bot.placeBlock(plot, new Vec3(0, 1, 0))
        plantCount++
        lastActivity = Date.now()
        
        // Only announce every 10 plants
        if (plantCount % 10 === 0) {
          bot.chat(`Planted ${plantCount} wheat so far...`)
        }
      } catch (error) {
        console.log(`[farmer-wheat] ${bot.username} planting failed:`, error.message)
        await sleep(idleMs)
      }
      continue
    }

    // Report when searching (less frequently)
    searchCount++
    if (searchCount === 30) {
      const timeSinceActivity = Math.floor((Date.now() - lastActivity) / 1000)
      bot.chat(`Searching for wheat work... (idle ${timeSinceActivity}s)`)
      lastStatus = 'searching'
      searchCount = 0
    }

    await sleep(idleMs)
  }

  stopMotion(bot)
  bot.chat('Wheat farming duties suspended.')
}

module.exports = {
  name: 'farmer-wheat',
  label: 'Wheat Farmer',
  run
}
