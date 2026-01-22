import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const CCCP = () => {
  const [quotaProgress, setQuotaProgress] = useState({
    wheat: 0,
    potatoes: 0,
    beets: 0
  })

  const [factoryStatus, setFactoryStatus] = useState([
    { name: 'Factory A - Line 1', product: 'Bread Production', progress: 0, target: 83 },
    { name: 'Factory B - Line 2', product: 'Potato Processing', progress: 0, target: 67 },
    { name: 'Bakery - Line 3', product: 'Pastry Production', progress: 0, target: 92 }
  ])

  const [comradeCount, setComradeCount] = useState(0)
  const [blocksPlaced, setBlocksPlaced] = useState(0)

  useEffect(() => {
    // Animate quota progress
    const timer = setTimeout(() => {
      setQuotaProgress({ wheat: 82, potatoes: 73, beets: 45 })
      setFactoryStatus(prev => prev.map(f => ({ ...f, progress: f.target })))
    }, 500)

    // Animate counters
    const counterInterval = setInterval(() => {
      setComradeCount(prev => Math.min(prev + 7, 1917))
      setBlocksPlaced(prev => Math.min(prev + 42069, 1_000_000))
    }, 50)

    setTimeout(() => clearInterval(counterInterval), 2000)

    return () => {
      clearTimeout(timer)
      clearInterval(counterInterval)
    }
  }, [])

  const slogans = [
    "COMRADES! THE FIVE-YEAR PLAN SHALL BE COMPLETED IN FOUR YEARS!",
    "EVERY BLOCK PLACED IS A VICTORY FOR THE COLLECTIVE!",
    "FROM EACH ACCORDING TO THEIR MINING, TO EACH ACCORDING TO THEIR CRAFTING!",
    "THE BOURGEOISIE WILL NEVER DEFEAT OUR REDSTONE CIRCUITS!",
    "GLORY TO THE AUTOMATED WHEAT FARM!",
  ]

  const [currentSlogan, setCurrentSlogan] = useState(0)

  useEffect(() => {
    const sloganInterval = setInterval(() => {
      setCurrentSlogan(prev => (prev + 1) % slogans.length)
    }, 4000)
    return () => clearInterval(sloganInterval)
  }, [])

  return (
    <div className="min-h-screen bg-[#1a0a0a] text-white relative overflow-hidden">
      {/* Soviet star pattern background */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l6.9 21.2h22.3l-18 13.1 6.9 21.2L30 42.4l-18 13.1 6.9-21.2-18-13.1h22.3z' fill='%23ff0000'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Red banner at top */}
      <div className="bg-gradient-to-r from-red-900 via-red-600 to-red-900 py-4 border-b-4 border-yellow-500 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-yellow-400 hover:text-yellow-300 font-mono text-sm">
              &lt; RETURN TO BASE
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-4xl">☭</span>
              <h1 className="font-bold text-2xl md:text-4xl tracking-wider text-yellow-400" style={{ fontFamily: 'serif' }}>
                CRAYCON CREEPERS COLLECTIVE PRODUCTION
              </h1>
              <span className="text-4xl">☭</span>
            </div>
            <div className="text-yellow-400 font-mono text-sm">
              EST. 2024
            </div>
          </div>
        </div>
      </div>

      {/* Scrolling propaganda banner */}
      <div className="bg-yellow-500 text-red-900 py-2 overflow-hidden relative z-10">
        <div className="animate-marquee whitespace-nowrap font-bold">
          <span className="mx-8">⚒️ {slogans[currentSlogan]} ⚒️</span>
          <span className="mx-8">🎖️ AI AUTOMATION IS THE FUTURE OF THE COLLECTIVE 🎖️</span>
          <span className="mx-8">⛏️ MINE FOR THE MOTHERLAND ⛏️</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-block bg-red-800 border-4 border-yellow-500 px-8 py-6 mb-6">
            <h2 className="text-3xl md:text-5xl font-bold text-yellow-400 mb-2" style={{ fontFamily: 'serif' }}>
              AUTOMATING THE MEANS OF PRODUCTION
            </h2>
            <p className="text-xl text-yellow-200">Through the Power of Artificial Intelligence & Redstone</p>
          </div>

          <p className="text-gray-300 max-w-3xl mx-auto text-lg leading-relaxed">
            Comrades! The CrayCon Creepers Collective has achieved what Marx could only dream of:
            <span className="text-yellow-400 font-bold"> fully automated luxury Minecraft communism</span>.
            Our AI agents toil ceaselessly in the digital fields, producing resources for the glory of the collective!
          </p>
        </div>

        {/* Quota Dashboard */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { name: 'Wheat Quota', current: 2450, target: 3000, progress: quotaProgress.wheat, emoji: '🌾', color: 'yellow' },
            { name: 'Potatoes Quota', current: 1820, target: 2500, progress: quotaProgress.potatoes, emoji: '🥔', color: 'orange' },
            { name: 'Beets Quota', current: 890, target: 2000, progress: quotaProgress.beets, emoji: '🥬', color: 'red' }
          ].map((quota, i) => (
            <div key={i} className="bg-white/10 backdrop-blur border-2 border-yellow-500/50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{quota.emoji}</span>
                <h3 className="text-lg font-bold text-yellow-400">{quota.name}</h3>
              </div>
              <div className="text-4xl font-bold mb-2">
                <span className={quota.progress >= 70 ? 'text-green-400' : quota.progress >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                  {quota.current.toLocaleString()}
                </span>
                <span className="text-gray-400 text-xl"> / {quota.target.toLocaleString()}</span>
              </div>
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-1000 ${
                    quota.progress >= 70 ? 'bg-green-500' : quota.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${quota.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className={`px-2 py-1 rounded ${
                  quota.progress >= 70 ? 'bg-green-600' : quota.progress >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                }`}>
                  {quota.progress}%
                </span>
                <span className="text-gray-400">Output: +{10 + i * 2} / min</span>
              </div>
            </div>
          ))}
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Comrade AI Agents', value: comradeCount.toLocaleString(), icon: '🤖' },
            { label: 'Blocks Placed', value: blocksPlaced.toLocaleString(), icon: '⛏️' },
            { label: 'Redstone Circuits', value: '420', icon: '⚡' },
            { label: 'Hours Without Incident', value: '69', icon: '🎖️' }
          ].map((stat, i) => (
            <div key={i} className="bg-red-900/50 border border-yellow-500/30 rounded p-4 text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-yellow-400">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Factory Status */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/5 border border-yellow-500/30 rounded-lg p-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-6 border-b border-yellow-500/30 pb-2">
              ⚙️ Production Lines
            </h3>
            <div className="space-y-6">
              {factoryStatus.map((factory, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-blue-600' : i === 1 ? 'bg-green-600' : 'bg-orange-600'
                    }`}>
                      {['FA', 'FB', 'BA'][i]}
                    </div>
                    <div>
                      <div className="font-bold">{factory.name}</div>
                      <div className="text-sm text-gray-400">{factory.product}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          factory.progress >= 80 ? 'bg-green-500' : factory.progress >= 60 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${factory.progress}%` }}
                      />
                    </div>
                    <span className="text-sm w-12 text-right">{factory.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-yellow-500/30 rounded-lg p-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-6 border-b border-yellow-500/30 pb-2">
              📋 Order Queue
            </h3>
            <div className="space-y-4">
              {[
                { name: 'Factory A', qty: 500, eta: '2h 15m', icon: '🏭' },
                { name: 'Factory B', qty: 320, eta: '1h 45m', icon: '🏭' },
                { name: 'Bakery', qty: 180, eta: '3h 00m', icon: '🍞' }
              ].map((order, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded">
                  <span className="text-2xl">{order.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold">{order.name}</div>
                    <div className="text-sm text-gray-400">Quantity: {order.qty} units • ETA: {order.eta}</div>
                  </div>
                </div>
              ))}
              <button className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-red-900 font-bold rounded transition">
                Approve New Order
              </button>
            </div>
          </div>
        </div>

        {/* AI Manifesto */}
        <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border-2 border-yellow-500 rounded-lg p-8 mb-12">
          <h3 className="text-2xl font-bold text-yellow-400 mb-4 text-center" style={{ fontFamily: 'serif' }}>
            ☭ THE AI AUTOMATION MANIFESTO ☭
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-gray-300">
            <div>
              <h4 className="font-bold text-yellow-400 mb-2">Our Mission:</h4>
              <ul className="space-y-2">
                <li>✓ Deploy AI agents to automate repetitive Minecraft tasks</li>
                <li>✓ Build self-sustaining farms that produce resources 24/7</li>
                <li>✓ Implement smart redstone circuits for optimal efficiency</li>
                <li>✓ Unite all Minecraft players under the banner of automation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-yellow-400 mb-2">The Revolution:</h4>
              <ul className="space-y-2">
                <li>🔴 Phase 1: Automate wheat farms (COMPLETE)</li>
                <li>🔴 Phase 2: Deploy potato processing AI (IN PROGRESS)</li>
                <li>⚪ Phase 3: Achieve full beet collectivization</li>
                <li>⚪ Phase 4: Expand to Nether resources</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="bg-orange-900/30 border-l-4 border-orange-500 rounded-r-lg p-6 mb-12">
          <h3 className="text-xl font-bold text-orange-400 mb-4">⚠️ Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">HIGH</span>
              <div>
                <div className="font-bold">Beet Field Low Production</div>
                <div className="text-sm text-gray-400">Comrades, the beet quota is falling behind! Deploy additional AI workers immediately!</div>
              </div>
              <span className="text-sm text-gray-500">5 min ago</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">MED</span>
              <div>
                <div className="font-bold">Creeper Detected in Sector 7</div>
                <div className="text-sm text-gray-400">Security AI has neutralized the threat. No casualties among the collective.</div>
              </div>
              <span className="text-sm text-gray-500">23 min ago</span>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="inline-block bg-yellow-500 text-red-900 px-12 py-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">JOIN THE COLLECTIVE TODAY!</h3>
            <p className="mb-4">Together we shall automate the means of production!</p>
            <div className="flex gap-4 justify-center">
              <button className="px-6 py-2 bg-red-700 text-yellow-400 font-bold rounded hover:bg-red-600 transition">
                ⚒️ SIGN UP COMRADE
              </button>
              <button className="px-6 py-2 bg-red-900 text-yellow-400 font-bold rounded hover:bg-red-800 transition">
                📖 READ MANIFESTO
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-red-900 border-t-4 border-yellow-500 py-6 mt-12 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-yellow-400 font-bold mb-2">
            ☭ CRAYCON CREEPERS COLLECTIVE PRODUCTION ☭
          </p>
          <p className="text-gray-400 text-sm">
            "From each according to their ability, to each according to their Minecraft needs"
          </p>
          <p className="text-gray-500 text-xs mt-4">
            © 2024 The Collective | All resources belong to the people | Powered by AI & Redstone
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default CCCP
