const { Vec3 } = require('vec3')
const { sleep, stopMotion, stepToward } = require('./utils')

const CROPS = {
  wheat: { block: 'wheat', seed: 'wheat_seeds', ripeMeta: 7 },
  carrots: { block: 'carrots', seed: 'carrot', ripeMeta: 7 },
  potatoes: { block: 'potatoes', seed: 'potato', ripeMeta: 7 },
  beetroot: { block: 'beetroots', seed: 'beetroot_seeds', ripeMeta: 3 }
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

async function run(state, task, options) {
  const bot = state.bot
  const crop = CROPS[options.crop] || CROPS.wheat
  const radius = Number(options.radius || 6)
  const idleMs = Number(options.idleMs || 800)
  const brigadierName = options.brigadierName || 'comrade_remote'
  const maxDistanceFromBrigadier = Number(options.maxDistanceFromBrigadier || 75)
  const leashMargin = Number(options.leashMargin || 8)
  const returnStepMs = Number(options.returnStepMs || 300)

  while (!task.cancelled) {
    if (!bot.entity) {
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
    const effectiveRadius = Math.max(6, Math.round(radius * radiusPenalty))

    const ripe = findRipeCrop(bot, crop, effectiveRadius)
    if (ripe) {
      await bot.dig(ripe)
      continue
    }

    const plot = findFarmland(bot, effectiveRadius)
    if (plot) {
      try {
        await bot.equip(bot.registry.itemsByName[crop.seed].id, 'hand')
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
  name: 'farmer',
  label: 'Farmer',
  run
}
