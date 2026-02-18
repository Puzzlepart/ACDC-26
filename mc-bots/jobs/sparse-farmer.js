const { Vec3 } = require('vec3')
const { sleep, stopMotion, escapeWater, postToDataverse, isBotConnected, stepToward } = require('./utils')

// Configurable crop - defaults to wheat
const CROPS = {
  wheat: { block: 'wheat', seed: 'wheat_seeds', ripeMeta: 7, name: 'wheat', resourceName: 'Wheat', botId: 'b7cefa7f-a2f7-f011-8406-7ced8d24db72' },
  potatoes: { block: 'potatoes', seed: 'potato', ripeMeta: 7, name: 'potatoes', resourceName: 'Potatoes', botId: '9f471017-23f9-f011-8406-7ced8d24db72' },
  carrots: { block: 'carrots', seed: 'carrot', ripeMeta: 7, name: 'carrots', resourceName: 'Carrots', botId: 'd7b92b3e-a2f7-f011-8406-7ced8d24db72' },
  beets: { block: 'beetroots', seed: 'beetroot_seeds', ripeMeta: 3, name: 'beets', resourceName: 'Beets', botId: 'e3a41c89-b4f8-f011-8406-7ced8d24db72' }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDirection() {
  const angle = Math.random() * Math.PI * 2
  return new Vec3(-Math.sin(angle), 0, -Math.cos(angle))
}

async function notifyHarvest(bot, crop, amount, webhookUrl) {
  if (!isBotConnected(bot)) return
  const payload = {
    crop: crop.name,
    timestamp: Date.now(),
    bot_name: bot.username,
    amount: amount
  }

  console.log('[harvest]', JSON.stringify(payload))
  bot.chat(`Harvested ${amount} ${crop.name}`)

  const dataversePayload = {
    resourceName: crop.resourceName,
    logicalName: crop.name,
    quantity: amount,
    ID: Math.floor(Math.random() * 2147483647),
    harvesterBotID: crop.botId
  }
  await postToDataverse(webhookUrl, dataversePayload)
}

function findRipeCrop(bot, crop, radius) {
  return bot.findBlock({
    point: bot.entity.position,
    maxDistance: radius,
    matching: block => {
      if (!block) return false
      if (block.name !== crop.block) return false
      if (typeof block.metadata !== 'number') return false
      return block.metadata >= crop.ripeMeta
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

function getBrigadierEntity(bot, brigadierName) {
  if (!brigadierName) return null
  const player = bot.players[brigadierName]
  return player && player.entity ? player.entity : null
}

function computeRadiusPenalty(distance, maxDistance) {
  if (!Number.isFinite(maxDistance) || maxDistance <= 0) return 1
  const ratio = clamp(distance / maxDistance, 0, 1)
  return 1 - 0.65 * ratio * ratio
}

async function wanderToNewArea(bot, task, duration) {
  if (!isBotConnected(bot)) return
  const dir = randomDirection()
  await bot.look(Math.atan2(-dir.x, -dir.z), 0, false)
  await sleep(200)

  if (!isBotConnected(bot)) return
  bot.setControlState('forward', true)
  const startTime = Date.now()

  while (!task.cancelled && Date.now() - startTime < duration) {
    if (!isBotConnected(bot)) break
    if (bot.entity.onGround && Math.random() < 0.15) {
      bot.setControlState('jump', true)
      await sleep(100)
      if (isBotConnected(bot)) bot.setControlState('jump', false)
    }
    await sleep(100)
  }

  stopMotion(bot)
}

async function run(state, task, options) {
  const bot = state.bot
  const cropType = options.crop || 'wheat'
  const crop = CROPS[cropType] || CROPS.wheat
  const searchRadius = Number(options.radius || 24)
  const idleMs = Number(options.idleMs || 1000)
  const wanderChance = Number(options.wanderChance || 0.3)
  const skipChance = Number(options.skipChance || 0.4)
  const brigadierName = options.brigadierName || 'comrade_remote'
  const maxDistanceFromBrigadier = Number(options.maxDistanceFromBrigadier || 75)
  const leashMargin = Number(options.leashMargin || 8)
  const returnStepMs = Number(options.returnStepMs || 300)

  let harvestCount = 0
  let totalHarvested = 0
  let lastHarvestAt = 0
  let plantCount = 0

  bot.chat(`Sparse ${crop.name} farmer ready! Roaming far and wide.`)

  while (!task.cancelled) {
    if (!isBotConnected(bot)) {
      await sleep(500)
      continue
    }

    // Escape water
    if (bot.entity.isInWater) {
      await escapeWater(bot)
      await sleep(500)
      continue
    }

    const brigadier = getBrigadierEntity(bot, brigadierName)
    if (brigadier) {
      const distToBrigadier = bot.entity.position.distanceTo(brigadier.position)
      if (distToBrigadier > maxDistanceFromBrigadier + leashMargin) {
        await stepToward(bot, brigadier.position, returnStepMs, true)
        await sleep(100)
        continue
      }
    }

    const distForPenalty = brigadier ? bot.entity.position.distanceTo(brigadier.position) : 0
    const radiusPenalty = brigadier ? computeRadiusPenalty(distForPenalty, maxDistanceFromBrigadier) : 1
    const effectiveRadius = Math.max(6, Math.round(searchRadius * radiusPenalty))

    // Notify harvest after idle period
    if (harvestCount > 0 && lastHarvestAt > 0) {
      const harvestIdleMs = Date.now() - lastHarvestAt
      if (harvestIdleMs >= 5000) {
        await notifyHarvest(bot, crop, harvestCount, options.webhookUrl)
        bot.chat(`Total: ${totalHarvested} ${crop.name}`)
        harvestCount = 0
      }
    }

    // Random chance to wander to new area
    if (Math.random() < wanderChance) {
      const wanderTime = randomInt(2000, 6000)
      await wanderToNewArea(bot, task, wanderTime)
      await sleep(randomInt(500, 1500))
      continue
    }

    // Look for ripe crops first
    const ripe = findRipeCrop(bot, crop, effectiveRadius)
    if (ripe) {
      try {
        await bot.dig(ripe)
        harvestCount++
        totalHarvested++
        lastHarvestAt = Date.now()
      } catch (error) {
        console.log(`[sparse-farmer] harvest failed:`, error.message)
      }
      await sleep(idleMs)
      continue
    }

    // Look for farmland to plant - but skip some randomly for sparse planting
    const plot = findFarmland(bot, effectiveRadius)
    if (plot) {
      // Skip some plots to plant sparsely
      if (Math.random() < skipChance) {
        await sleep(idleMs)
        continue
      }

      const seedItem = bot.inventory.items().find(item => item.name === crop.seed)
      if (!seedItem) {
        bot.chat(`Out of ${crop.name} seeds!`)
        await sleep(5000)
        continue
      }

      try {
        await bot.equip(bot.registry.itemsByName[crop.seed].id, 'hand')
        await bot.placeBlock(plot, new Vec3(0, 1, 0))
        plantCount++

        if (plantCount % 20 === 0) {
          bot.chat(`Planted ${plantCount} ${crop.name} across the land`)
        }
      } catch (error) {
        console.log(`[sparse-farmer] planting failed:`, error.message)
      }
      await sleep(idleMs)
      continue
    }

    // Nothing to do here, wander somewhere else
    const wanderTime = randomInt(3000, 8000)
    await wanderToNewArea(bot, task, wanderTime)
    await sleep(idleMs)
  }

  stopMotion(bot)
  bot.chat('Sparse farming suspended.')
}

module.exports = {
  name: 'sparse-farmer',
  label: 'Sparse Farmer',
  run
}
