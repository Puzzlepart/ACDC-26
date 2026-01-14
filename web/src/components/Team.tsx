const teamMembers = [
  { name: 'Sindre', role: 'Team Lead', status: 'online', specialty: 'Strategy' },
  { name: 'Øistein', role: 'Builder', status: 'online', specialty: 'Architecture' },
  { name: 'Remi', role: 'Combat Specialist', status: 'online', specialty: 'PvP' },
  { name: 'Kim', role: 'Redstone Engineer', status: 'online', specialty: 'Automation' },
]

const Team = () => {
  return (
    <section id="team" className="py-20 px-4 md:px-8 bg-black/30">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-12">
          <span className="text-creeper-light font-pixel text-xs md:text-sm">02</span>
          <h2 className="font-pixel text-lg md:text-2xl text-white">TEAM.roster</h2>
          <span className="flex-1 h-px bg-gradient-to-r from-creeper to-transparent" />
        </div>

        {/* Team grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member, index) => (
            <div
              key={member.name}
              className="group relative bg-terminal-bg/80 border border-creeper/30 p-6 rounded-lg hover:border-creeper transition-all duration-300 hover:shadow-neon"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Player head placeholder (pixelated avatar) */}
              <div className="w-16 h-16 bg-creeper/20 border-2 border-creeper mb-4 flex items-center justify-center group-hover:bg-creeper/40 transition-colors">
                <span className="font-pixel text-2xl text-creeper-light">
                  {member.name.slice(0, 2).toUpperCase()}
                </span>
              </div>

              {/* Member info */}
              <h3 className="font-mono text-lg text-white mb-1 group-hover:text-creeper-light transition-colors">
                {member.name}
              </h3>
              <p className="text-diamond text-sm mb-2">{member.role}</p>
              <p className="text-gray-500 text-xs">
                <span className="text-neon-green">&gt;</span> {member.specialty}
              </p>

              {/* Status indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    member.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                  }`}
                />
                <span className="text-xs text-gray-500 font-mono">{member.status}</span>
              </div>

              {/* Corner decorations */}
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-creeper/30 group-hover:border-creeper transition-colors" />
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-gray-500 text-sm mt-8 font-mono">
          <span className="text-neon-green">$</span> Four operatives. Maximum destruction.
        </p>
      </div>
    </section>
  )
}

export default Team
