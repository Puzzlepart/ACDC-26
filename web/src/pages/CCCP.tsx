import { useState, useEffect } from 'react'
import Icon from '../components/Icon'

const CCCP = () => {
  const [comradeCount, setComradeCount] = useState(0)
  const [blocksPlaced, setBlocksPlaced] = useState(0)

  useEffect(() => {
    const counterInterval = setInterval(() => {
      setComradeCount(prev => Math.min(prev + 7, 1917))
      setBlocksPlaced(prev => Math.min(prev + 42069, 1_000_000))
    }, 50)

    setTimeout(() => clearInterval(counterInterval), 2000)

    return () => clearInterval(counterInterval)
  }, [])

  const slogans = [
    "COMRADES! THE FIVE-YEAR PLAN SHALL BE COMPLETED IN FOUR YEARS!",
    "EVERY BLOCK PLACED IS A VICTORY FOR THE PEOPLE!",
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
          <div className="flex items-center justify-center gap-6">
            <img src="/cccp_logo.png" alt="CCCP Logo" className="w-20 h-20 object-contain" />
            <h1 className="font-bold text-2xl md:text-4xl tracking-wider text-yellow-400" style={{ fontFamily: 'serif' }}>
              CRAYCON CREEPERS CENTRAL PRODUCTION
            </h1>
            <img src="/cccp_logo.png" alt="CCCP Logo" className="w-20 h-20 object-contain" />
          </div>
        </div>
      </div>

      {/* Scrolling propaganda banner */}
      <div className="bg-yellow-500 text-red-900 py-2 overflow-hidden relative z-10">
        <div className="animate-marquee whitespace-nowrap font-bold">
          <span className="mx-8"><Icon name="hammer" className="inline" /> {slogans[currentSlogan]} <Icon name="hammer" className="inline" /></span>
          <span className="mx-8"><Icon name="medal" className="inline" /> AI AUTOMATION IS THE FUTURE OF THE PEOPLE <Icon name="medal" className="inline" /></span>
          <span className="mx-8"><Icon name="pickaxe" className="inline" /> MINE FOR THE MOTHERLAND <Icon name="pickaxe" className="inline" /></span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <img src="/cccp_logo.png" alt="CCCP Logo" className="w-40 h-40 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(255,0,0,0.6)]" />
          </div>
          <div className="inline-block bg-red-800 border-4 border-yellow-500 px-8 py-6 mb-6">
            <h2 className="text-3xl md:text-5xl font-bold text-yellow-400 mb-2" style={{ fontFamily: 'serif' }}>
              AUTOMATING THE MEANS OF PRODUCTION
            </h2>
            <p className="text-xl text-yellow-200">Through the Power of Artificial Intelligence & Redstone</p>
          </div>

          <p className="text-gray-300 max-w-3xl mx-auto text-lg leading-relaxed">
            Comrades! The CrayCon Creepers Central Production unit has achieved what our forefathers could only dream of:
            <span className="text-yellow-400 font-bold"> fully automated luxury Minecraft resource generation</span>.
            Our AI agents toil ceaselessly in the digital fields, producing resources for the glory of the village!
          </p>
        </div>

        {/* AI Harvester Services */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: 'leaf' as const,
              title: 'Wheat Harvester AI',
              description: 'Tireless digital workers that harvest wheat 24/7. No sleep, no breaks, only bread for the people.',
              features: ['Auto-replanting', 'Optimal harvest timing', 'Zero waste policy']
            },
            {
              icon: 'cube' as const,
              title: 'Mining Collective AI',
              description: 'Our agents delve deep into the earth, extracting diamonds, iron, and coal for the glory of your village.',
              features: ['Strip mining protocols', 'Ore detection algorithms', 'TNT optimization']
            },
            {
              icon: 'cubes' as const,
              title: 'Construction Bureau AI',
              description: 'From humble huts to grand fortresses, our AI architects build the infrastructure of tomorrow.',
              features: ['Blueprint execution', 'Material calculation', 'Structural integrity']
            }
          ].map((service, i) => (
            <div key={i} className="bg-gradient-to-b from-red-900/50 to-red-950/50 border-2 border-yellow-500/50 rounded-lg p-6 hover:border-yellow-400 transition-all hover:scale-105">
              <div className="mb-4 text-center">
                <Icon name={service.icon} size="5xl" className="text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-yellow-400 mb-3 text-center">{service.title}</h3>
              <p className="text-gray-300 text-sm mb-4">{service.description}</p>
              <ul className="space-y-2">
                {service.features.map((feature, j) => (
                  <li key={j} className="text-sm text-gray-400 flex items-center gap-2">
                    <Icon name="check" className="text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'AI Agents Deployed', value: comradeCount.toLocaleString(), icon: 'robot' as const },
            { label: 'Blocks Placed', value: blocksPlaced.toLocaleString(), icon: 'cube' as const },
            { label: 'Villages Served', value: '420', icon: 'home' as const },
            { label: 'Creepers Defeated', value: '1,337', icon: 'bomb' as const }
          ].map((stat, i) => (
            <div key={i} className="bg-red-900/50 border border-yellow-500/30 rounded p-4 text-center">
              <div className="mb-2">
                <Icon name={stat.icon} size="3xl" className="text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-400">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="bg-white/5 border border-yellow-500/30 rounded-lg p-8 mb-12">
          <h3 className="text-2xl font-bold text-yellow-400 mb-6 text-center" style={{ fontFamily: 'serif' }}>
            <Icon name="cog" className="inline mr-2" /> HOW OUR AI HARVESTERS SERVE THE VILLAGE <Icon name="cog" className="inline ml-2" />
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Deploy Agent', desc: 'Spawn an AI worker in your Minecraft world', icon: 'rocket' as const },
              { step: '2', title: 'Assign Tasks', desc: 'Tell it what to farm, mine, or build', icon: 'clipboard' as const },
              { step: '3', title: 'Watch & Relax', desc: 'The AI works while you do other things', icon: 'eye' as const },
              { step: '4', title: 'Collect Rewards', desc: 'Enjoy the fruits of automated labor', icon: 'gift' as const }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-yellow-500 text-red-900 rounded-full flex items-center justify-center text-2xl font-bold">
                  {item.step}
                </div>
                <div className="mb-2">
                  <Icon name={item.icon} size="3xl" className="text-yellow-400" />
                </div>
                <h4 className="font-bold text-yellow-400 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-yellow-400 mb-6 text-center" style={{ fontFamily: 'serif' }}>
            <Icon name="medal" className="inline mr-2" /> WORDS FROM THE VILLAGERS <Icon name="medal" className="inline ml-2" />
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Farmer Villager #47', quote: 'Hrmmm! The AI harvested my entire wheat field while I stood in a corner staring at a wall. 10/10.', role: 'Agricultural Sector', icon: 'leaf' as const },
              { name: 'Steve', quote: 'I used to mine for hours. Now the AI does it and I can finally touch grass (the real kind).', role: 'Former Manual Laborer', icon: 'user' as const },
              { name: 'Nitwit Villager', quote: '*stares blankly* ...hrm.', role: 'Moral Support Division', icon: 'brain' as const }
            ].map((testimonial, i) => (
              <div key={i} className="bg-red-900/30 border border-yellow-500/20 rounded-lg p-6">
                <p className="text-gray-300 italic mb-4">
                  <Icon name="quote" className="text-yellow-500/50 mr-1" />
                  {testimonial.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
                    <Icon name={testimonial.icon} className="text-red-900" />
                  </div>
                  <div>
                    <div className="font-bold text-yellow-400">{testimonial.name}</div>
                    <div className="text-xs text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing/CTA */}
        <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border-2 border-yellow-500 rounded-lg p-8 mb-12">
          <h3 className="text-2xl font-bold text-yellow-400 mb-2 text-center" style={{ fontFamily: 'serif' }}>
            <Icon name="hammer" className="inline mr-2" /> DEPLOY YOUR AI WORKFORCE TODAY <Icon name="hammer" className="inline ml-2" />
          </h3>
          <p className="text-center text-gray-400 mb-6">Choose your path to automated prosperity</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { tier: 'Worker', price: '64 Emeralds', agents: '1 AI Agent', features: ['Basic harvesting', 'Simple mining', 'Community support'], icon: 'user' as const },
              { tier: 'Stakhanovite', price: '256 Emeralds', agents: '5 AI Agents', features: ['Advanced farming', 'Deep mining', 'Priority support', 'Custom blueprints'], popular: true, icon: 'users' as const },
              { tier: 'Politburo', price: '1024 Emeralds', agents: 'Unlimited Agents', features: ['All features', 'Nether operations', 'End dimension access', 'Dedicated server'], icon: 'crown' as const }
            ].map((plan, i) => (
              <div key={i} className={`bg-black/30 rounded-lg p-6 ${plan.popular ? 'border-2 border-yellow-400 scale-105' : 'border border-yellow-500/30'}`}>
                {plan.popular && <div className="text-center text-xs font-bold text-red-900 bg-yellow-400 rounded-full px-3 py-1 mb-3 inline-block">MOST POPULAR</div>}
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={plan.icon} className="text-yellow-400" />
                  <h4 className="text-xl font-bold text-yellow-400">{plan.tier}</h4>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{plan.price}</div>
                <div className="text-sm text-gray-500 mb-4">{plan.agents}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="text-sm text-gray-300 flex items-center gap-2">
                      <Icon name="check" className="text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button type="button" className={`w-full py-2 rounded font-bold transition ${plan.popular ? 'bg-yellow-500 text-red-900 hover:bg-yellow-400' : 'bg-red-700 text-yellow-400 hover:bg-red-600'}`}>
                  DEPLOY NOW
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <div className="inline-block bg-yellow-500 text-red-900 px-12 py-8 rounded-lg">
            <h3 className="text-3xl font-bold mb-2">FOR THE GLORY OF THE VILLAGE!</h3>
            <p className="mb-6 text-lg">Let our AI agents do the work while you enjoy the rewards</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button type="button" className="px-8 py-3 bg-red-700 text-yellow-400 font-bold rounded-lg hover:bg-red-600 transition text-lg flex items-center gap-2">
                <Icon name="cube" /> START AUTOMATING
              </button>
              <button type="button" className="px-8 py-3 bg-red-900 text-yellow-400 font-bold rounded-lg hover:bg-red-800 transition text-lg flex items-center gap-2">
                <Icon name="chart" /> VIEW LIVE DASHBOARD
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-red-900 border-t-4 border-yellow-500 py-6 mt-12 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img src="/cccp_logo.png" alt="CCCP Logo" className="w-8 h-8 object-contain" />
            <p className="text-yellow-400 font-bold">
              CRAYCON CREEPERS CENTRAL PRODUCTION
            </p>
            <img src="/cccp_logo.png" alt="CCCP Logo" className="w-8 h-8 object-contain" />
          </div>
          <p className="text-gray-400 text-sm">
            "From each according to their ability, to each according to their Minecraft needs"
          </p>
          <p className="text-gray-500 text-xs mt-4">
            © 2026 CCCP | All resources belong to the people | Powered by AI & Redstone
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
