const mineflayer = require('mineflayer')

const CONFIG = {
  host: process.env.MC_HOST || 'mc.craycon.no',
  port: Number(process.env.MC_PORT || 25565),
  username: process.env.MC_USERNAME || 'spawn_setup_bot'
}

const SETUP = {
  centerX: 0,
  centerZ: 0,
  size: 500,
  farmRows: 80,
  farmCols: 80,
  waterInterval: 9
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function setupSpawn(bot) {
  const { centerX, centerZ, size, farmRows, farmCols, waterInterval } = SETUP
  const halfSize = Math.floor(size / 2)
  const minX = centerX - halfSize
  const maxX = centerX + halfSize
  const minZ = centerZ - halfSize
  const maxZ = centerZ + halfSize
  
  console.log('[setup-spawn] Starting spawn area setup...')
  console.log(`[setup-spawn] Area: ${minX},${minZ} to ${maxX},${maxZ}`)
  
  // Wait for bot to spawn
  while (!bot.entity) {
    await sleep(500)
  }
  
  const baseY = Math.floor(bot.entity.position.y)
  console.log(`[setup-spawn] Base Y level: ${baseY}`)
  
  // Step 1: Clear air above spawn (10 blocks high)
  console.log('[setup-spawn] Step 1/4: Clearing air above spawn...')
  bot.chat(`/fill ${minX} ${baseY} ${minZ} ${maxX} ${baseY + 10} ${maxZ} air`)
  await sleep(2000)
  
  // Step 2: Place grass_block floor
  console.log('[setup-spawn] Step 2/4: Placing grass floor...')
  bot.chat(`/fill ${minX} ${baseY - 1} ${minZ} ${maxX} ${baseY - 1} ${maxZ} grass_block`)
  await sleep(2000)
  
  // Step 3: Create farmland grid with water channels
  console.log('[setup-spawn] Step 3/4: Creating farmland grid...')
  
  // First, place all farmland
  const farmMinX = centerX - Math.floor(farmCols * waterInterval / 2)
  const farmMinZ = centerZ - Math.floor(farmRows * waterInterval / 2)
  const farmMaxX = farmMinX + (farmCols * waterInterval)
  const farmMaxZ = farmMinZ + (farmRows * waterInterval)
  
  bot.chat(`/fill ${farmMinX} ${baseY} ${farmMinZ} ${farmMaxX} ${baseY} ${farmMaxZ} farmland`)
  await sleep(2000)
  
  // Step 4: Place water sources in grid pattern
  console.log('[setup-spawn] Step 4/4: Placing water sources...')
  
  // Water channels every 9 blocks (optimal for farmland hydration)
  for (let x = farmMinX; x <= farmMaxX; x += waterInterval) {
    bot.chat(`/fill ${x} ${baseY} ${farmMinZ} ${x} ${baseY} ${farmMaxZ} water`)
    await sleep(500)
  }
  
  for (let z = farmMinZ; z <= farmMaxZ; z += waterInterval) {
    bot.chat(`/fill ${farmMinX} ${baseY} ${z} ${farmMaxX} ${baseY} ${z} water`)
    await sleep(500)
  }
  
  console.log('[setup-spawn] ✓ Spawn area setup complete!')
  console.log('[setup-spawn] Farm grid ready for planting.')
  bot.chat('Spawn area setup complete! Farm grid ready.')
}

// Create bot and run setup
const bot = mineflayer.createBot({
  username: CONFIG.username,
  host: CONFIG.host,
  port: CONFIG.port
})

bot.once('spawn', async () => {
  console.log('[setup-spawn] Bot spawned, waiting 2 seconds...')
  await sleep(2000)
  
  try {
    await setupSpawn(bot)
    console.log('[setup-spawn] Setup successful, disconnecting in 5 seconds...')
    await sleep(5000)
    bot.quit()
    process.exit(0)
  } catch (error) {
    console.error('[setup-spawn] Setup failed:', error)
    bot.quit()
    process.exit(1)
  }
})

bot.on('error', err => {
  console.error('[setup-spawn] Bot error:', err)
  process.exit(1)
})

bot.on('kicked', reason => {
  console.error('[setup-spawn] Bot kicked:', reason)
  process.exit(1)
})

console.log('[setup-spawn] Connecting to server...')
