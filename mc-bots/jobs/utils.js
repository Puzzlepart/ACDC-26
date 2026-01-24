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

async function escapeWater(bot) {
  if (!bot || !bot.entity) return false
  
  // Check if bot is in water
  const block = bot.blockAt(bot.entity.position)
  if (!block || block.name !== 'water') return false
  
  console.log(`[utils] ${bot.username} is in water, attempting escape...`)
  
  // Jump repeatedly while moving forward to get out
  for (let i = 0; i < 20; i++) {
    bot.setControlState('jump', true)
    bot.setControlState('forward', true)
    await sleep(100)
  }
  
  bot.setControlState('jump', false)
  bot.setControlState('forward', false)
  
  // Check if still in water
  const blockAfter = bot.blockAt(bot.entity.position)
  const escaped = !blockAfter || blockAfter.name !== 'water'
  
  if (escaped) {
    console.log(`[utils] ${bot.username} escaped from water!`)
  } else {
    console.log(`[utils] ${bot.username} still stuck in water`)
  }
  
  return escaped
}

async function postToDataverse(webhookUrl, payload) {
  if (!webhookUrl) return
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    console.log('[dataverse] POST', response.status, JSON.stringify(payload))
  } catch (error) {
    console.error('[dataverse] POST failed:', error.message)
  }
}

module.exports = {
  sleep,
  stopMotion,
  jump,
  stepToward,
  toVec3,
  escapeWater,
  postToDataverse
}
