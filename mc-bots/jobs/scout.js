const { Vec3 } = require('vec3')
const { sleep, stopMotion, stepToward } = require('./utils')

function randomOffset(radius) {
  return (Math.random() * 2 - 1) * radius
}

async function run(state, task, options) {
  const bot = state.bot
  const radius = Number(options.radius || 12)
  const idleMs = Number(options.idleMs || 1200)
  const stepMs = Number(options.stepMs || 250)
  const allowJump = Boolean(options.allowJump)
  const origin = bot.entity.position.clone()

  while (!task.cancelled) {
    if (!bot.entity) {
      await sleep(500)
      continue
    }

    const target = origin.plus(new Vec3(randomOffset(radius), 0, randomOffset(radius)))
    while (!task.cancelled && bot.entity.position.distanceTo(target) > 1.4) {
      await stepToward(bot, new Vec3(target.x, bot.entity.position.y, target.z), stepMs, allowJump)
    }

    stopMotion(bot)
    await sleep(idleMs)
  }

  stopMotion(bot)
}

module.exports = {
  name: 'scout',
  label: 'Scout',
  run
}
