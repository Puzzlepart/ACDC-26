const { Vec3 } = require('vec3')
const { sleep, stopMotion, escapeWater, postToDataverse } = require('./utils')

const CROP = {
  block: 'potatoes',
  seed: 'potato',
  ripeMeta: 7,
  name: 'potatoes'
}

async function notifyHarvest(bot, amount, webhookUrl) {
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

  // POST to Dataverse via Power Automate
  const dataversePayload = {
    resourceName: 'Potatoes',
    logicalName: 'potatoes',
    quantity: amount,
    ID: Math.floor(Math.random() * 2147483647)
  }
  await postToDataverse(webhookUrl, dataversePayload)
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
  const radius = Number(options.radius || 100)
  const idleMs = Number(options.idleMs || 800)
  
  // Give starter kit immediately on spawn
  let kitGiven = false
  let lastActivity = Date.now()
  let searchCount = 0
  let lastStatus = 'starting'
  let plantCount = 0
  let harvestCount = 0
  let totalHarvested = 0

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

    // Look for ripe potatoes
    const ripe = findRipeCrop(bot, radius)
    if (ripe) {
      if (lastStatus !== 'harvesting') {
        bot.chat(`Found ripe potatoes! Starting harvest.`)
        lastStatus = 'harvesting'
        harvestCount = 0
      }
      try {
        await bot.dig(ripe)
        harvestCount++
        totalHarvested++
        // Only notify every 10 harvests to avoid spam
        if (harvestCount % 10 === 0) {
          await notifyHarvest(bot, harvestCount, options.webhookUrl)
          bot.chat(`Harvested ${totalHarvested} potatoes total (${harvestCount} this session)`)
          harvestCount = 0
        }
        lastActivity = Date.now()
      } catch (error) {
        console.log(`[farmer-potatoes] ${bot.username} harvest failed:`, error.message)
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
            bot.chat(`Out of potatoes! Need resupply!`)
            lastStatus = 'out_of_seeds'
          }
          await sleep(idleMs * 5)
          continue
        }
        
        // Announce planting status change only
        if (lastStatus !== 'planting') {
          bot.chat(`Found farmland, starting planting (${seedItem.count} potatoes available)`)
          lastStatus = 'planting'
          plantCount = 0
        }
        
        // Equip potatoes
        await bot.equip(bot.registry.itemsByName[CROP.seed].id, 'hand')
        
        // Place potatoes on farmland
        await bot.placeBlock(plot, new Vec3(0, 1, 0))
        plantCount++
        lastActivity = Date.now()
        
        // Only announce every 10 plants
        if (plantCount % 10 === 0) {
          bot.chat(`Planted ${plantCount} potatoes so far...`)
        }
      } catch (error) {
        console.log(`[farmer-potatoes] ${bot.username} planting failed:`, error.message)
        await sleep(idleMs)
      }
      continue
    }

    // Report when searching (less frequently)
    searchCount++
    if (searchCount === 30) {
      const timeSinceActivity = Math.floor((Date.now() - lastActivity) / 1000)
      bot.chat(`Searching for potato work... (idle ${timeSinceActivity}s)`)
      lastStatus = 'searching'
      searchCount = 0
    }

    await sleep(idleMs)
  }

  stopMotion(bot)
  bot.chat('Potato farming duties suspended.')
}

module.exports = {
  name: 'farmer-potatoes',
  label: 'Potato Farmer',
  run
}
