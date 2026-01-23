const http = require('http')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')
const compression = require('compression')
const express = require('express')
const socketIo = require('socket.io')
const { WebSocketServer } = require('ws')
const mineflayer = require('mineflayer')
const { WorldView } = require('prismarine-viewer/viewer')
const { Vec3 } = require('vec3')
const JOBS = require('./jobs')

// Load pathfinder for bot navigation
const pathfinder = require('mineflayer-pathfinder').pathfinder
const { goals } = require('mineflayer-pathfinder')

let mindcraftClientAvailable = true
let socketIoClient = null
try {
  socketIoClient = require('socket.io-client')
} catch (error) {
  mindcraftClientAvailable = false
}

function parseJobAssignments(raw) {
  const assignments = new Map()
  if (!raw) return assignments
  for (const entry of raw.split(',')) {
    const [botName, jobName] = entry.split('=').map(value => value.trim())
    if (!botName || !jobName) continue
    assignments.set(botName, jobName)
  }
  return assignments
}

const CONFIG = {
  host: process.env.MC_HOST || 'mc.craycon.no',
  port: Number(process.env.MC_PORT || 25565),
  username: process.env.MC_USERNAME || 'comrade_remote',
  viewerPort: Number(process.env.VIEWER_PORT || 3000),
  controlPort: Number(process.env.CONTROL_PORT || 4000),
  viewerHost: process.env.VIEWER_HOST || '',
  authToken: process.env.BOT_AUTH_TOKEN || '',
  lookSensitivity: Number(process.env.LOOK_SENSITIVITY || 0.0025),
  autoJump: process.env.AUTO_JUMP ? process.env.AUTO_JUMP === 'true' : true,
  uiPath: process.env.CONTROL_UI_PATH
    ? path.resolve(process.env.CONTROL_UI_PATH)
    : path.join(__dirname, 'remote_control_ui.html'),
  mindcraft: {
    enabled: process.env.MINDCRAFT_ENABLED !== 'false',
    host: process.env.MINDCRAFT_HOST || 'localhost',
    port: Number(process.env.MINDCRAFT_PORT || 8080),
    profilesDir: process.env.MINDCRAFT_PROFILES_DIR
      ? path.resolve(process.env.MINDCRAFT_PROFILES_DIR)
      : path.join(__dirname, '..', 'mindcraft', 'profiles')
  },
  jobs: {
    autoAssign: process.env.AUTO_ASSIGN_JOBS ? process.env.AUTO_ASSIGN_JOBS === 'true' : true,
    defaultJob: process.env.DEFAULT_JOB || '',
    assignments: parseJobAssignments(process.env.BOT_JOBS || ''),
    priority: ['brigadier', 'farmer-wheat', 'farmer-potatoes', 'farmer-beets', 'farmer', 'guard', 'scout'],
    farmer: {
      crop: process.env.FARMER_CROP || 'wheat',
      radius: Number(process.env.FARMER_RADIUS || 6),
      idleMs: Number(process.env.FARMER_IDLE_MS || 800)
    },
    guard: {
      radius: Number(process.env.GUARD_RADIUS || 8),
      hostileRange: Number(process.env.GUARD_HOSTILE_RANGE || 6),
      targetPlayer: process.env.GUARD_TARGET || '',
      stepMs: Number(process.env.GUARD_STEP_MS || 250),
      idleMs: Number(process.env.GUARD_IDLE_MS || 300),
      allowJump: process.env.GUARD_ALLOW_JUMP === 'true'
    },
    scout: {
      radius: Number(process.env.SCOUT_RADIUS || 12),
      stepMs: Number(process.env.SCOUT_STEP_MS || 250),
      idleMs: Number(process.env.SCOUT_IDLE_MS || 1200),
      allowJump: process.env.SCOUT_ALLOW_JUMP === 'true'
    }
  }
}

const UI_HTML = fs.existsSync(CONFIG.uiPath) ? fs.readFileSync(CONFIG.uiPath, 'utf8') : null
const UI_DIR = path.dirname(CONFIG.uiPath)
const UI_ASSETS = {
  '/remote_control_ui.css': {
    path: path.join(UI_DIR, 'remote_control_ui.css'),
    type: 'text/css; charset=utf-8'
  },
  '/remote_control_ui.js': {
    path: path.join(UI_DIR, 'remote_control_ui.js'),
    type: 'text/javascript; charset=utf-8'
  }
}

const VIEWER_PUBLIC_DIR = path.join(
  path.dirname(require.resolve('prismarine-viewer/package.json')),
  'public'
)
const VIEWER_CONTROL_PATH = path.join(__dirname, 'remote_control_viewer.js')
const VIEWER_CONTROL_JS = fs.existsSync(VIEWER_CONTROL_PATH)
  ? fs.readFileSync(VIEWER_CONTROL_PATH, 'utf8')
  : null
const VIEWER_HTML = `<!DOCTYPE html>
<html>
  <head>
    <title>Prismarine Viewer</title>
    <style type="text/css">
      html {
        overflow: hidden;
      }

      html, body {
        height: 100%;

        margin: 0;
        padding: 0;
      }

      canvas {
        height: 100%;
        width: 100%;
        font-size: 0;

        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <script type="text/javascript" src="/index.js"></script>
    <script type="text/javascript" src="/viewer-control.js"></script>
  </body>
</html>
`

const bots = new Map()
let nextViewerPort = CONFIG.viewerPort
let defaultBotId = null

let telemetryTimer = null

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const asset = UI_ASSETS[url.pathname]
  if (asset) {
    if (!fs.existsSync(asset.path)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Asset not found')
      return
    }
    res.writeHead(200, { 'Content-Type': asset.type })
    res.end(fs.readFileSync(asset.path))
    return
  }

  if (!UI_HTML) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end(`${path.basename(CONFIG.uiPath)} not found`)
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

function createViewerServer(state) {
  const bot = state.bot
  const app = express()
  app.use(compression())

  app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(VIEWER_HTML)
  })

  app.get('/viewer-control.js', (req, res) => {
    if (!VIEWER_CONTROL_JS) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('viewer-control.js not found')
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
    res.end(VIEWER_CONTROL_JS)
  })

  app.use('/', express.static(VIEWER_PUBLIC_DIR))

  const server = http.createServer(app)
  const io = socketIo(server, { path: '/socket.io' })
  const controlWss = new WebSocketServer({ server, path: '/control' })

  const sockets = []
  const primitives = {}

  bot.viewer = new EventEmitter()

  bot.viewer.erase = id => {
    delete primitives[id]
    for (const socket of sockets) {
      socket.emit('primitive', { id })
    }
  }

  bot.viewer.drawBoxGrid = (id, start, end, color = 'aqua') => {
    primitives[id] = { type: 'boxgrid', id, start, end, color }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  bot.viewer.drawLine = (id, points, color = 0xff0000) => {
    primitives[id] = { type: 'line', id, points, color }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  bot.viewer.drawPoints = (id, points, color = 0xff0000, size = 5) => {
    primitives[id] = { type: 'points', id, points, color, size }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  io.on('connection', socket => {
    socket.emit('version', bot.version)
    sockets.push(socket)

    const worldView = new WorldView(bot.world, 6, bot.entity.position, socket)
    worldView.init(bot.entity.position)

    worldView.on('blockClicked', (block, face, button) => {
      bot.viewer.emit('blockClicked', block, face, button)
    })

    for (const id in primitives) {
      socket.emit('primitive', primitives[id])
    }

    function botPosition() {
      const packet = { pos: bot.entity.position, yaw: bot.entity.yaw, addMesh: true, pitch: bot.entity.pitch }
      socket.emit('position', packet)
      worldView.updatePosition(bot.entity.position)
    }

    bot.on('move', botPosition)
    worldView.listenToBot(bot)
    socket.on('disconnect', () => {
      bot.removeListener('move', botPosition)
      worldView.removeListenersFromBot(bot)
      sockets.splice(sockets.indexOf(socket), 1)
    })
  })

  controlWss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const token = url.searchParams.get('token') || ''
    const remoteAddr = req.socket.remoteAddress

    if (CONFIG.authToken) {
      if (token !== CONFIG.authToken) {
        ws.close(1008, 'Unauthorized')
        return
      }
    } else if (!isLocalAddress(remoteAddr)) {
      ws.close(1008, 'Local only')
      return
    }

    ws.on('message', async message => {
      let data
      try {
        data = JSON.parse(message.toString())
      } catch (error) {
        return
      }

      if (!data || !data.type) return

      if (data.type === 'control') {
        const { control, value } = data
        if (!control) return
        stopJob(state)
        bot.setControlState(control, Boolean(value))
        return
      }

      if (data.type === 'look') {
        const { dx, dy, sensitivity, yaw, pitch } = data
        if (!bot.entity) return
        stopJob(state)
        if (Number.isFinite(yaw) && Number.isFinite(pitch)) {
          await bot.look(yaw, clamp(pitch, -1.55, 1.55), true)
          return
        }
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) return
        const scale = Number.isFinite(sensitivity) ? Number(sensitivity) : CONFIG.lookSensitivity
        const nextYaw = bot.entity.yaw - dx * scale
        const nextPitch = clamp(bot.entity.pitch - dy * scale, -1.55, 1.55)
        await bot.look(nextYaw, nextPitch, true)
      }
    })

    ws.on('close', () => {
      stopMotion(state)
    })
  })

  server.listen(state.viewerPort, () => {
    console.log(`[remote-control] ${state.id} viewer on http://localhost:${state.viewerPort}`)
    console.log(`[remote-control] ${state.id} control on http://localhost:${state.viewerPort}/?control=true`)
  })

  return {
    close: () => {
      controlWss.close()
      io.close()
      server.close()
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
  state.bot.setControlState('sneak', false)
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
    const jumped = applyAutoJump(state)
    await sleep(150)
    if (jumped) state.bot.setControlState('jump', false)
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
      const jumped = applyAutoJump(state)
      if (jumped) {
        await sleep(150)
        state.bot.setControlState('jump', false)
      }
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
    job: state.jobName || null,
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

function isSolid(block) {
  if (!block) return false
  if (block.boundingBox && block.boundingBox !== 'empty') return true
  return block.name && block.name !== 'air'
}

function getForwardBlockPos(bot) {
  const yaw = bot.entity.yaw
  const dx = -Math.sin(yaw)
  const dz = -Math.cos(yaw)
  return new Vec3(bot.entity.position.x + dx, bot.entity.position.y, bot.entity.position.z + dz)
}

function applyAutoJump(state) {
  const bot = state.bot
  if (!CONFIG.autoJump) {
    bot.setControlState('jump', false)
    return false
  }
  if (!bot.entity || !bot.entity.onGround) {
    bot.setControlState('jump', false)
    return false
  }
  const ahead = getForwardBlockPos(bot)
  const baseY = Math.floor(bot.entity.position.y)
  const blockX = Math.floor(ahead.x)
  const blockZ = Math.floor(ahead.z)
  const footBlock = bot.blockAt(new Vec3(blockX, baseY, blockZ))
  if (!isSolid(footBlock)) {
    bot.setControlState('jump', false)
    return false
  }
  const headBlock = bot.blockAt(new Vec3(blockX, baseY + 1, blockZ))
  if (headBlock && isSolid(headBlock)) {
    bot.setControlState('jump', false)
    return false
  }
  bot.setControlState('jump', true)
  return true
}

function cancelActiveTask(state) {
  if (state && state.activeTask) {
    state.activeTask.cancelled = true
    state.activeTask = null
  }
}

async function jump(state, durationMs = 250) {
  if (!state || !state.bot || !state.bot.entity) return
  state.bot.setControlState('jump', true)
  await sleep(durationMs)
  state.bot.setControlState('jump', false)
}

function getJobList() {
  return Object.values(JOBS).map(job => ({
    id: job.name,
    label: job.label || job.name
  }))
}

function buildJobOptions(jobName, overrides = {}) {
  const base = CONFIG.jobs[jobName] || {}
  return { ...base, ...overrides }
}

function startJob(state, jobName, overrides = {}) {
  const job = JOBS[jobName]
  if (!job) throw new Error(`Unknown job: ${jobName}`)
  cancelActiveTask(state)
  const options = buildJobOptions(jobName, overrides)
  state.jobName = jobName
  state.jobOptions = options
  broadcastBotList()
  startTask(state, `job:${jobName}`, task => job.run(state, task, options))
    .catch(error => {
      console.error(`[remote-control] job failed (${state.id}:${jobName})`, error)
    })
}

function stopJob(state, options = {}) {
  const hadJob = Boolean(state && state.jobName)
  cancelActiveTask(state)
  if (state) {
    state.jobName = null
    state.jobOptions = null
  }
  stopMotion(state)
  if ((options.broadcast ?? true) && hadJob) {
    broadcastBotList()
  }
}

function resolveInitialJob(botName, index) {
  const assigned = CONFIG.jobs.assignments.get(botName)
  if (assigned) return assigned
  if (CONFIG.jobs.defaultJob) return CONFIG.jobs.defaultJob
  if (!CONFIG.jobs.autoAssign) return null
  if (CONFIG.jobs.priority[index]) return CONFIG.jobs.priority[index]
  return CONFIG.jobs.priority[CONFIG.jobs.priority.length - 1] || null
}

function listMindcraftProfiles() {
  if (!CONFIG.mindcraft.profilesDir) return []
  if (!fs.existsSync(CONFIG.mindcraft.profilesDir)) return []
  return fs.readdirSync(CONFIG.mindcraft.profilesDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.basename(file, '.json'))
}

let mindcraftSocket = null
let mindcraftConnecting = null
let mindcraftConnected = false
let mindcraftAgents = []
let mindcraftConfig = {
  host: CONFIG.mindcraft.host,
  port: CONFIG.mindcraft.port
}

function getMindcraftStatus() {
  return {
    enabled: CONFIG.mindcraft.enabled,
    available: mindcraftClientAvailable,
    connected: mindcraftConnected,
    host: mindcraftConfig.host,
    port: mindcraftConfig.port,
    agents: mindcraftAgents
  }
}

function broadcastMindcraftStatus() {
  broadcast({ type: 'mindcraft-status', payload: getMindcraftStatus() })
}

async function ensureMindcraftConnection(overrides = {}) {
  if (!CONFIG.mindcraft.enabled) {
    throw new Error('Mindcraft integration disabled')
  }
  if (!mindcraftClientAvailable) {
    throw new Error('socket.io-client not available (run npm install)')
  }

  const host = overrides.host || mindcraftConfig.host
  const port = Number(overrides.port || mindcraftConfig.port)

  if (mindcraftSocket && mindcraftConnected && host === mindcraftConfig.host && port === mindcraftConfig.port) {
    return mindcraftSocket
  }

  if (mindcraftSocket) {
    mindcraftSocket.disconnect()
    mindcraftSocket = null
    mindcraftConnected = false
  }

  mindcraftConfig = { host, port }

  if (mindcraftConnecting) return mindcraftConnecting

  const socketFactory = socketIoClient.io ? socketIoClient.io : socketIoClient
  mindcraftConnecting = new Promise((resolve, reject) => {
    const socket = socketFactory(`http://${host}:${port}`)
    mindcraftSocket = socket

    socket.on('connect', () => {
      mindcraftConnected = true
      mindcraftConnecting = null
      broadcastMindcraftStatus()
      resolve(socket)
    })

    socket.on('disconnect', () => {
      mindcraftConnected = false
      broadcastMindcraftStatus()
    })

    socket.on('connect_error', error => {
      mindcraftConnected = false
      mindcraftConnecting = null
      broadcastMindcraftStatus()
      reject(error)
    })

    socket.on('agents-status', agents => {
      mindcraftAgents = agents || []
      broadcastMindcraftStatus()
    })
  })

  return mindcraftConnecting
}

function getBotList() {
  return Array.from(bots.values()).map(state => ({
    id: state.id,
    name: state.bot.username,
    viewerPort: state.viewerPort,
    inGame: Boolean(state.bot && state.bot.entity),
    job: state.jobName || null
  }))
}

function broadcastBotList() {
  broadcast({ type: 'bot-list', payload: { bots: getBotList() } })
}

function generateComradeName() {
  const existingNames = new Set(Array.from(bots.keys()))
  for (let i = 0; i < 100; i++) {
    const num = String(i).padStart(2, '0')
    const name = `comrade_${num}`
    if (!existingNames.has(name)) return name
  }
  // Fallback to timestamp if all 00-99 are taken
  return `comrade_${Date.now() % 10000}`
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

// Track last spawn position for spacing
let lastSpawnPosition = null
let spawnOffsetAxis = 'x' // alternate between 'x' and 'z'

function spawnBot({ username, host, port, jobType }) {
  // Auto-generate name if not provided
  const id = username || generateComradeName()
  if (bots.has(id)) throw new Error(`Bot already exists: ${id}`)

  const index = bots.size
  const viewerPort = nextViewerPort
  nextViewerPort += 1

  const bot = mineflayer.createBot({
    username: id,
    host,
    port
  })

  // Load pathfinder plugin for navigation
  bot.loadPlugin(pathfinder)

  const state = {
    id,
    bot,
    viewerPort,
    activeTask: null,
    jobName: null,
    jobOptions: null,
    assignedJob: resolveInitialJob(id, index),
    deathCount: 0
  }

  bots.set(id, state)
  if (!defaultBotId) defaultBotId = id

  bot.once('spawn', () => {
    state.viewerServer = createViewerServer(state)
    startTelemetry()
    broadcastBotList()
    bot.chat(`Comrade ${id} reporting for duty!`)
    
    // Store spawn position for bulk spawn spacing
    lastSpawnPosition = bot.entity.position.clone()
    
    // If jobType was specified during spawn, assign it
    if (jobType && JOBS[jobType]) {
      state.assignedJob = jobType
    }
    
    if (state.assignedJob && JOBS[state.assignedJob]) {
      try {
        startJob(state, state.assignedJob)
      } catch (error) {
        console.error(`[remote-control] ${id} job start failed`, error)
      }
    }
  })

  // Handle respawn after death
  bot.on('spawn', () => {
    if (state.deathCount > 0) {
      console.log(`[remote-control] ${id} respawned after death #${state.deathCount}`)
      bot.chat(`Comrade ${id} back from gulag! Resuming work.`)
      // Resume job if one was assigned
      if (state.assignedJob && JOBS[state.assignedJob]) {
        try {
          startJob(state, state.assignedJob)
        } catch (error) {
          console.error(`[remote-control] ${id} job restart failed`, error)
        }
      }
    }
  })

  bot.on('death', () => {
    state.deathCount++
    console.log(`[remote-control] ${id} died (death #${state.deathCount})`)
    bot.chat(`Comrade ${id} has fallen! Respawning...`)
    if (state.activeTask) state.activeTask.cancelled = true
    stopMotion(state)
  })

  bot.on('end', () => {
    if (state.activeTask) state.activeTask.cancelled = true
    stopMotion(state)
    state.jobName = null
    state.jobOptions = null
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
      lookSensitivity: CONFIG.lookSensitivity,
      mcHost: CONFIG.host,
      mcPort: CONFIG.port,
      viewerHost: CONFIG.viewerHost,
      jobs: getJobList(),
      mindcraft: {
        enabled: CONFIG.mindcraft.enabled,
        available: mindcraftClientAvailable,
        host: mindcraftConfig.host,
        port: mindcraftConfig.port,
        profiles: listMindcraftProfiles()
      }
    }
  })
  send(ws, { type: 'mindcraft-status', payload: getMindcraftStatus() })

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
      let didChange = false
      for (const state of targets) {
        if (state.jobName) didChange = true
        stopJob(state, { broadcast: false })
        stopMotion(state)
      }
      if (didChange) broadcastBotList()
      send(ws, { type: 'done', id })
      return
    }

    try {
      if (type === 'move') {
        const state = getState(args.botId)
        stopJob(state)
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
        stopJob(state)
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
        stopJob(state)
        state.bot.setControlState(control, Boolean(value))
        send(ws, { type: 'done', id })
        return
      }

      if (type === 'look') {
        const state = getState(args.botId)
        stopJob(state)
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

      if (type === 'jump') {
        const state = getState(args.botId)
        stopJob(state)
        await jump(state, Number(args.durationMs) || 250)
        send(ws, { type: 'done', id })
        return
      }

      if (type === 'job') {
        const state = getState(args.botId)
        const { action, job, options } = args
        if (!action) throw new Error('job requires action')
        if (action === 'start') {
          if (!job) throw new Error('job.start requires job')
          send(ws, { type: 'ack', id })
          startJob(state, job, options || {})
          send(ws, { type: 'done', id })
          broadcastBotList()
          return
        }
        if (action === 'stop') {
          stopJob(state)
          send(ws, { type: 'done', id })
          broadcastBotList()
          return
        }
        throw new Error(`Unknown job action: ${action}`)
      }

      if (type === 'mindcraft') {
        const { action } = args
        if (!action) throw new Error('mindcraft requires action')
        send(ws, { type: 'ack', id })
        if (action === 'connect') {
          await ensureMindcraftConnection({ host: args.host, port: args.port })
          send(ws, { type: 'done', id })
          return
        }
        if (action === 'create') {
          const profileName = args.profile
          if (!profileName) throw new Error('mindcraft.create requires profile')
          const profilePath = path.join(CONFIG.mindcraft.profilesDir, `${profileName}.json`)
          if (!fs.existsSync(profilePath)) throw new Error(`Profile not found: ${profileName}`)
          const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
          if (args.name) profile.name = args.name
          const settings = {
            profile,
            host: args.host || CONFIG.host,
            port: Number(args.port || CONFIG.port),
            auth: args.auth || 'offline',
            base_profile: args.baseProfile || 'survival',
            init_message: args.initMessage || 'Respond with hello world and your name'
          }
          const socket = await ensureMindcraftConnection({ host: args.mindcraftHost, port: args.mindcraftPort })
          const result = await new Promise(resolve => {
            socket.emit('create-agent', settings, resolve)
          })
          if (!result || !result.success) {
            throw new Error(result && result.error ? result.error : 'Mindcraft create-agent failed')
          }
          send(ws, { type: 'done', id })
          return
        }
        if (action === 'start') {
          if (!args.name) throw new Error('mindcraft.start requires name')
          const socket = await ensureMindcraftConnection({ host: args.mindcraftHost, port: args.mindcraftPort })
          socket.emit('start-agent', args.name)
          send(ws, { type: 'done', id })
          return
        }
        if (action === 'stop') {
          if (!args.name) throw new Error('mindcraft.stop requires name')
          const socket = await ensureMindcraftConnection({ host: args.mindcraftHost, port: args.mindcraftPort })
          socket.emit('stop-agent', args.name)
          send(ws, { type: 'done', id })
          return
        }
        if (action === 'destroy') {
          if (!args.name) throw new Error('mindcraft.destroy requires name')
          const socket = await ensureMindcraftConnection({ host: args.mindcraftHost, port: args.mindcraftPort })
          socket.emit('destroy-agent', args.name)
          send(ws, { type: 'done', id })
          return
        }
        if (action === 'status') {
          await ensureMindcraftConnection({ host: args.mindcraftHost, port: args.mindcraftPort })
          send(ws, { type: 'done', id, payload: getMindcraftStatus() })
          return
        }
        throw new Error(`Unknown mindcraft action: ${action}`)
      }

      if (type === 'spawn') {
        const { username, jobType } = args
        // Username is now optional - will auto-generate if not provided
        send(ws, { type: 'ack', id })
        const state = spawnBot({ username, host: CONFIG.host, port: CONFIG.port, jobType })
        send(ws, { type: 'done', id, payload: { botId: state.id, viewerPort: state.viewerPort } })
        broadcastBotList()
        return
      }

      if (type === 'bulk-spawn') {
        const { jobType, count } = args
        if (!jobType || !JOBS[jobType]) {
          throw new Error(`Invalid job type: ${jobType}`)
        }
        if (!count || count < 1 || count > 10) {
          throw new Error(`Invalid count: ${count} (must be 1-10)`)
        }
        
        send(ws, { type: 'ack', id })
        console.log(`[remote-control] Bulk spawning ${count} ${jobType} farmers...`)
        
        const spawnedBots = []
        
        for (let i = 0; i < count; i++) {
          // Generate unique name
          const username = generateComradeName()
          
          // Spawn bot with job type
          const state = spawnBot({ 
            username, 
            host: CONFIG.host, 
            port: CONFIG.port,
            jobType 
          })
          
          spawnedBots.push({
            botId: state.id,
            viewerPort: state.viewerPort,
            jobType
          })
          
          // Wait for bot to spawn and then move it
          state.bot.once('spawn', async () => {
            if (lastSpawnPosition && i > 0) {
              // Calculate offset position (10 blocks apart)
              const offset = 10 * i
              const targetPos = lastSpawnPosition.clone()
              
              // Alternate between X and Z axis for spacing
              if (spawnOffsetAxis === 'x') {
                targetPos.x += offset
              } else {
                targetPos.z += offset
              }
              
              console.log(`[remote-control] Moving ${username} to offset position: ${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)}, ${targetPos.z.toFixed(1)}`)
              
              // Use pathfinder to move to position
              try {
                if (state.bot.pathfinder) {
                  const goal = new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 1)
                  await state.bot.pathfinder.goto(goal)
                  console.log(`[remote-control] ${username} reached offset position`)
                }
              } catch (error) {
                console.error(`[remote-control] ${username} movement failed:`, error.message)
              }
            }
            
            // Toggle axis for next spawn
            if (i === count - 1) {
              spawnOffsetAxis = spawnOffsetAxis === 'x' ? 'z' : 'x'
            }
          })
          
          // Small delay between spawns
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        send(ws, { 
          type: 'done', 
          id, 
          payload: { 
            count: spawnedBots.length,
            bots: spawnedBots 
          } 
        })
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
