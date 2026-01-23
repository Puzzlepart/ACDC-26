const { Vec3 } = require('vec3')
const { sleep, stopMotion } = require('./utils')

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

async function run(state, task, options) {
  const bot = state.bot
  const crop = CROPS[options.crop] || CROPS.wheat
  const radius = Number(options.radius || 6)
  const idleMs = Number(options.idleMs || 800)

  while (!task.cancelled) {
    if (!bot.entity) {
      await sleep(500)
      continue
    }

    const ripe = findRipeCrop(bot, crop, radius)
    if (ripe) {
      await bot.dig(ripe)
      continue
    }

    const plot = findFarmland(bot, radius)
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
