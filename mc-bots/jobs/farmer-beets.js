const { Vec3 } = require('vec3')
const { sleep, stopMotion, escapeWater, postToDataverse, stepToward } = require('./utils')

const CROP = {
  block: 'beetroots',
  seed: 'beetroot_seeds',
  ripeMeta: 3,
  name: 'beets'
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
    resourceName: 'Beets',
    logicalName: 'beets',
    quantity: amount,
    ID: Math.floor(Math.random() * 2147483647),
    harvesterBotID: 'e3a41c89-b4f8-f011-8406-7ced8d24db72'
  }
  await postToDataverse(webhookUrl, dataversePayload)
}

async function checkStarterKit(bot) {
  console.log(`[farmer-beets] Checking inventory for ${bot.username}`)
  
  // Check if bot has required items (seeds at minimum)
  const seeds = bot.inventory.items().find(item => item.name === CROP.seed)
  
  if (seeds) {
    console.log(`[farmer-beets] ${bot.username} has ${seeds.count} ${CROP.seed}`)
    bot.chat('Beet farmer ready!')
  } else {
    console.log(`[farmer-beets] WARNING: ${bot.username} has no seeds! Requesting from brigadier...`)
    bot.chat('Beet farmer ready (need beets!)')
    await sleep(1000)
    bot.chat('Need beetroot seeds for the collective!')
  }
  
  // Note: Brigadier bot will auto-supply if present
  // Or manually: /give <bot_name> minecraft:beetroot_seeds 64
}

function getRandomNotifyThreshold() {
  return Math.floor(Math.random() * 50) + 1
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getAnchorPosition(bot, options) {
  const workArea = options && options.workArea
  if (workArea && Number.isFinite(workArea.x) && Number.isFinite(workArea.y) && Number.isFinite(workArea.z)) {
    return { position: new Vec3(workArea.x, workArea.y, workArea.z), label: 'work area' }
  }

  const brigadierName = (options && options.brigadierName) || 'comrade_remote'
  const player = bot.players[brigadierName]
  if (player && player.entity) {
    return { position: player.entity.position, label: brigadierName }
  }
  return null
}

function computeRadiusPenalty(distance, maxDistance) {
  if (!Number.isFinite(maxDistance) || maxDistance <= 0) return 1
  const ratio = clamp(distance / maxDistance, 0, 1)
  return 1 - 0.65 * ratio * ratio
}

async function run(state, task, options) {
  const bot = state.bot
  
  // Give starter kit immediately on spawn
  let kitGiven = false
  let lastActivity = Date.now()
  let searchCount = 0
  let lastStatus = 'starting'
  let plantCount = 0
  let harvestCount = 0
  let totalHarvested = 0
  let lastHarvestAt = 0
  let nextNotifyAt = getRandomNotifyThreshold()

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

    // Notify on a random harvest count only after 5s idle since last harvest
    if (harvestCount > 0 && lastHarvestAt > 0) {
      const harvestIdleMs = Date.now() - lastHarvestAt
      if (harvestCount >= nextNotifyAt && harvestIdleMs >= 5000) {
        await notifyHarvest(bot, harvestCount, options.webhookUrl)
        bot.chat(`Harvested ${totalHarvested} beets total (${harvestCount} this session)`)
        harvestCount = 0
        nextNotifyAt = getRandomNotifyThreshold()
      }
    }

    const radius = Number(options.radius || 16)
    const idleMs = Number(options.idleMs || 800)
    const maxDistanceFromBrigadier = Number(options.maxDistanceFromBrigadier || 75)
    const leashMargin = Number(options.leashMargin || 8)
    const returnStepMs = Number(options.returnStepMs || 300)
    const anchor = getAnchorPosition(bot, options)

    if (anchor) {
      const distToBrigadier = bot.entity.position.distanceTo(anchor.position)
      if (distToBrigadier > maxDistanceFromBrigadier + leashMargin) {
        if (lastStatus !== 'regrouping') {
          bot.chat(`Too far from ${anchor.label}, returning to work zone`)
          lastStatus = 'regrouping'
        }
        await stepToward(bot, anchor.position, returnStepMs, true)
        await sleep(100)
        continue
      }
    }

    const distForPenalty = anchor ? bot.entity.position.distanceTo(anchor.position) : 0
    const radiusPenalty = anchor ? computeRadiusPenalty(distForPenalty, maxDistanceFromBrigadier) : 1
    const effectiveRadius = Math.max(6, Math.round(radius * radiusPenalty))

    // Look for ripe beetroots
    const ripe = findRipeCrop(bot, effectiveRadius)
    if (ripe) {
      if (lastStatus !== 'harvesting') {
        bot.chat(`Found ripe beetroots! Starting harvest.`)
        lastStatus = 'harvesting'
        harvestCount = 0
      }
      try {
        await bot.dig(ripe)
        harvestCount++
        totalHarvested++
        lastHarvestAt = Date.now()
        lastActivity = Date.now()
        await sleep(150)
      } catch (error) {
        console.log(`[farmer-beets] ${bot.username} harvest failed:`, error.message)
        await sleep(idleMs)
      }
      continue
    }

    // Look for empty farmland to plant
    const plot = findFarmland(bot, effectiveRadius)
    if (plot) {
      searchCount = 0
      try {
        // Check resources BEFORE announcing
        const seedItem = bot.inventory.items().find(item => item.name === CROP.seed)
        if (!seedItem) {
          if (lastStatus !== 'out_of_seeds') {
            bot.chat(`Out of beetroot seeds! Need resupply!`)
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
        await sleep(150)
        
        // Only announce every 10 plants
        if (plantCount % 10 === 0) {
          bot.chat(`Planted ${plantCount} beets so far...`)
        }
      } catch (error) {
        console.log(`[farmer-beets] ${bot.username} planting failed:`, error.message)
        await sleep(idleMs)
      }
      continue
    }

    // Report when searching (less frequently)
    searchCount++
    if (searchCount === 30) {
      const timeSinceActivity = Math.floor((Date.now() - lastActivity) / 1000)
      bot.chat(`Searching for beet work... (idle ${timeSinceActivity}s)`)
      lastStatus = 'searching'
      searchCount = 0
    }

    await sleep(idleMs)
  }

  stopMotion(bot)
  bot.chat('Beet farming duties suspended.')
}

module.exports = {
  name: 'farmer-beets',
  label: 'Beet Farmer',
  run
}
