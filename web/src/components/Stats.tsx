import Icon, { icons } from './Icon'

type IconName = keyof typeof icons

const achievements: { icon: IconName; title: string; description: string; rarity: string }[] = [
  {
    icon: 'diamond',
    title: 'Diamond Miners',
    description: 'Extracted 10,000+ diamonds from the depths',
    rarity: 'legendary',
  },
  {
    icon: 'sword',
    title: 'Code Warriors',
    description: 'Survived 1,000+ merge conflicts',
    rarity: 'epic',
  },
  {
    icon: 'building',
    title: 'Master Builders',
    description: 'Architected systems that didnt collapse',
    rarity: 'rare',
  },
  {
    icon: 'fire',
    title: 'Explosive Entry',
    description: 'First time competitors, maximum damage',
    rarity: 'legendary',
  },
  {
    icon: 'moon',
    title: 'Night Owls',
    description: 'Deployed at 3 AM and it worked',
    rarity: 'epic',
  },
  {
    icon: 'brain',
    title: 'Big Brain Plays',
    description: 'Optimized queries by 9000%',
    rarity: 'rare',
  },
  {
    icon: 'target',
    title: 'Precision Strikers',
    description: 'Zero bugs in production (that we know of)',
    rarity: 'epic',
  },
  {
    icon: 'users',
    title: 'Team Players',
    description: 'Actually read the documentation',
    rarity: 'legendary',
  },
]

const rarityColors = {
  legendary: 'from-yellow-400 to-orange-500',
  epic: 'from-purple-400 to-pink-500',
  rare: 'from-blue-400 to-cyan-500',
}

const rarityGlow = {
  legendary: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]',
  epic: 'shadow-[0_0_20px_rgba(192,132,252,0.5)]',
  rare: 'shadow-[0_0_20px_rgba(96,165,250,0.5)]',
}

const Stats = () => {
  return (
    <section id="stats" className="py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-12">
          <span className="text-creeper-light font-pixel text-xs md:text-sm">03</span>
          <h2 className="font-pixel text-lg md:text-2xl text-white">ACHIEVEMENTS.unlocked</h2>
          <span className="flex-1 h-px bg-gradient-to-r from-creeper to-transparent" />
        </div>

        {/* Achievement grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((achievement, index) => (
            <div
              key={achievement.title}
              className={`group relative bg-black/60 backdrop-blur-sm border border-gray-800 p-5 rounded-lg hover:border-opacity-100 transition-all duration-300 cursor-pointer hover:scale-105 ${rarityGlow[achievement.rarity as keyof typeof rarityGlow]}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Icon */}
              <div className="mb-3 group-hover:scale-110 transition-transform">
                <Icon name={achievement.icon} size="4xl" className="text-current opacity-90" />
              </div>

              {/* Title with gradient */}
              <h3
                className={`font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r ${rarityColors[achievement.rarity as keyof typeof rarityColors]} mb-2`}
              >
                {achievement.title}
              </h3>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed">{achievement.description}</p>

              {/* Rarity badge */}
              <div
                className={`absolute top-3 right-3 px-2 py-1 text-xs font-mono uppercase rounded bg-gradient-to-r ${rarityColors[achievement.rarity as keyof typeof rarityColors]} text-black font-bold`}
              >
                {achievement.rarity}
              </div>

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-creeper/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Blocks Placed', value: '∞', color: 'text-creeper-light' },
            { label: 'Bugs Squashed', value: '404', color: 'text-diamond' },
            { label: 'Coffee Consumed', value: '9001', color: 'text-yellow-400' },
            { label: 'Creeper Level', value: 'MAX', color: 'text-neon-green' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-black/40 border border-creeper/20 p-4 rounded-lg text-center hover:border-creeper/50 transition-colors"
            >
              <div className={`font-pixel text-2xl md:text-3xl ${stat.color} mb-2`}>
                {stat.value}
              </div>
              <div className="text-gray-500 text-xs font-mono uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Stats
