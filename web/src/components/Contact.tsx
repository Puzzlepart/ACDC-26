import Icon from './Icon'

const Contact = () => {
  return (
    <footer id="contact" className="py-20 px-4 md:px-8 border-t border-creeper/20">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-12">
          <span className="text-creeper-light font-pixel text-xs md:text-sm">05</span>
          <h2 className="font-pixel text-lg md:text-2xl text-white">CONTACT.link</h2>
          <span className="flex-1 h-px bg-gradient-to-r from-creeper to-transparent" />
        </div>

        {/* Links grid */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {/* Company */}
          <a
            href="https://www.intility.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-black/40 border border-creeper/30 p-6 rounded-lg hover:border-creeper hover:shadow-neon transition-all duration-300 text-center"
          >
            <div className="text-3xl mb-3 text-creeper-light">
              <Icon name="pencil" size="3xl" />
            </div>
            <h3 className="font-mono text-white group-hover:text-creeper-light transition-colors mb-2">
              Crayon Consulting
            </h3>
            <p className="text-gray-500 text-sm">Our mothership</p>
          </a>

          {/* Primary domain */}
          <a
            href="https://creepers.craycon.no"
            className="group bg-black/40 border border-diamond/30 p-6 rounded-lg hover:border-diamond hover:shadow-neon-blue transition-all duration-300 text-center"
          >
            <div className="text-3xl mb-3 text-diamond">
              <Icon name="globe" size="3xl" />
            </div>
            <h3 className="font-mono text-white group-hover:text-diamond transition-colors mb-2">
              creepers.craycon.no
            </h3>
            <p className="text-gray-500 text-sm">Primary base</p>
          </a>

          {/* Secondary domain */}
          <a
            href="https://ccc.d0.si"
            className="group bg-black/40 border border-neon-green/30 p-6 rounded-lg hover:border-neon-green hover:shadow-neon transition-all duration-300 text-center"
          >
            <div className="text-3xl mb-3 text-neon-green">
              <Icon name="link" size="3xl" />
            </div>
            <h3 className="font-mono text-white group-hover:text-neon-green transition-colors mb-2">
              ccc.d0.si
            </h3>
            <p className="text-gray-500 text-sm">Shortlink</p>
          </a>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <span className="flex-1 h-px bg-creeper/20" />
          <span className="text-creeper font-pixel text-xs">CCC</span>
          <span className="flex-1 h-px bg-creeper/20" />
        </div>

        {/* Footer text */}
        <div className="text-center space-y-4">
          <p className="text-gray-500 text-sm font-mono">
            <span className="text-neon-green">&gt;</span> Built with{' '}
            <Icon name="heart" className="text-creeper-light inline" /> and excessive amounts of caffeine
          </p>
          <p className="text-gray-600 text-xs font-mono">
            &copy; {new Date().getFullYear()} CrayCon Creepers | All your base are belong to us
          </p>

          {/* Easter egg */}
          <p className="text-gray-700 text-xs font-mono hover:text-creeper-light transition-colors cursor-default">
            Ssssss... <Icon name="bomb" className="inline" />
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Contact
