const { Vec3 } = require('vec3')

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function stopMotion(bot) {
  if (!bot || !bot.entity) return
  bot.setControlState('forward', false)
  bot.setControlState('back', false)
  bot.setControlState('left', false)
  bot.setControlState('right', false)
  bot.setControlState('jump', false)
  bot.setControlState('sprint', false)
}

async function jump(bot, durationMs = 250) {
  if (!bot || !bot.entity) return
  bot.setControlState('jump', true)
  await sleep(durationMs)
  bot.setControlState('jump', false)
}

async function stepToward(bot, target, durationMs = 250, allowJump = false) {
  if (!bot || !bot.entity) return
  await bot.lookAt(target, true)
  bot.setControlState('forward', true)
  if (allowJump) {
    bot.setControlState('jump', true)
  }
  await sleep(durationMs)
  bot.setControlState('forward', false)
  bot.setControlState('jump', false)
}

function toVec3(value, fallback) {
  if (!value) return fallback
  if (value instanceof Vec3) return value
  if (typeof value === 'object' && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)) {
    return new Vec3(value.x, value.y, value.z)
  }
  return fallback
}

module.exports = {
  sleep,
  stopMotion,
  jump,
  stepToward,
  toVec3
}
