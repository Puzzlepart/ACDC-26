const STORAGE_KEY = 'cccpccc.layout.v1'
const SETTINGS_KEY = 'cccpccc.settings.v1'

const statusEl = document.getElementById('status')
const telemetryEl = document.getElementById('telemetry')
const performanceEl = document.getElementById('performance')
const performanceSummaryEl = document.getElementById('performance-summary')
const viewerEl = document.getElementById('viewer')
const overlayEl = document.getElementById('viewer-overlay')
const botSelectEl = document.getElementById('bot-select')
const botStatusEl = document.getElementById('bot-status')
const toggleControlsEl = document.getElementById('toggle-controls')
const toggleViewerControlEl = document.getElementById('toggle-viewer-control')
const lookSensitivityEl = document.getElementById('look-sensitivity')
const jobSelectEl = document.getElementById('job-select')
const jobBotSelectEl = document.getElementById('job-bot-select')
const jobOptionsEl = document.getElementById('job-options')
const jobStartEl = document.getElementById('job-start')
const jobStopEl = document.getElementById('job-stop')
const workAreaInputEl = document.getElementById('work-area-input')
const workAreaApplyEl = document.getElementById('work-area-apply')
const workAreaClearEl = document.getElementById('work-area-clear')
const workAreaStatusEl = document.getElementById('work-area-status')
const mindcraftHostEl = document.getElementById('mindcraft-host')
const mindcraftPortEl = document.getElementById('mindcraft-port')
const mindcraftConnectEl = document.getElementById('mindcraft-connect')
const mindcraftProfileEl = document.getElementById('mindcraft-profile')
const mindcraftNameEl = document.getElementById('mindcraft-name')
const mindcraftAuthEl = document.getElementById('mindcraft-auth')
const mindcraftBaseEl = document.getElementById('mindcraft-base')
const mindcraftInitEl = document.getElementById('mindcraft-init')
const mindcraftCreateEl = document.getElementById('mindcraft-create')
const mindcraftAgentEl = document.getElementById('mindcraft-agent')
const mindcraftStartEl = document.getElementById('mindcraft-start')
const mindcraftStopEl = document.getElementById('mindcraft-stop')
const mindcraftDestroyEl = document.getElementById('mindcraft-destroy')
const mindcraftStatusEl = document.getElementById('mindcraft-status')
const layoutButton = document.getElementById('layout-button')
const layoutPanel = document.getElementById('layout-panel')
const hiddenCardsListEl = document.getElementById('hidden-cards-list')
const gridEl = document.getElementById('card-grid')
const tokenInputEl = document.getElementById('token')
const serverUrlEl = document.getElementById('server-url')
const viewerHostEl = document.getElementById('viewer-host')

let ws
let lastCommandId = 0

let selectedBotId = ''
let controlsEnabled = true  // Enable by default
let viewerControlEnabled = false
let isLooking = false
let lastMouseX = 0
let lastMouseY = 0
let lookSensitivity = 0.0025
let viewerHost = location.hostname
let viewerHostOverride = ''
let currentWorkArea = null
let botsCache = []
let jobsCache = []
let mindcraftProfiles = []
const mindcraftMcHost = 'mc.craycon.no'
const mindcraftMcPort = 25565
const heldKeys = new Set()
const keyMap = new Map([
  ['KeyW', 'forward'],
  ['KeyS', 'back'],
  ['KeyA', 'left'],
  ['KeyD', 'right'],
  ['Space', 'jump'],
  ['ShiftLeft', 'sprint'],
  ['ShiftRight', 'sprint']
])

const cards = Array.from(document.querySelectorAll('.card[data-card-id]'))
const cardMap = new Map(cards.map(card => [card.dataset.cardId, card]))
const layoutState = loadLayoutState()
const resizableCards = new Set(['telemetry', 'performance', 'viewer'])

applyLayoutState()
bindCardActions()
bindDragAndDrop()
bindLayoutPanel()
bindResizableHandles()
observeCardSizes()

// Auto-populate spawn name with suggested comrade name
function suggestComradeName() {
  const num = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  return `comrade_${num}`
}

if (document.getElementById('spawn-name')) {
  document.getElementById('spawn-name').placeholder = suggestComradeName()
}

const settings = loadSettings()
if (serverUrlEl && settings.serverUrl) {
  serverUrlEl.value = settings.serverUrl
}
if (tokenInputEl && settings.token) {
  tokenInputEl.value = settings.token
}
if (viewerHostEl && settings.viewerHost) {
  viewerHostEl.value = settings.viewerHost
  viewerHostOverride = settings.viewerHost
}

// Auto-populate auth token with default if not set
if (tokenInputEl && !tokenInputEl.value) {
  tokenInputEl.value = 'YOLO_SWAG'
}

// Enable viewer controls by default
if (overlayEl) {
  overlayEl.classList.add('active')
}

function logStatus(text) {
  statusEl.textContent = text
}

function formatWorkArea(workArea) {
  if (!workArea) return ''
  const x = Number.isFinite(workArea.x) ? workArea.x : 0
  const y = Number.isFinite(workArea.y) ? workArea.y : 0
  const z = Number.isFinite(workArea.z) ? workArea.z : 0
  return `${x},${y},${z}`
}

function renderWorkArea(workArea) {
  currentWorkArea = workArea || null
  if (workAreaInputEl) {
    workAreaInputEl.value = workArea ? formatWorkArea(workArea) : ''
  }
  if (workAreaStatusEl) {
    if (!workArea) {
      workAreaStatusEl.textContent = 'Using brigadier location.'
    } else {
      workAreaStatusEl.textContent = `Override active at ${formatWorkArea(workArea)}.`
    }
  }
}

function submitWorkArea() {
  if (!workAreaInputEl) return
  const value = workAreaInputEl.value.trim()
  if (!value) {
    send('work-area', { action: 'clear' }, { includeBotId: false })
    return
  }
  send('work-area', { action: 'set', value }, { includeBotId: false })
}

function formatPerformanceSummary(perf) {
  if (!perf || typeof perf !== 'object') return 'Waiting for telemetry...'

  const cpu = Number.isFinite(perf.cpuPctSingleCore) ? `${perf.cpuPctSingleCore.toFixed(1)}%` : 'n/a'
  const host = Number.isFinite(perf.cpuPctHost) ? `${perf.cpuPctHost.toFixed(1)}%` : 'n/a'
  const rss = perf.memory && Number.isFinite(perf.memory.rssMB) ? `${perf.memory.rssMB.toFixed(1)}MB` : 'n/a'
  const heap = perf.memory && Number.isFinite(perf.memory.heapUsedMB) ? `${perf.memory.heapUsedMB.toFixed(1)}MB` : 'n/a'
  const bots = Number.isFinite(perf.bots) ? perf.bots : 'n/a'
  const ws = Number.isFinite(perf.wsClients) ? perf.wsClients : 'n/a'

  return `CPU ${cpu} | Host ${host} | RSS ${rss} | Heap ${heap} | Bots ${bots} | WS ${ws}`
}

function send(type, args = {}, options = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  lastCommandId += 1
  const payloadArgs = { ...args }
  if (options.includeBotId !== false && selectedBotId && !payloadArgs.botId) {
    payloadArgs.botId = selectedBotId
  }
  ws.send(JSON.stringify({ type, id: `cmd-${lastCommandId}`, args: payloadArgs }))
}

function updateBotSelect(bots) {
  botsCache = bots || []
  
  // Filter out offline/undefined bots
  const activeBots = botsCache.filter(bot => bot.inGame && bot.id && bot.id !== 'undefined')
  
  botSelectEl.innerHTML = ''
  jobBotSelectEl.innerHTML = ''
  
  if (!activeBots || activeBots.length === 0) {
    const option = document.createElement('option')
    option.value = ''
    option.textContent = 'No active bots'
    botSelectEl.appendChild(option)
    jobBotSelectEl.appendChild(option.cloneNode(true))
    selectedBotId = ''
    botStatusEl.textContent = 'No bots connected'
    return
  }
  
  activeBots.forEach(bot => {
    const option = document.createElement('option')
    option.value = bot.id
    const jobLabel = bot.job ? ` • ${bot.job}` : ''
    option.textContent = `${bot.name} (online)${jobLabel}`
    botSelectEl.appendChild(option)
    jobBotSelectEl.appendChild(option.cloneNode(true))
  })
  
  if (!selectedBotId || !activeBots.find(bot => bot.id === selectedBotId)) {
    selectedBotId = activeBots[0].id
  }
  
  botSelectEl.value = selectedBotId
  
  // Default job bot selector to last spawned bot
  if (activeBots.length > 0) {
    jobBotSelectEl.value = activeBots[activeBots.length - 1].id
  }
  
  const active = activeBots.find(bot => bot.id === selectedBotId)
  botStatusEl.textContent = active ? `Active: ${active.name}` : 'Select a bot'
  if (active && active.viewerPort) {
    setViewerSrc(active.viewerPort)
  }
}

function setViewerSrc(viewerPort) {
  if (!viewerPort) return
  const hostOverride = viewerHostOverride && viewerHostOverride.trim()
  const base = hostOverride
    ? (hostOverride.startsWith('http://') || hostOverride.startsWith('https://')
        ? hostOverride
        : `https://${hostOverride}`)
    : `https://${viewerHost}`
  const url = new URL(base)
  if (viewerControlEnabled) {
    url.searchParams.set('control', 'true')
    const token = tokenInputEl ? tokenInputEl.value.trim() : ''
    if (token) {
      url.searchParams.set('token', token)
    }
  }
  const next = url.toString()
  if (viewerEl.dataset.src === next) return
  viewerEl.dataset.src = next
  viewerEl.src = next
}

function updateJobSelect(jobs) {
  jobsCache = jobs || []
  jobSelectEl.innerHTML = ''
  if (!jobsCache.length) {
    const option = document.createElement('option')
    option.value = ''
    option.textContent = 'No jobs'
    jobSelectEl.appendChild(option)
    return
  }
  jobsCache.forEach(job => {
    const option = document.createElement('option')
    option.value = job.id
    option.textContent = job.label || job.id
    jobSelectEl.appendChild(option)
  })
  if (!jobSelectEl.value) {
    jobSelectEl.value = jobsCache[0].id
  }
}

function updateMindcraftProfiles(profiles) {
  mindcraftProfiles = profiles || []
  mindcraftProfileEl.innerHTML = ''
  if (!mindcraftProfiles.length) {
    const option = document.createElement('option')
    option.value = ''
    option.textContent = 'No profiles'
    mindcraftProfileEl.appendChild(option)
    return
  }
  mindcraftProfiles.forEach(profile => {
    const option = document.createElement('option')
    option.value = profile
    option.textContent = profile
    mindcraftProfileEl.appendChild(option)
  })
  if (!mindcraftProfileEl.value) {
    mindcraftProfileEl.value = mindcraftProfiles[0]
  }
}

function updateMindcraftAgents(agents) {
  mindcraftAgentEl.innerHTML = ''
  const list = agents || []
  if (!list.length) {
    const option = document.createElement('option')
    option.value = ''
    option.textContent = 'No agents'
    mindcraftAgentEl.appendChild(option)
    return
  }
  list.forEach(agent => {
    const option = document.createElement('option')
    option.value = agent.name
    option.textContent = `${agent.name} (${agent.in_game ? 'online' : 'offline'})`
    mindcraftAgentEl.appendChild(option)
  })
  if (!mindcraftAgentEl.value) {
    mindcraftAgentEl.value = list[0].name
  }
}

function setMindcraftAvailability(enabled, available) {
  const disabled = !enabled || !available
  const elements = [
    mindcraftHostEl,
    mindcraftPortEl,
    mindcraftConnectEl,
    mindcraftProfileEl,
    mindcraftNameEl,
    mindcraftAuthEl,
    mindcraftBaseEl,
    mindcraftInitEl,
    mindcraftCreateEl,
    mindcraftAgentEl,
    mindcraftStartEl,
    mindcraftStopEl,
    mindcraftDestroyEl
  ]
  elements.forEach(el => {
    el.disabled = disabled
  })
}

document.getElementById('connect').addEventListener('click', () => {
  const token = tokenInputEl ? tokenInputEl.value.trim() : ''
  const wsUrl = buildWsUrl(token)

  ws = new WebSocket(wsUrl)

  ws.addEventListener('open', () => logStatus('Connected'))
  ws.addEventListener('close', () => logStatus('Disconnected'))
  ws.addEventListener('message', event => {
    const data = JSON.parse(event.data)
    if (data.type === 'telemetry') {
      const bots = data.payload && data.payload.bots ? data.payload.bots : []
      const active = bots.find(bot => bot.id === selectedBotId) || bots[0]
      telemetryEl.textContent = JSON.stringify(active || {}, null, 2)
      if (performanceEl) {
        const perf = data.payload && data.payload.performance ? data.payload.performance : {}
        if (performanceSummaryEl) {
          performanceSummaryEl.textContent = formatPerformanceSummary(perf)
        }
        performanceEl.textContent = JSON.stringify(perf, null, 2)
      }
    }
    if (data.type === 'hello') {
      const { bots, defaultBotId, lookSensitivity: serverSensitivity, viewerHost: hostOverride, jobs, mindcraft, workArea } = data.payload
      if (Number.isFinite(serverSensitivity)) {
        lookSensitivity = serverSensitivity
        lookSensitivityEl.value = String(serverSensitivity)
      }
      if (hostOverride && !viewerHostOverride) {
        viewerHost = hostOverride
      }
      selectedBotId = defaultBotId || selectedBotId
      updateBotSelect(bots || [])
      updateJobSelect(jobs || [])
      renderWorkArea(workArea || null)
      if (mindcraft) {
        mindcraftHostEl.value = mindcraft.host || mindcraftHostEl.value
        mindcraftPortEl.value = mindcraft.port || mindcraftPortEl.value
        updateMindcraftProfiles(mindcraft.profiles || [])
        setMindcraftAvailability(mindcraft.enabled, mindcraft.available)
      }
    }
    if (data.type === 'bot-list') {
      updateBotSelect(data.payload.bots || [])
    }
    if (data.type === 'mindcraft-status') {
      const payload = data.payload || {}
      const statusText = payload.connected ? 'connected' : 'disconnected'
      mindcraftStatusEl.textContent = `Mindcraft: ${statusText}`
      if (payload.host) mindcraftHostEl.value = payload.host
      if (payload.port) mindcraftPortEl.value = String(payload.port)
      updateMindcraftAgents(payload.agents || [])
      setMindcraftAvailability(payload.enabled, payload.available)
    }
    if (data.type === 'work-area') {
      renderWorkArea(data.payload && data.payload.workArea ? data.payload.workArea : null)
    }
    if (data.type === 'error') {
      logStatus(`Error: ${data.message || 'unknown'}`)
    }
  })

  saveSettings()
})

document.getElementById('disconnect').addEventListener('click', () => {
  if (ws) ws.close()
})

botSelectEl.addEventListener('change', event => {
  selectedBotId = event.target.value
  const active = botsCache.find(bot => bot.id === selectedBotId)
  if (active && active.viewerPort) {
    setViewerSrc(active.viewerPort)
    botStatusEl.textContent = `Active: ${active.name}`
  }
  send('status')
})

document.getElementById('spawn').addEventListener('click', () => {
  const username = document.getElementById('spawn-name').value.trim()
  logStatus('Spawning bot...')
  send('spawn', { username: username || undefined }, { includeBotId: false })
  document.getElementById('spawn-name').value = ''
  document.getElementById('spawn-name').placeholder = suggestComradeName()
})

document.getElementById('bulk-spawn').addEventListener('click', () => {
  const jobType = document.getElementById('bulk-job-type').value
  const count = parseInt(document.getElementById('bulk-count').value) || 3
  
  if (count < 1 || count > 10) {
    logStatus('Error: Count must be between 1 and 10')
    return
  }
  
  logStatus(`Bulk spawning ${count} ${jobType} farmers...`)
  send('bulk-spawn', { jobType, count }, { includeBotId: false })
})

document.getElementById('move').addEventListener('click', () => {
  const x = Number(document.getElementById('move-x').value)
  const y = Number(document.getElementById('move-y').value)
  const z = Number(document.getElementById('move-z').value)
  send('move', { x, y, z })
})

document.getElementById('follow').addEventListener('click', () => {
  const playerName = document.getElementById('follow-name').value.trim()
  const distance = Number(document.getElementById('follow-distance').value)
  send('follow', { playerName, distance })
})

document.getElementById('stop').addEventListener('click', () => {
  send('stop')
})

jobStartEl.addEventListener('click', () => {
  const job = jobSelectEl.value
  if (!job) return
  const botId = jobBotSelectEl.value
  if (!botId) {
    logStatus('Error: select a bot first')
    return
  }
  let options = {}
  const raw = jobOptionsEl.value.trim()
  if (raw) {
    try {
      options = JSON.parse(raw)
    } catch (error) {
      logStatus('Error: invalid job options JSON')
      return
    }
  }
  send('job', { action: 'start', job, options, botId }, { includeBotId: false })
})

jobStopEl.addEventListener('click', () => {
  const botId = jobBotSelectEl.value
  if (!botId) {
    logStatus('Error: select a bot first')
    return
  }
  send('job', { action: 'stop', botId }, { includeBotId: false })
})

if (workAreaApplyEl) {
  workAreaApplyEl.addEventListener('click', () => {
    submitWorkArea()
  })
}

if (workAreaClearEl) {
  workAreaClearEl.addEventListener('click', () => {
    send('work-area', { action: 'clear' }, { includeBotId: false })
  })
}

if (workAreaInputEl) {
  workAreaInputEl.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    submitWorkArea()
  })
}

mindcraftConnectEl.addEventListener('click', () => {
  send(
    'mindcraft',
    {
      action: 'connect',
      host: mindcraftHostEl.value.trim() || 'localhost',
      port: Number(mindcraftPortEl.value) || 8080
    },
    { includeBotId: false }
  )
})

mindcraftCreateEl.addEventListener('click', () => {
  const profile = mindcraftProfileEl.value
  if (!profile) return
  const name = mindcraftNameEl.value.trim()
  send(
    'mindcraft',
    {
      action: 'create',
      profile,
      name,
      auth: mindcraftAuthEl.value,
      baseProfile: mindcraftBaseEl.value,
      initMessage: mindcraftInitEl.value.trim(),
      host: mindcraftMcHost,
      port: mindcraftMcPort,
      mindcraftHost: mindcraftHostEl.value.trim() || 'localhost',
      mindcraftPort: Number(mindcraftPortEl.value) || 8080
    },
    { includeBotId: false }
  )
})

mindcraftStartEl.addEventListener('click', () => {
  const name = mindcraftAgentEl.value
  if (!name) return
  send(
    'mindcraft',
    {
      action: 'start',
      name,
      mindcraftHost: mindcraftHostEl.value.trim() || 'localhost',
      mindcraftPort: Number(mindcraftPortEl.value) || 8080
    },
    { includeBotId: false }
  )
})

mindcraftStopEl.addEventListener('click', () => {
  const name = mindcraftAgentEl.value
  if (!name) return
  send(
    'mindcraft',
    {
      action: 'stop',
      name,
      mindcraftHost: mindcraftHostEl.value.trim() || 'localhost',
      mindcraftPort: Number(mindcraftPortEl.value) || 8080
    },
    { includeBotId: false }
  )
})

mindcraftDestroyEl.addEventListener('click', () => {
  const name = mindcraftAgentEl.value
  if (!name) return
  send(
    'mindcraft',
    {
      action: 'destroy',
      name,
      mindcraftHost: mindcraftHostEl.value.trim() || 'localhost',
      mindcraftPort: Number(mindcraftPortEl.value) || 8080
    },
    { includeBotId: false }
  )
})

toggleControlsEl.addEventListener('click', () => {
  controlsEnabled = !controlsEnabled
  overlayEl.classList.toggle('active', controlsEnabled)
  toggleControlsEl.textContent = controlsEnabled ? 'Disable' : 'Enable'
})

toggleViewerControlEl.addEventListener('click', () => {
  viewerControlEnabled = !viewerControlEnabled
  toggleViewerControlEl.textContent = viewerControlEnabled ? 'Disable' : 'Enable'
  const active = botsCache.find(bot => bot.id === selectedBotId)
  if (active && active.viewerPort) {
    setViewerSrc(active.viewerPort)
  }
})

if (tokenInputEl) {
  tokenInputEl.addEventListener('change', () => {
    saveSettings()
    if (!viewerControlEnabled) return
    const active = botsCache.find(bot => bot.id === selectedBotId)
    if (active && active.viewerPort) {
      setViewerSrc(active.viewerPort)
    }
  })
}

if (serverUrlEl) {
  serverUrlEl.addEventListener('change', () => {
    saveSettings()
  })
}

if (viewerHostEl) {
  viewerHostEl.addEventListener('change', () => {
    viewerHostOverride = viewerHostEl.value.trim()
    saveSettings()
    const active = botsCache.find(bot => bot.id === selectedBotId)
    if (active && active.viewerPort) {
      setViewerSrc(active.viewerPort)
    }
  })
}

lookSensitivityEl.addEventListener('change', event => {
  const value = Number(event.target.value)
  if (Number.isFinite(value)) {
    lookSensitivity = value
  }
})

overlayEl.addEventListener('contextmenu', event => {
  if (controlsEnabled) {
    event.preventDefault()
  }
})

overlayEl.addEventListener('mousedown', event => {
  if (!controlsEnabled) return
  if (event.button !== 2) return
  isLooking = true
  overlayEl.classList.add('is-looking')
  lastMouseX = event.clientX
  lastMouseY = event.clientY
})

window.addEventListener('mouseup', event => {
  if (event.button !== 2) return
  isLooking = false
  overlayEl.classList.remove('is-looking')
})

overlayEl.addEventListener('mousemove', event => {
  if (!controlsEnabled || !isLooking) return
  const dx = event.clientX - lastMouseX
  const dy = event.clientY - lastMouseY
  lastMouseX = event.clientX
  lastMouseY = event.clientY
  if (dx === 0 && dy === 0) return
  send('look', { dx, dy, sensitivity: lookSensitivity })
})

window.addEventListener('keydown', event => {
  if (!controlsEnabled) return
  if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return
  const control = keyMap.get(event.code)
  if (!control || heldKeys.has(event.code)) return
  event.preventDefault()
  heldKeys.add(event.code)
  send('control', { control, value: true })
})

window.addEventListener('keyup', event => {
  if (!controlsEnabled) return
  const control = keyMap.get(event.code)
  if (!control) return
  event.preventDefault()
  heldKeys.delete(event.code)
  send('control', { control, value: false })
})

function loadLayoutState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { order: [], hidden: [], minimized: [] }
    const parsed = JSON.parse(raw)
    return {
      order: Array.isArray(parsed.order) ? parsed.order : [],
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      minimized: Array.isArray(parsed.minimized) ? parsed.minimized : [],
      sizes: parsed.sizes && typeof parsed.sizes === 'object' ? parsed.sizes : {}
    }
  } catch (error) {
    return { order: [], hidden: [], minimized: [], sizes: {} }
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return {
      serverUrl: typeof parsed.serverUrl === 'string' ? parsed.serverUrl : '',
      token: typeof parsed.token === 'string' ? parsed.token : '',
      viewerHost: typeof parsed.viewerHost === 'string' ? parsed.viewerHost : ''
    }
  } catch (error) {
    return {}
  }
}

function saveSettings() {
  const next = {
    serverUrl: serverUrlEl ? serverUrlEl.value.trim() : '',
    token: tokenInputEl ? tokenInputEl.value.trim() : '',
    viewerHost: viewerHostEl ? viewerHostEl.value.trim() : ''
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
}

function buildWsUrl(token) {
  const raw = serverUrlEl ? serverUrlEl.value.trim() : ''
  let url
  try {
    if (raw) {
      const withProto = raw.match(/^wss?:\/\//i) || raw.match(/^https?:\/\//i)
        ? raw
        : `http://${raw}`
      url = new URL(withProto)
    } else {
      url = new URL(window.location.href)
    }
  } catch (error) {
    url = new URL(window.location.href)
  }

  if (url.protocol === 'https:' || url.protocol === 'wss:') {
    url.protocol = 'wss:'
  } else {
    url.protocol = 'ws:'
  }

  url.pathname = '/'
  url.search = ''
  if (token) {
    url.searchParams.set('token', token)
  }
  return url.toString()
}

function saveLayoutState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutState))
}

function applyLayoutState() {
  const metrics = getGridMetrics()

  if (layoutState.order.length) {
    layoutState.order.forEach(id => {
      const card = cardMap.get(id)
      if (card) gridEl.appendChild(card)
    })
    cards.forEach(card => {
      if (!layoutState.order.includes(card.dataset.cardId)) {
        gridEl.appendChild(card)
      }
    })
  }

  layoutState.hidden.forEach(id => {
    const card = cardMap.get(id)
    if (card) card.classList.add('is-hidden')
  })

  layoutState.minimized.forEach(id => {
    const card = cardMap.get(id)
    if (card) card.classList.add('is-minimized')
  })

  if (layoutState.sizes && typeof layoutState.sizes === 'object') {
    Object.entries(layoutState.sizes).forEach(([id, size]) => {
      const card = cardMap.get(id)
      if (!card || !size) return
      if (size.colSpan) card.style.gridColumnEnd = `span ${size.colSpan}`
      if (size.rowSpan) card.style.gridRowEnd = `span ${size.rowSpan}`
    })
  }

  const viewerCard = cardMap.get('viewer')
  if (viewerCard && (!layoutState.sizes || !layoutState.sizes.viewer)) {
    viewerCard.style.gridColumnEnd = `span ${metrics.columnCount}`
  }

  cards.forEach(card => syncCardActionState(card))
  updateHiddenCardsPanel()
}

function syncCardActionState(card) {
  const button = card.querySelector('[data-card-action="minimize"]')
  if (!button) return
  const minimized = card.classList.contains('is-minimized')
  button.textContent = minimized ? '+' : '-'
  button.setAttribute('aria-label', minimized ? 'Expand' : 'Minimize')
}

function bindCardActions() {
  gridEl.addEventListener('click', event => {
    const actionButton = event.target.closest('[data-card-action]')
    if (!actionButton) return
    const card = actionButton.closest('.card')
    if (!card) return
    const action = actionButton.dataset.cardAction
    if (action === 'minimize') {
      const minimized = !card.classList.contains('is-minimized')
      setCardMinimized(card, minimized)
    }
    if (action === 'close') {
      setCardHidden(card, true)
    }
  })
}

function setCardHidden(card, hidden) {
  const id = card.dataset.cardId
  card.classList.toggle('is-hidden', hidden)
  if (id) {
    layoutState.hidden = layoutState.hidden.filter(item => item !== id)
    if (hidden) layoutState.hidden.push(id)
    saveLayoutState()
  }
  updateHiddenCardsPanel()
}

function setCardMinimized(card, minimized) {
  const id = card.dataset.cardId
  card.classList.toggle('is-minimized', minimized)
  if (id) {
    layoutState.minimized = layoutState.minimized.filter(item => item !== id)
    if (minimized) layoutState.minimized.push(id)
    saveLayoutState()
  }
  syncCardActionState(card)
}

function updateHiddenCardsPanel() {
  if (!hiddenCardsListEl) return
  const hiddenCards = cards.filter(card => card.classList.contains('is-hidden'))
  hiddenCardsListEl.innerHTML = ''
  if (!hiddenCards.length) {
    const empty = document.createElement('div')
    empty.className = 'panel-empty'
    empty.textContent = 'All cards active'
    hiddenCardsListEl.appendChild(empty)
    return
  }
  hiddenCards.forEach(card => {
    const title = card.dataset.cardTitle || 'Card'
    const row = document.createElement('div')
    row.className = 'panel-item'
    const label = document.createElement('span')
    label.textContent = title
    const button = document.createElement('button')
    button.textContent = 'Add'
    button.addEventListener('click', () => {
      setCardHidden(card, false)
    })
    row.appendChild(label)
    row.appendChild(button)
    hiddenCardsListEl.appendChild(row)
  })
}

function bindLayoutPanel() {
  if (!layoutButton || !layoutPanel) return
  layoutButton.addEventListener('click', event => {
    event.stopPropagation()
    const isHidden = layoutPanel.classList.toggle('is-hidden')
    layoutButton.setAttribute('aria-expanded', String(!isHidden))
    updateHiddenCardsPanel()
  })

  document.addEventListener('click', event => {
    if (layoutPanel.classList.contains('is-hidden')) return
    if (layoutPanel.contains(event.target) || layoutButton.contains(event.target)) return
    layoutPanel.classList.add('is-hidden')
    layoutButton.setAttribute('aria-expanded', 'false')
  })
}

function bindDragAndDrop() {
  let draggingCard = null

  gridEl.addEventListener('dragstart', event => {
    const handle = event.target.closest('.card-head')
    if (!handle || event.target.closest('[data-card-action]')) {
      event.preventDefault()
      return
    }
    const card = handle.closest('.card')
    if (!card) return
    draggingCard = card
    draggingCard.classList.add('is-dragging')
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', card.dataset.cardId || '')
  })

  gridEl.addEventListener('dragover', event => {
    if (!draggingCard) return
    event.preventDefault()
    const targetCard = event.target.closest('.card')
    if (!targetCard || targetCard === draggingCard || targetCard.classList.contains('is-hidden')) return
    const rect = targetCard.getBoundingClientRect()
    const shouldInsertAfter = event.clientY - rect.top > rect.height / 2
    gridEl.insertBefore(draggingCard, shouldInsertAfter ? targetCard.nextSibling : targetCard)
  })

  gridEl.addEventListener('dragend', () => {
    if (!draggingCard) return
    draggingCard.classList.remove('is-dragging')
    draggingCard = null
    persistCardOrder()
  })
}

function persistCardOrder() {
  layoutState.order = Array.from(gridEl.querySelectorAll('.card[data-card-id]'))
    .map(card => card.dataset.cardId)
    .filter(Boolean)
  saveLayoutState()
}

function getGridMetrics() {
  const styles = getComputedStyle(gridEl)
  const columnGap = parseFloat(styles.columnGap) || 0
  const rowGap = parseFloat(styles.rowGap) || 0
  const rowHeight = parseFloat(styles.gridAutoRows) || 12
  const columns = styles.gridTemplateColumns
    .split(' ')
    .map(item => parseFloat(item))
    .filter(Number.isFinite)
  const colWidth = columns[0] || (gridEl.clientWidth || 1)
  return {
    columnGap,
    rowGap,
    rowHeight,
    colWidth,
    columnCount: columns.length || 1
  }
}

function observeCardSizes() {
  const observer = new ResizeObserver(entries => {
    const { rowHeight, rowGap } = getGridMetrics()
    entries.forEach(entry => {
      const card = entry.target
      if (card.classList.contains('is-hidden')) return
      const height = entry.contentRect.height
      const rowSpan = Math.max(1, Math.ceil((height + rowGap) / (rowHeight + rowGap)))
      card.style.gridRowEnd = `span ${rowSpan}`
      if (resizableCards.has(card.dataset.cardId)) {
        persistCardSize(card)
      }
    })
  })
  cards.forEach(card => observer.observe(card))
  window.addEventListener('resize', () => {
    cards.forEach(card => {
      if (!card.classList.contains('is-hidden')) {
        const { rowHeight, rowGap } = getGridMetrics()
        const height = card.getBoundingClientRect().height
        const rowSpan = Math.max(1, Math.ceil((height + rowGap) / (rowHeight + rowGap)))
        card.style.gridRowEnd = `span ${rowSpan}`
      }
    })
  })
}

function bindResizableHandles() {
  gridEl.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-resize-handle]')
    if (!handle) return
    event.preventDefault()
    event.stopPropagation()
    const card = handle.closest('.card')
    if (!card || !resizableCards.has(card.dataset.cardId)) return
    const startRect = card.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const metrics = getGridMetrics()

    const onMove = moveEvent => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      const nextWidth = Math.max(200, startRect.width + dx)
      const nextHeight = Math.max(120, startRect.height + dy)
      const colSpan = Math.max(1, Math.round((nextWidth + metrics.columnGap) / (metrics.colWidth + metrics.columnGap)))
      const rowSpan = Math.max(1, Math.round((nextHeight + metrics.rowGap) / (metrics.rowHeight + metrics.rowGap)))
      card.style.gridColumnEnd = `span ${Math.min(colSpan, metrics.columnCount || colSpan)}`
      card.style.gridRowEnd = `span ${rowSpan}`
      persistCardSize(card, { colSpan, rowSpan })
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  })
}

function persistCardSize(card, override) {
  const id = card.dataset.cardId
  if (!id) return
  const size = override || {}
  const colSpan = size.colSpan || parseSpanValue(card.style.gridColumnEnd) || parseSpanValue(card.style.gridColumn)
  const rowSpan = size.rowSpan || parseSpanValue(card.style.gridRowEnd)
  if (!layoutState.sizes) layoutState.sizes = {}
  layoutState.sizes[id] = {
    colSpan: colSpan || 1,
    rowSpan: rowSpan || 1
  }
  saveLayoutState()
}

function parseSpanValue(value) {
  if (!value) return 0
  const parts = String(value).split(' ')
  const span = Number(parts[1])
  return Number.isFinite(span) ? span : 0
}
