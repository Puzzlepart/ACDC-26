import { useState, useEffect } from 'react'

const Hero = () => {
  const [glitchText, setGlitchText] = useState('CrayCon Creepers')

  useEffect(() => {
    const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const originalText = 'CrayCon Creepers'

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        let glitched = ''
        for (let i = 0; i < originalText.length; i++) {
          if (Math.random() > 0.9) {
            glitched += glitchChars[Math.floor(Math.random() * glitchChars.length)]
          } else {
            glitched += originalText[i]
          }
        }
        setGlitchText(glitched)
        setTimeout(() => setGlitchText(originalText), 100)
      }
    }, 200)

    return () => clearInterval(glitchInterval)
  }, [])

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Pixel grid background */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(85, 139, 47, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(85, 139, 47, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Logo */}
      <div className="relative group mb-8">
        <div className="absolute -inset-4 bg-creeper/20 blur-xl group-hover:bg-creeper/40 transition-all duration-500 rounded-lg" />
        <img
          src="/logo.png"
          alt="CrayCon Creepers Logo"
          className="relative w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_0_15px_rgba(57,255,20,0.5)] hover:drop-shadow-[0_0_30px_rgba(57,255,20,0.8)] transition-all duration-300 hover:scale-105"
        />
      </div>

      {/* Title */}
      <h1 className="font-pixel text-2xl md:text-4xl lg:text-5xl text-center mb-4 text-creeper-light animate-glow">
        {glitchText}
      </h1>

      {/* Subtitle */}
      <div className="flex items-center gap-4 mb-8">
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-neon-green" />
        <p className="font-mono text-neon-green text-sm md:text-base tracking-widest">
          [ CCC ]
        </p>
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-neon-green" />
      </div>

      {/* Tagline */}
      <p className="font-mono text-gray-400 text-center max-w-xl mb-12 leading-relaxed">
        <span className="text-diamond">&gt;</span> Elite Minecraft operatives from{' '}
        <span className="text-creeper-light">Crayon Consulting</span>
      </p>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 flex flex-col items-center animate-bounce">
        <span className="text-creeper-light text-xs mb-2 font-mono">SCROLL</span>
        <div className="w-6 h-10 border-2 border-creeper-light rounded-full flex justify-center">
          <div className="w-1 h-3 bg-creeper-light rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  )
}

export default Hero
