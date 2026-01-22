const About = () => {
  return (
    <section id="about" className="py-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-12">
          <span className="text-creeper-light font-pixel text-xs md:text-sm">01</span>
          <h2 className="font-pixel text-lg md:text-2xl text-white">ABOUT.exe</h2>
          <span className="flex-1 h-px bg-gradient-to-r from-creeper to-transparent" />
        </div>

        {/* Content box */}
        <div className="relative">
          {/* Terminal window frame */}
          <div className="bg-black/60 backdrop-blur-sm border border-creeper/50 rounded-lg overflow-hidden">
            {/* Terminal header */}
            <div className="bg-creeper-dark/50 px-4 py-2 flex items-center gap-2 border-b border-creeper/30">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-4 text-gray-400 text-sm font-mono">ccc@creepers:~$ cat about.txt</span>
            </div>

            {/* Terminal content */}
            <div className="p-6 md:p-8 font-mono text-sm md:text-base leading-relaxed">
              <p className="text-gray-300 mb-6">
                <span className="text-neon-green">$</span> We are{' '}
                <span className="text-creeper-light font-bold">CrayCon Creepers</span> - an elite squad
                of consultants from{' '}
                <span className="text-diamond">Crayon Consulting</span> who have traded their keyboards
                for pickaxes (temporarily).
              </p>

              <p className="text-gray-300 mb-6">
                <span className="text-neon-green">$</span> Competing in the Arctic Cloud Developer Challenge
                hackathon, we bring the same precision and creativity we apply to consulting
                to the blocky battlefields.
              </p>

              <div className="border-l-2 border-creeper pl-4 my-6">
                <p className="text-creeper-light italic">
                  "Like creepers, we're quiet, strategic, and absolutely devastating when we strike."
                </p>
              </div>

              <p className="text-gray-400">
                <span className="text-neon-green">$</span> Status:{' '}
                <span className="text-green-400 animate-pulse">● ONLINE</span>
                <br />
                <span className="text-neon-green">$</span> Mission:{' '}
                <span className="text-white">DOMINATE</span>
                <br />
                <span className="text-neon-green">$</span> Threat Level:{' '}
                <span className="text-red-400">EXPLOSIVE</span>
              </p>
            </div>
          </div>

          {/* Decorative pixels */}
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-creeper" />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-diamond" />
        </div>
      </div>
    </section>
  )
}

export default About
