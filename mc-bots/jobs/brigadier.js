const { sleep, stopMotion } = require('./utils')

// Brigadier (Бригадир) - Soviet work brigade leader
// Manages worker bots and distributes equipment

const SUPPLY_KITS = {
  'farmer-wheat': [
    { item: 'minecraft:wheat_seeds', count: 64 },
    { item: 'minecraft:diamond_hoe', count: 1 },
    { item: 'minecraft:dirt', count: 64 }
  ],
  'farmer-potatoes': [
    { item: 'minecraft:potato', count: 64 },
    { item: 'minecraft:diamond_hoe', count: 1 },
    { item: 'minecraft:dirt', count: 64 }
  ],
  'farmer-beets': [
    { item: 'minecraft:beetroot_seeds', count: 64 },
    { item: 'minecraft:diamond_hoe', count: 1 },
    { item: 'minecraft:dirt', count: 64 }
  ],
  'farmer': [
    { item: 'minecraft:wheat_seeds', count: 64 },
    { item: 'minecraft:carrot', count: 32 },
    { item: 'minecraft:potato', count: 32 },
    { item: 'minecraft:diamond_hoe', count: 1 },
    { item: 'minecraft:dirt', count: 64 }
  ],
  'guard': [
    { item: 'minecraft:diamond_sword', count: 1 },
    { item: 'minecraft:diamond_helmet', count: 1 },
    { item: 'minecraft:diamond_chestplate', count: 1 },
    { item: 'minecraft:diamond_leggings', count: 1 },
    { item: 'minecraft:diamond_boots', count: 1 },
    { item: 'minecraft:cooked_beef', count: 32 }
  ],
  'scout': [
    { item: 'minecraft:diamond_sword', count: 1 },
    { item: 'minecraft:bow', count: 1 },
    { item: 'minecraft:arrow', count: 64 },
    { item: 'minecraft:cooked_beef', count: 32 },
    { item: 'minecraft:torch', count: 64 }
  ]
}

const SUPPLY_REQUESTS = [
  /need (wheat|potato|beetroot|seeds|potatoes|beets)/i,
  /ready \(need/i,
  /требую/i, // Russian: "I demand"
  /нужны/i   // Russian: "needed"
]

function matchesSupplyRequest(message) {
  return SUPPLY_REQUESTS.some(pattern => pattern.test(message))
}

function detectJobFromMessage(message, username) {
  const lowerMsg = message.toLowerCase()
  const lowerName = username.toLowerCase()
  
  // Check message content
  if (lowerMsg.includes('wheat')) return 'farmer-wheat'
  if (lowerMsg.includes('potato')) return 'farmer-potatoes'
  if (lowerMsg.includes('beet')) return 'farmer-beets'
  if (lowerMsg.includes('farmer')) return 'farmer'
  if (lowerMsg.includes('guard')) return 'guard'
  if (lowerMsg.includes('scout')) return 'scout'
  
  // Check username patterns
  if (lowerName.includes('wheat')) return 'farmer-wheat'
  if (lowerName.includes('potato')) return 'farmer-potatoes'
  if (lowerName.includes('beet')) return 'farmer-beets'
  if (lowerName.includes('farmer')) return 'farmer'
  if (lowerName.includes('guard')) return 'guard'
  if (lowerName.includes('scout')) return 'scout'
  
  return null
}

async function distributeSupplies(bot, targetPlayer, jobType) {
  const kit = SUPPLY_KITS[jobType]
  if (!kit) {
    console.log(`[brigadier] Unknown job type: ${jobType}`)
    bot.chat(`Comrade ${targetPlayer}, unknown role!`)
    return
  }
  
  console.log(`[brigadier] Distributing ${jobType} kit to ${targetPlayer}`)
  bot.chat(`Comrade ${targetPlayer}, receiving supplies!`)
  
  for (const supply of kit) {
    bot.chat(`/give ${targetPlayer} ${supply.item} ${supply.count}`)
    await sleep(300)
  }
  
  bot.chat(`Comrade ${targetPlayer}, kit complete! For the glory of the collective!`)
  console.log(`[brigadier] ✓ Supplied ${targetPlayer} with ${jobType} kit`)
}

async function run(state, task, options) {
  const bot = state.bot
  const autoSupply = options.autoSupply !== false
  const greetOnJoin = options.greetOnJoin !== false
  
  console.log(`[brigadier] ${bot.username} assuming command`)
  bot.chat('Brigadier reporting! Managing worker supplies.')
  
  const suppliedPlayers = new Set()
  const lastSupplyTime = new Map()
  const MIN_SUPPLY_INTERVAL = 10000 // 10 seconds between supplies to same player
  
  // Listen for player join events
  bot.on('playerJoined', player => {
    if (player.username === bot.username) return
    if (!greetOnJoin) return
    
    console.log(`[brigadier] Worker joined: ${player.username}`)
    bot.chat(`Welcome, comrade ${player.username}!`)
  })
  
  // Listen for chat messages requesting supplies
  bot.on('chat', async (username, message) => {
    // Ignore own messages
    if (username === bot.username) return
    
    // Ignore system messages
    if (username === '@@SYSTEM@@') return
    
    // Check if message is a supply request
    if (!matchesSupplyRequest(message)) return
    
    // Rate limiting - don't spam supplies
    const lastTime = lastSupplyTime.get(username) || 0
    if (Date.now() - lastTime < MIN_SUPPLY_INTERVAL) {
      console.log(`[brigadier] Ignoring supply request from ${username} (rate limit)`)
      return
    }
    
    console.log(`[brigadier] Supply request detected: ${username}: ${message}`)
    
    // Try to detect job type from message
    const jobType = detectJobFromMessage(message, username)
    
    if (!jobType) {
      console.log(`[brigadier] Could not detect job type for ${username}`)
      bot.chat(`Comrade ${username}, state your role clearly!`)
      return
    }
    
    // Distribute supplies
    lastSupplyTime.set(username, Date.now())
    await distributeSupplies(bot, username, jobType)
    suppliedPlayers.add(username)
  })
  
  // Idle loop - brigadier just manages and waits
  while (!task.cancelled) {
    await sleep(2000)
    
    // Could add periodic checks here:
    // - Check worker health
    // - Monitor farm progress
    // - Report statistics
  }
  
  stopMotion(bot)
  bot.chat('Brigadier standing down.')
}

module.exports = {
  name: 'brigadier',
  label: 'Brigadier (Supply Manager)',
  run
}
