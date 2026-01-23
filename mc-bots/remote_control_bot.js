const http = require('http')
const fs = require('fs')
const path = require('path')
const { WebSocketServer } = require('ws')
const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer
const { Vec3 } = require('vec3')

const CONFIG = {
  host: process.env.MC_HOST || 'mc.craycon.no',
  port: Number(process.env.MC_PORT || 25565),
  username: process.env.MC_USERNAME || 'comrade_remote',
  viewerPort: Number(process.env.VIEWER_PORT || 3000),
  controlPort: Number(process.env.CONTROL_PORT || 4000),
  authToken: process.env.BOT_AUTH_TOKEN || '',
  lookSensitivity: Number(process.env.LOOK_SENSITIVITY || 0.0025)
}

const UI_PATH = path.join(__dirname, 'remote_control_ui.html')
const UI_HTML = fs.existsSync(UI_PATH) ? fs.readFileSync(UI_PATH, 'utf8') : null

const bots = new Map()
let nextViewerPort = CONFIG.viewerPort
let defaultBotId = null

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

function stopMotion(state) {
  if (!state || !state.bot || !state.bot.entity) return
  state.bot.setControlState('forward', false)
  state.bot.setControlState('back', false)
  state.bot.setControlState('left', false)
  state.bot.setControlState('right', false)
  state.bot.setControlState('jump', false)
  state.bot.setControlState('sprint', false)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function moveTo(state, task, target, range = 1.2, timeoutMs = 60000) {
  const start = Date.now()
  while (!task.cancelled) {
    if (!state.bot.entity) throw new Error('Bot not spawned')
    const distance = state.bot.entity.position.distanceTo(target)
    if (distance <= range) break

    if (Date.now() - start > timeoutMs) {
      throw new Error('Move timeout')
    }

    await state.bot.lookAt(target, true)
    state.bot.setControlState('forward', true)
    await sleep(150)
  }
  stopMotion(state)
}

async function followPlayer(state, task, playerName, distance = 3) {
  while (!task.cancelled) {
    const player = state.bot.players[playerName]
    if (!player || !player.entity) {
      stopMotion(state)
      await sleep(500)
      continue
    }

    const target = player.entity.position
    const dist = state.bot.entity.position.distanceTo(target)
    if (dist > distance) {
      await state.bot.lookAt(target, true)
      state.bot.setControlState('forward', true)
    } else {
      stopMotion(state)
    }

    await sleep(200)
  }
  stopMotion(state)
}

function startTask(state, name, runner) {
  if (state.activeTask) {
    throw new Error(`Bot busy with ${state.activeTask.name}`)
  }

  const task = { name, cancelled: false }
  state.activeTask = task

  return runner(task)
    .finally(() => {
      if (state.activeTask === task) {
        state.activeTask = null
      }
      stopMotion(state)
    })
}

function buildTelemetry(state) {
  if (!state || !state.bot || !state.bot.entity) {
    return { id: state ? state.id : 'unknown', inGame: false }
  }

  const pos = state.bot.entity.position
  return {
    id: state.id,
    inGame: true,
    name: state.bot.username,
    health: state.bot.health,
    food: state.bot.food,
    position: { x: pos.x, y: pos.y, z: pos.z },
    yaw: state.bot.entity.yaw,
    pitch: state.bot.entity.pitch,
    task: state.activeTask ? state.activeTask.name : 'idle',
    inventory: state.bot.inventory.items().slice(0, 8).map(item => ({
      name: item.name,
      count: item.count
    }))
  }
}

function startTelemetry() {
  if (telemetryTimer) return
  telemetryTimer = setInterval(() => {
    const payload = {
      bots: Array.from(bots.values()).map(state => buildTelemetry(state))
    }
    broadcast({ type: 'telemetry', payload, ts: Date.now() })
  }, 500)
}

function stopTelemetry() {
  if (!telemetryTimer) return
  clearInterval(telemetryTimer)
  telemetryTimer = null
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getBotList() {
  return Array.from(bots.values()).map(state => ({
    id: state.id,
    name: state.bot.username,
    viewerPort: state.viewerPort,
    inGame: Boolean(state.bot && state.bot.entity)
  }))
}

function broadcastBotList() {
  broadcast({ type: 'bot-list', payload: { bots: getBotList() } })
}

function getState(botId) {
  if (botId) {
    const state = bots.get(botId)
    if (!state) throw new Error(`Unknown bot: ${botId}`)
    return state
  }
  if (defaultBotId && bots.has(defaultBotId)) return bots.get(defaultBotId)
  const first = bots.values().next().value
  if (first) return first
  throw new Error('No bots available')
}

function spawnBot({ username, host, port }) {
  const id = username
  if (!id) throw new Error('username required')
  if (bots.has(id)) throw new Error(`Bot already exists: ${id}`)

  const viewerPort = nextViewerPort
  nextViewerPort += 1

  const bot = mineflayer.createBot({
    username,
    host,
    port
  })

  const state = {
    id,
    bot,
    viewerPort,
    activeTask: null
  }

  bots.set(id, state)
  if (!defaultBotId) defaultBotId = id

  bot.once('spawn', () => {
    mineflayerViewer(bot, { port: viewerPort, firstPerson: true })
    startTelemetry()
    broadcastBotList()
    console.log(`[remote-control] ${id} viewer on http://localhost:${viewerPort}`)
  })

  bot.on('end', () => {
    if (state.activeTask) state.activeTask.cancelled = true
    stopMotion(state)
    broadcastBotList()
  })

  bot.on('error', err => {
    console.error(`[remote-control] bot error (${id})`, err)
  })

  return state
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
      bots: getBotList(),
      defaultBotId,
      controlPort: CONFIG.controlPort,
      lookSensitivity: CONFIG.lookSensitivity
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
      const state = getState(args.botId)
      send(ws, { type: 'status', id, payload: buildTelemetry(state) })
      return
    }

    if (type === 'stop') {
      const targets = args.botId ? [getState(args.botId)] : Array.from(bots.values())
      for (const state of targets) {
        if (state.activeTask) state.activeTask.cancelled = true
        stopMotion(state)
      }
      send(ws, { type: 'done', id })
      return
    }

    try {
      if (type === 'move') {
        const state = getState(args.botId)
        const { x, y, z } = args
        if (![x, y, z].every(value => Number.isFinite(value))) {
          throw new Error('move requires numeric x, y, z')
        }
        send(ws, { type: 'ack', id })
        await startTask(state, 'move', task => moveTo(state, task, new Vec3(x, y, z)))
        send(ws, { type: 'done', id })
        return
      }

      if (type === 'follow') {
        const state = getState(args.botId)
        const { playerName, distance } = args
        if (!playerName) throw new Error('follow requires playerName')
        send(ws, { type: 'ack', id })
        await startTask(state, 'follow', task => followPlayer(state, task, playerName, Number(distance) || 3))
        send(ws, { type: 'done', id })
        return
      }

      if (type === 'control') {
        const state = getState(args.botId)
        const { control, value } = args
        if (!control) throw new Error('control requires control name')
        if (state.activeTask) state.activeTask.cancelled = true
        state.bot.setControlState(control, Boolean(value))
        send(ws, { type: 'done', id })
        return
      }

      if (type === 'look') {
        const state = getState(args.botId)
        const { dx, dy, yaw, pitch, sensitivity } = args
        if (!state.bot.entity) throw new Error('Bot not spawned')
        if (Number.isFinite(yaw) && Number.isFinite(pitch)) {
          await state.bot.look(yaw, clamp(pitch, -1.55, 1.55), true)
          send(ws, { type: 'done', id })
          return
        }
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
          throw new Error('look requires dx/dy or yaw/pitch')
        }
        const scale = Number.isFinite(sensitivity) ? Number(sensitivity) : CONFIG.lookSensitivity
        const nextYaw = state.bot.entity.yaw - dx * scale
        const nextPitch = clamp(state.bot.entity.pitch - dy * scale, -1.55, 1.55)
        await state.bot.look(nextYaw, nextPitch, true)
        send(ws, { type: 'done', id })
        return
      }

      if (type === 'spawn') {
        const { username } = args
        if (!username) throw new Error('spawn requires username')
        send(ws, { type: 'ack', id })
        const state = spawnBot({ username, host: CONFIG.host, port: CONFIG.port })
        send(ws, { type: 'done', id, payload: { botId: state.id, viewerPort: state.viewerPort } })
        broadcastBotList()
        return
      }

      send(ws, { type: 'error', id, message: `Unknown type: ${type}` })
    } catch (error) {
      send(ws, { type: 'error', id, message: error.message || 'Command failed' })
    }
  })
})

const initialBotNames = (process.env.MC_BOTS || CONFIG.username)
  .split(',')
  .map(name => name.trim())
  .filter(Boolean)

for (const name of initialBotNames) {
  spawnBot({ username: name, host: CONFIG.host, port: CONFIG.port })
}

server.listen(CONFIG.controlPort, () => {
  console.log(`[remote-control] ui on http://localhost:${CONFIG.controlPort}`)
})
