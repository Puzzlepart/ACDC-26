const http = require('http')
const fs = require('fs')
const path = require('path')
const { WebSocketServer } = require('ws')
const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer
const { Vec3 } = require('vec3')

const CONFIG = {
  host: 'mc.craycon.no',
  port: 25565,
  username: process.env.MC_USERNAME || 'comrade_remote',
  viewerPort: Number(process.env.VIEWER_PORT || 3000),
  controlPort: Number(process.env.CONTROL_PORT || 4000),
  authToken: process.env.BOT_AUTH_TOKEN || ''
}

const UI_PATH = path.join(__dirname, 'remote_control_ui.html')
const UI_HTML = fs.existsSync(UI_PATH) ? fs.readFileSync(UI_PATH, 'utf8') : null

const bot = mineflayer.createBot({
  username: CONFIG.username,
  host: CONFIG.host,
  port: CONFIG.port
})

let activeTask = null
let telemetryTimer = null

const server = http.createServer((req, res) => {
  if (!UI_HTML) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('remote_control_ui.html not found')
    return
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(UI_HTML)
})

const wss = new WebSocketServer({ server })

function isLocalAddress(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function send(ws, payload) {
  if (ws.readyState !== ws.OPEN) return
  ws.send(JSON.stringify(payload))
}

function broadcast(payload) {
  const data = JSON.stringify(payload)
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(data)
    }
  }
}

function stopMotion() {
  if (!bot || !bot.entity) return
  bot.setControlState('forward', false)
  bot.setControlState('back', false)
  bot.setControlState('left', false)
  bot.setControlState('right', false)
  bot.setControlState('jump', false)
  bot.setControlState('sprint', false)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function moveTo(task, target, range = 1.2, timeoutMs = 60000) {
  const start = Date.now()
  while (!task.cancelled) {
    if (!bot.entity) throw new Error('Bot not spawned')
    const distance = bot.entity.position.distanceTo(target)
    if (distance <= range) break

    if (Date.now() - start > timeoutMs) {
      throw new Error('Move timeout')
    }

    await bot.lookAt(target, true)
    bot.setControlState('forward', true)
    await sleep(150)
  }
  stopMotion()
}

async function followPlayer(task, playerName, distance = 3) {
  while (!task.cancelled) {
    const player = bot.players[playerName]
    if (!player || !player.entity) {
      stopMotion()
      await sleep(500)
      continue
    }

    const target = player.entity.position
    const dist = bot.entity.position.distanceTo(target)
    if (dist > distance) {
      await bot.lookAt(target, true)
      bot.setControlState('forward', true)
    } else {
      stopMotion()
    }

    await sleep(200)
  }
  stopMotion()
}

function startTask(name, runner) {
  if (activeTask) {
    throw new Error(`Busy with ${activeTask.name}`)
  }

  const task = { name, cancelled: false }
  activeTask = task

  return runner(task)
    .finally(() => {
      if (activeTask === task) {
        activeTask = null
      }
      stopMotion()
    })
}

function buildTelemetry() {
  if (!bot || !bot.entity) {
    return { inGame: false }
  }

  const pos = bot.entity.position
  return {
    inGame: true,
    name: bot.username,
    health: bot.health,
    food: bot.food,
    position: { x: pos.x, y: pos.y, z: pos.z },
    yaw: bot.entity.yaw,
    pitch: bot.entity.pitch,
    task: activeTask ? activeTask.name : 'idle',
    inventory: bot.inventory.items().slice(0, 8).map(item => ({
      name: item.name,
      count: item.count
    }))
  }
}

function startTelemetry() {
  if (telemetryTimer) return
  telemetryTimer = setInterval(() => {
    broadcast({ type: 'telemetry', payload: buildTelemetry(), ts: Date.now() })
  }, 500)
}

function stopTelemetry() {
  if (!telemetryTimer) return
  clearInterval(telemetryTimer)
  telemetryTimer = null
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const token = url.searchParams.get('token') || ''
  const remoteAddr = req.socket.remoteAddress

  if (CONFIG.authToken) {
    if (token !== CONFIG.authToken) {
      send(ws, { type: 'error', message: 'Unauthorized' })
      ws.close(1008, 'Unauthorized')
      return
    }
  } else if (!isLocalAddress(remoteAddr)) {
    send(ws, { type: 'error', message: 'Local connections only (set BOT_AUTH_TOKEN to allow remote)' })
    ws.close(1008, 'Local only')
    return
  }

  send(ws, {
    type: 'hello',
    payload: {
      botName: CONFIG.username,
      viewerPort: CONFIG.viewerPort,
      viewerUrl: `http://localhost:${CONFIG.viewerPort}`,
      controlPort: CONFIG.controlPort
    }
  })

  ws.on('message', async message => {
    let data
    try {
      data = JSON.parse(message.toString())
    } catch (error) {
      send(ws, { type: 'error', message: 'Invalid JSON' })
      return
    }

    const { type, id, args = {} } = data

    if (!type) {
      send(ws, { type: 'error', id, message: 'Missing type' })
      return
    }

    if (type === 'status') {
      send(ws, { type: 'status', id, payload: buildTelemetry() })
      return
    }

    if (type === 'stop') {
      if (activeTask) activeTask.cancelled = true
      stopMotion()
      send(ws, { type: 'done', id })
      return
    }

    try {
      if (type === 'move') {
        const { x, y, z } = args
        if (![x, y, z].every(value => Number.isFinite(value))) {
          throw new Error('move requires numeric x, y, z')
        }
        send(ws, { type: 'ack', id })
        await startTask('move', task => moveTo(task, new Vec3(x, y, z)))
        send(ws, { type: 'done', id })
        return
      }

      if (type === 'follow') {
        const { playerName, distance } = args
        if (!playerName) throw new Error('follow requires playerName')
        send(ws, { type: 'ack', id })
        await startTask('follow', task => followPlayer(task, playerName, Number(distance) || 3))
        send(ws, { type: 'done', id })
        return
      }

      send(ws, { type: 'error', id, message: `Unknown type: ${type}` })
    } catch (error) {
      send(ws, { type: 'error', id, message: error.message || 'Command failed' })
    }
  })
})

bot.once('spawn', () => {
  mineflayerViewer(bot, { port: CONFIG.viewerPort, firstPerson: true })
  startTelemetry()
  console.log(`[remote-control] viewer on http://localhost:${CONFIG.viewerPort}`)
})

bot.on('end', () => {
  stopTelemetry()
  if (activeTask) activeTask.cancelled = true
})

bot.on('error', err => {
  console.error('[remote-control] bot error', err)
})

server.listen(CONFIG.controlPort, () => {
  console.log(`[remote-control] ui on http://localhost:${CONFIG.controlPort}`)
})
