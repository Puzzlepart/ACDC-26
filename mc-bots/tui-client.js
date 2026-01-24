#!/usr/bin/env node
const blessed = require('blessed')
const WebSocket = require('ws')

const SERVER_URL = process.env.BOT_SERVER || 'ws://135.225.56.193:4000'

let ws = null
let bots = []
let jobs = []
let selectedIndex = 0
let connected = false

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Minecraft Bot Control'
})

// Header
const header = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: '{center}{bold}MINECRAFT BOT CONTROL{/bold}{/center}',
  tags: true,
  style: { fg: 'white', bg: 'blue' }
})

// Status bar
const statusBar = blessed.box({
  top: 3,
  left: 0,
  width: '100%',
  height: 1,
  content: ' Connecting...',
  tags: true,
  style: { fg: 'black', bg: 'yellow' }
})

// Bot list
const botList = blessed.list({
  top: 4,
  left: 0,
  width: '50%',
  height: '60%',
  label: ' Bots ',
  border: { type: 'line' },
  style: {
    border: { fg: 'cyan' },
    selected: { bg: 'blue', fg: 'white' },
    item: { fg: 'white' }
  },
  keys: true,
  vi: true,
  mouse: true,
  scrollable: true
})

// Bot details
const detailsBox = blessed.box({
  top: 4,
  left: '50%',
  width: '50%',
  height: '60%',
  label: ' Details ',
  border: { type: 'line' },
  tags: true,
  style: { border: { fg: 'cyan' } },
  scrollable: true
})

// Actions box
const actionsBox = blessed.box({
  top: '64%',
  left: 0,
  width: '100%',
  height: 5,
  label: ' Actions ',
  border: { type: 'line' },
  tags: true,
  content: ' {bold}[S]{/bold} Spawn Bot  {bold}[J]{/bold} Change Job  {bold}[K]{/bold} Kill Bot  {bold}[R]{/bold} Refresh  {bold}[Q]{/bold} Quit',
  style: { border: { fg: 'green' } }
})

// Log box
const logBox = blessed.log({
  top: '64%+5',
  left: 0,
  width: '100%',
  height: '36%-5',
  label: ' Log ',
  border: { type: 'line' },
  tags: true,
  style: { border: { fg: 'magenta' } },
  scrollable: true,
  alwaysScroll: true,
  scrollbar: { ch: ' ', style: { bg: 'magenta' } }
})

// Job selection dialog
const jobDialog = blessed.list({
  top: 'center',
  left: 'center',
  width: 40,
  height: 15,
  label: ' Select Job ',
  border: { type: 'line' },
  style: {
    border: { fg: 'yellow' },
    selected: { bg: 'yellow', fg: 'black' }
  },
  keys: true,
  vi: true,
  hidden: true
})

// Spawn dialog
const spawnDialog = blessed.form({
  top: 'center',
  left: 'center',
  width: 50,
  height: 12,
  label: ' Spawn New Bot ',
  border: { type: 'line' },
  style: { border: { fg: 'green' } },
  keys: true,
  hidden: true
})

const spawnJobLabel = blessed.text({
  parent: spawnDialog,
  top: 1,
  left: 2,
  content: 'Job Type:'
})

const spawnJobList = blessed.list({
  parent: spawnDialog,
  top: 2,
  left: 2,
  width: 44,
  height: 6,
  style: { selected: { bg: 'green', fg: 'black' } },
  keys: true,
  vi: true
})

const spawnHint = blessed.text({
  parent: spawnDialog,
  top: 9,
  left: 2,
  content: 'Enter to spawn, Esc to cancel',
  style: { fg: 'gray' }
})

screen.append(header)
screen.append(statusBar)
screen.append(botList)
screen.append(detailsBox)
screen.append(actionsBox)
screen.append(logBox)
screen.append(jobDialog)
screen.append(spawnDialog)

function log(msg) {
  const time = new Date().toLocaleTimeString()
  logBox.log(`{gray-fg}[${time}]{/} ${msg}`)
  screen.render()
}

function updateStatus(msg, color = 'yellow') {
  statusBar.style.bg = color
  statusBar.setContent(` ${msg}`)
  screen.render()
}

function updateBotList() {
  const items = bots.map(b => {
    const status = b.inGame ? '{green-fg}●{/}' : '{red-fg}●{/}'
    const job = b.job || 'idle'
    return ` ${status} ${b.name || b.id} [${job}]`
  })
  botList.setItems(items)
  botList.select(selectedIndex)
  screen.render()
}

function updateDetails() {
  if (bots.length === 0) {
    detailsBox.setContent(' No bots connected')
    screen.render()
    return
  }

  const bot = bots[selectedIndex] || bots[0]
  if (!bot) return

  const content = [
    `{bold}Name:{/bold} ${bot.name || bot.id}`,
    `{bold}ID:{/bold} ${bot.id}`,
    `{bold}Status:{/bold} ${bot.inGame ? '{green-fg}In Game{/}' : '{red-fg}Disconnected{/}'}`,
    `{bold}Job:{/bold} ${bot.job || 'None'}`,
    `{bold}Viewer:{/bold} Port ${bot.viewerPort}`,
    '',
    '{gray-fg}Use J to change job{/}'
  ].join('\n')

  detailsBox.setContent(content)
  screen.render()
}

function connect() {
  log('Connecting to ' + SERVER_URL)

  ws = new WebSocket(SERVER_URL)

  ws.on('open', () => {
    connected = true
    updateStatus('Connected to server', 'green')
    log('{green-fg}Connected!{/}')
  })

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      handleMessage(msg)
    } catch (e) {
      log(`{red-fg}Parse error: ${e.message}{/}`)
    }
  })

  ws.on('close', () => {
    connected = false
    updateStatus('Disconnected - Reconnecting...', 'red')
    log('{red-fg}Disconnected{/}')
    setTimeout(connect, 3000)
  })

  ws.on('error', (err) => {
    log(`{red-fg}Error: ${err.message}{/}`)
  })
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'hello':
      bots = msg.payload.bots || []
      jobs = msg.payload.jobs || []
      updateBotList()
      updateDetails()
      log(`Received ${bots.length} bots, ${jobs.length} job types`)
      break

    case 'bot-list':
      bots = msg.payload.bots || []
      updateBotList()
      updateDetails()
      break

    case 'telemetry':
      // Update bot status from telemetry
      const telemetry = msg.payload.bots || []
      for (const t of telemetry) {
        const bot = bots.find(b => b.id === t.id)
        if (bot) {
          bot.inGame = t.inGame
          bot.job = t.job
          bot.name = t.name
        }
      }
      updateBotList()
      updateDetails()
      break

    case 'done':
      log('{green-fg}Action completed{/}')
      break

    case 'error':
      log(`{red-fg}Error: ${msg.message}{/}`)
      break
  }
}

function send(type, args = {}) {
  if (!connected || !ws) {
    log('{red-fg}Not connected{/}')
    return
  }
  ws.send(JSON.stringify({ type, args, id: Date.now() }))
}

// Key bindings
botList.on('select item', (item, index) => {
  selectedIndex = index
  updateDetails()
})

screen.key(['q', 'C-c'], () => {
  if (ws) ws.close()
  process.exit(0)
})

screen.key('r', () => {
  log('Refreshing...')
  if (ws && connected) {
    ws.close()
  }
  connect()
})

screen.key('s', () => {
  // Show spawn dialog
  spawnJobList.setItems(jobs.map(j => j.label || j.id))
  spawnJobList.select(0)
  spawnDialog.show()
  spawnJobList.focus()
  screen.render()
})

spawnJobList.key('enter', () => {
  const idx = spawnJobList.selected
  const job = jobs[idx]
  if (job) {
    log(`Spawning bot with job: ${job.id}`)
    send('spawn', { jobType: job.id })
  }
  spawnDialog.hide()
  botList.focus()
  screen.render()
})

spawnJobList.key('escape', () => {
  spawnDialog.hide()
  botList.focus()
  screen.render()
})

screen.key('j', () => {
  if (bots.length === 0) {
    log('{yellow-fg}No bots to modify{/}')
    return
  }
  jobDialog.setItems(jobs.map(j => j.label || j.id))
  jobDialog.select(0)
  jobDialog.show()
  jobDialog.focus()
  screen.render()
})

jobDialog.key('enter', () => {
  const bot = bots[selectedIndex]
  const idx = jobDialog.selected
  const job = jobs[idx]
  if (bot && job) {
    log(`Changing ${bot.name || bot.id} to job: ${job.id}`)
    send('job', { botId: bot.id, action: 'start', job: job.id })
  }
  jobDialog.hide()
  botList.focus()
  screen.render()
})

jobDialog.key('escape', () => {
  jobDialog.hide()
  botList.focus()
  screen.render()
})

screen.key('k', () => {
  const bot = bots[selectedIndex]
  if (!bot) {
    log('{yellow-fg}No bot selected{/}')
    return
  }
  log(`Stopping job for ${bot.name || bot.id}`)
  send('stop', { botId: bot.id })
})

botList.focus()

// Start
log('Starting TUI client...')
connect()
screen.render()
