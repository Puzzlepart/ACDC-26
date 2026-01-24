const { Vec3 } = require('vec3')
const { sleep, stopMotion } = require('./utils')

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDirection() {
  const angle = Math.random() * Math.PI * 2
  return new Vec3(-Math.sin(angle), 0, -Math.cos(angle))
}

async function lookAround(bot) {
  const lookCount = randomInt(1, 3)
  for (let i = 0; i < lookCount; i++) {
    const yaw = Math.random() * Math.PI * 2
    const pitch = (Math.random() - 0.5) * 0.8
    await bot.look(yaw, pitch, false)
    await sleep(randomInt(800, 2500))
  }
}

async function run(state, task, options) {
  const bot = state.bot
  const idleMs = Number(options.idleMs || 1500)

  let announced = false

  while (!task.cancelled) {
    if (!bot.entity) {
      await sleep(500)
      continue
    }

    if (!announced) {
      bot.chat('Just wandering around...')
      announced = true
    }

    // Decide what to do: stand, look around, or walk
    const action = randomInt(1, 10)

    if (action <= 3) {
      // Stand still for a bit
      stopMotion(bot)
      await sleep(randomInt(2000, 6000))
    } else if (action <= 5) {
      // Look around curiously
      stopMotion(bot)
      await lookAround(bot)
    } else {
      // Walk in a random direction
      const dir = randomDirection()
      const duration = randomInt(1500, 4000)

      await bot.look(Math.atan2(-dir.x, -dir.z), 0, false)
      await sleep(200)

      bot.setControlState('forward', true)

      const startTime = Date.now()
      while (!task.cancelled && Date.now() - startTime < duration) {
        // Occasionally jump if blocked
        if (bot.entity.onGround && Math.random() < 0.1) {
          bot.setControlState('jump', true)
          await sleep(100)
          bot.setControlState('jump', false)
        }
        await sleep(100)
      }

      stopMotion(bot)
    }

    await sleep(idleMs)
  }

  stopMotion(bot)
  bot.chat('Stopped wandering.')
}

module.exports = {
  name: 'wanderer',
  label: 'Wanderer',
  run
}
