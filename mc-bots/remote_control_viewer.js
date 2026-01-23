(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('control') !== 'true') return

  const sensitivityValue = Number(params.get('sensitivity'))
  const sensitivity = Number.isFinite(sensitivityValue) ? sensitivityValue : 0.0025
  const token = params.get('token') || ''

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const wsUrl = new URL(`${protocol}://${window.location.host}/control`)
  if (token) wsUrl.searchParams.set('token', token)

  const socket = new WebSocket(wsUrl.toString())
  const pending = []

  const keyMap = new Map([
    ['KeyW', 'forward'],
    ['KeyS', 'back'],
    ['KeyA', 'left'],
    ['KeyD', 'right'],
    ['Space', 'jump']
  ])
  const sprintKeys = new Set(['ControlLeft', 'ControlRight'])
  const sneakKeys = new Set(['ShiftLeft', 'ShiftRight'])
  const heldKeys = new Set()
  const heldControls = new Set()

  let canvas = null
  let isLocked = false
  let lastX = null
  let lastY = null

  const style = document.createElement('style')
  style.textContent = `
    .viewer-control-hint {
      position: fixed;
      left: 16px;
      bottom: 16px;
      padding: 10px 14px;
      background: rgba(0, 0, 0, 0.65);
      color: #f2f2f2;
      font-family: "Segoe UI", Tahoma, sans-serif;
      font-size: 12px;
      letter-spacing: 0.3px;
      border-radius: 8px;
      pointer-events: none;
      transition: opacity 150ms ease;
      opacity: 1;
      z-index: 10;
    }

    .viewer-control-hint.is-hidden {
      opacity: 0;
    }

    .viewer-control-crosshair {
      position: fixed;
      left: 50%;
      top: 50%;
      width: 14px;
      height: 14px;
      margin-left: -7px;
      margin-top: -7px;
      pointer-events: none;
      z-index: 11;
      opacity: 1;
      transition: opacity 150ms ease;
    }

    .viewer-control-crosshair::before,
    .viewer-control-crosshair::after {
      content: "";
      position: absolute;
      background: rgba(255, 255, 255, 0.8);
    }

    .viewer-control-crosshair::before {
      left: 6px;
      top: 0;
      width: 2px;
      height: 14px;
    }

    .viewer-control-crosshair::after {
      left: 0;
      top: 6px;
      width: 14px;
      height: 2px;
    }

    .viewer-control-crosshair.is-hidden {
      opacity: 0;
    }
  `
  document.head.appendChild(style)

  const hint = document.createElement('div')
  hint.className = 'viewer-control-hint'
  hint.textContent = 'Click to control (Esc to release). WASD move, Space jump, Shift sneak, Ctrl sprint.'
  document.body.appendChild(hint)

  const crosshair = document.createElement('div')
  crosshair.className = 'viewer-control-crosshair is-hidden'
  document.body.appendChild(crosshair)

  function send(type, payload) {
    const message = JSON.stringify({ type, ...payload })
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message)
      return
    }
    if (socket.readyState === WebSocket.CONNECTING) {
      pending.push(message)
    }
  }

  socket.addEventListener('open', () => {
    while (pending.length) {
      socket.send(pending.shift())
    }
  })

  socket.addEventListener('close', () => {
    releaseAll()
  })

  function isEditableTarget(target) {
    if (!target || !target.tagName) return false
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  }

  function setControl(control, value) {
    if (value) {
      heldControls.add(control)
    } else {
      heldControls.delete(control)
    }
    send('control', { control, value })
  }

  function releaseAll() {
    if (!heldControls.size) return
    for (const control of Array.from(heldControls)) {
      send('control', { control, value: false })
    }
    heldControls.clear()
    heldKeys.clear()
  }

  function updateLockState() {
    isLocked = document.pointerLockElement === canvas
    hint.classList.toggle('is-hidden', isLocked)
    crosshair.classList.toggle('is-hidden', !isLocked)
    if (!isLocked) {
      releaseAll()
      lastX = null
      lastY = null
    }
  }

  function requestPointerLock() {
    if (canvas && canvas.requestPointerLock) {
      canvas.requestPointerLock()
    }
  }

  document.addEventListener('pointerlockchange', updateLockState)
  document.addEventListener('mousedown', event => {
    if (event.button !== 0) return
    requestPointerLock()
  })

  document.addEventListener('contextmenu', event => {
    if (isLocked) event.preventDefault()
  })

  document.addEventListener('mousemove', event => {
    if (!isLocked) return
    const dx = Number.isFinite(event.movementX)
      ? event.movementX
      : lastX === null
        ? 0
        : event.clientX - lastX
    const dy = Number.isFinite(event.movementY)
      ? event.movementY
      : lastY === null
        ? 0
        : event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY
    if (dx === 0 && dy === 0) return
    send('look', { dx, dy, sensitivity })
  })

  document.addEventListener('keydown', event => {
    if (!isLocked) return
    if (event.repeat) return
    if (isEditableTarget(event.target)) return
    const control = keyMap.get(event.code)
    if (control) {
      event.preventDefault()
      if (!heldKeys.has(event.code)) {
        heldKeys.add(event.code)
        setControl(control, true)
      }
      return
    }
    if (sprintKeys.has(event.code)) {
      event.preventDefault()
      if (!heldKeys.has(event.code)) {
        heldKeys.add(event.code)
        setControl('sprint', true)
      }
      return
    }
    if (sneakKeys.has(event.code)) {
      event.preventDefault()
      if (!heldKeys.has(event.code)) {
        heldKeys.add(event.code)
        setControl('sneak', true)
      }
    }
  })

  document.addEventListener('keyup', event => {
    if (!isLocked) return
    if (isEditableTarget(event.target)) return
    const control = keyMap.get(event.code)
    if (control) {
      event.preventDefault()
      heldKeys.delete(event.code)
      setControl(control, false)
      return
    }
    if (sprintKeys.has(event.code)) {
      event.preventDefault()
      heldKeys.delete(event.code)
      setControl('sprint', false)
      return
    }
    if (sneakKeys.has(event.code)) {
      event.preventDefault()
      heldKeys.delete(event.code)
      setControl('sneak', false)
    }
  })

  window.addEventListener('blur', () => {
    if (isLocked) releaseAll()
  })

  function findCanvas() {
    const found = document.querySelector('canvas')
    if (found) {
      canvas = found
      updateLockState()
      return
    }
    requestAnimationFrame(findCanvas)
  }

  findCanvas()
})()
