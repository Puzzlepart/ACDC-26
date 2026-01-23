const mineflayer = require('mineflayer')

const CONFIG = {
  host: process.env.MC_HOST || 'mc.craycon.no',
  port: Number(process.env.MC_PORT || 25565),
  username: process.env.MC_USERNAME || 'spawn_setup_bot'
}

const SETUP = {
  centerX: 0,
  centerZ: 150,
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
  console.log('[setup-spawn] Breaking into chunks to avoid /fill limit (32768 blocks)...')
  
  // Wait for bot to spawn
  while (!bot.entity) {
    await sleep(500)
  }
  
  const baseY = Math.floor(bot.entity.position.y)
  console.log(`[setup-spawn] Base Y level: ${baseY}`)
  
  // Chunk size that stays under /fill limit
  const CHUNK_SIZE = 30 // 30x30x10 = 9000 blocks (safe under 32768 limit)
  
  // Step 1: Clear air above spawn in chunks
  console.log('[setup-spawn] Step 1/4: Clearing air above spawn (in chunks)...')
  let chunkCount = 0
  for (let x = minX; x < maxX; x += CHUNK_SIZE) {
    for (let z = minZ; z < maxZ; z += CHUNK_SIZE) {
      const x2 = Math.min(x + CHUNK_SIZE - 1, maxX)
      const z2 = Math.min(z + CHUNK_SIZE - 1, maxZ)
      bot.chat(`/fill ${x} ${baseY} ${z} ${x2} ${baseY + 10} ${z2} air`)
      chunkCount++
      if (chunkCount % 10 === 0) {
        console.log(`[setup-spawn]   Cleared ${chunkCount} chunks...`)
        await sleep(1000)
      } else {
        await sleep(200)
      }
    }
  }
  console.log(`[setup-spawn]   ✓ Cleared ${chunkCount} chunks`)
  
  // Step 2: Place grass_block floor in chunks
  console.log('[setup-spawn] Step 2/4: Placing grass floor (in chunks)...')
  chunkCount = 0
  for (let x = minX; x < maxX; x += CHUNK_SIZE) {
    for (let z = minZ; z < maxZ; z += CHUNK_SIZE) {
      const x2 = Math.min(x + CHUNK_SIZE - 1, maxX)
      const z2 = Math.min(z + CHUNK_SIZE - 1, maxZ)
      bot.chat(`/fill ${x} ${baseY - 1} ${z} ${x2} ${baseY - 1} ${z2} grass_block`)
      chunkCount++
      if (chunkCount % 10 === 0) {
        console.log(`[setup-spawn]   Placed ${chunkCount} chunks...`)
        await sleep(1000)
      } else {
        await sleep(200)
      }
    }
  }
  console.log(`[setup-spawn]   ✓ Placed ${chunkCount} chunks`)
  
  // Step 3: Create farmland grid with water channels
  console.log('[setup-spawn] Step 3/4: Creating farmland grid (in chunks)...')
  
  const farmMinX = centerX - Math.floor(farmCols * waterInterval / 2)
  const farmMinZ = centerZ - Math.floor(farmRows * waterInterval / 2)
  const farmMaxX = farmMinX + (farmCols * waterInterval)
  const farmMaxZ = farmMinZ + (farmRows * waterInterval)
  
  chunkCount = 0
  for (let x = farmMinX; x < farmMaxX; x += CHUNK_SIZE) {
    for (let z = farmMinZ; z < farmMaxZ; z += CHUNK_SIZE) {
      const x2 = Math.min(x + CHUNK_SIZE - 1, farmMaxX)
      const z2 = Math.min(z + CHUNK_SIZE - 1, farmMaxZ)
      bot.chat(`/fill ${x} ${baseY} ${z} ${x2} ${baseY} ${z2} farmland`)
      chunkCount++
      if (chunkCount % 10 === 0) {
        console.log(`[setup-spawn]   Placed ${chunkCount} farmland chunks...`)
        await sleep(1000)
      } else {
        await sleep(200)
      }
    }
  }
  console.log(`[setup-spawn]   ✓ Placed ${chunkCount} farmland chunks`)
  
  // Step 4: Place water sources in grid pattern
  console.log('[setup-spawn] Step 4/4: Placing water sources...')
  
  let waterCount = 0
  // Water channels every 9 blocks (optimal for farmland hydration)
  for (let x = farmMinX; x <= farmMaxX; x += waterInterval) {
    bot.chat(`/fill ${x} ${baseY} ${farmMinZ} ${x} ${baseY} ${farmMaxZ} water`)
    waterCount++
    await sleep(200)
  }
  
  for (let z = farmMinZ; z <= farmMaxZ; z += waterInterval) {
    bot.chat(`/fill ${farmMinX} ${baseY} ${z} ${farmMaxX} ${baseY} ${z} water`)
    waterCount++
    await sleep(200)
  }
  console.log(`[setup-spawn]   ✓ Placed ${waterCount} water channels`)
  
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
