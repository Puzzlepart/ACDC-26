const { Vec3 } = require('vec3')
const { sleep, stopMotion, stepToward, toVec3 } = require('./utils')

const HOSTILES = new Set([
  'zombie',
  'husk',
  'drowned',
  'skeleton',
  'stray',
  'creeper',
  'spider',
  'cave_spider',
  'witch',
  'enderman',
  'pillager',
  'vindicator',
  'evoker',
  'ravager'
])

function findNearestHostile(bot, range) {
  if (!bot.entity) return null
  let nearest = null
  let nearestDist = Infinity

  for (const entity of Object.values(bot.entities)) {
    if (!entity || entity.type !== 'mob') continue
    if (!HOSTILES.has(entity.name)) continue
    const dist = bot.entity.position.distanceTo(entity.position)
    if (dist <= range && dist < nearestDist) {
      nearest = entity
      nearestDist = dist
    }
  }

  return nearest
}

async function run(state, task, options) {
  const bot = state.bot
  const radius = Number(options.radius || 8)
  const hostileRange = Number(options.hostileRange || 6)
  const idleMs = Number(options.idleMs || 300)
  const stepMs = Number(options.stepMs || 250)
  const allowJump = Boolean(options.allowJump)
  let anchor = toVec3(options.position, bot.entity.position.clone())

  while (!task.cancelled) {
    if (!bot.entity) {
      await sleep(500)
      continue
    }

    if (options.targetPlayer) {
      const player = bot.players[options.targetPlayer]
      if (player && player.entity) {
        anchor = player.entity.position.clone()
      }
    }

    const hostile = findNearestHostile(bot, hostileRange)
    if (hostile) {
      const dist = bot.entity.position.distanceTo(hostile.position)
      if (dist > 2.5) {
        await stepToward(bot, hostile.position, stepMs, allowJump)
      } else {
        bot.attack(hostile)
        await sleep(150)
      }
      continue
    }

    const distHome = bot.entity.position.distanceTo(anchor)
    if (distHome > radius) {
      await stepToward(bot, new Vec3(anchor.x, bot.entity.position.y, anchor.z), stepMs, allowJump)
      continue
    }

    stopMotion(bot)
    await sleep(idleMs)
  }

  stopMotion(bot)
}

module.exports = {
  name: 'guard',
  label: 'Guard',
  run
}
