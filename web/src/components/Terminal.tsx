import { useState, useEffect } from 'react'
import Icon from './Icon'

const asciiCreeper = `
    ████████████████
    ██  ██████  ████
    ██  ██████  ████
    ████████████████
    ██████    ██████
    ████  ████  ████
    ████  ████  ████
    ██████    ██████
    ████████████████
`

const commands = [
  '> initializing creeper_protocol.exe...',
  '> loading team_roster.dat...',
  '> calibrating explosive_precision...',
  '> syncing hive_mind_network...',
  '> status: READY FOR DETONATION',
  '',
  '> [CCC] ALL SYSTEMS OPERATIONAL',
]

const Terminal = () => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([])
  const [currentCommand, setCurrentCommand] = useState(0)
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    if (currentCommand >= commands.length) {
      setIsTyping(false)
      return
    }

    const timer = setTimeout(
      () => {
        setDisplayedLines((prev) => [...prev, commands[currentCommand]])
        setCurrentCommand((prev) => prev + 1)
      },
      Math.random() * 500 + 300
    )

    return () => clearTimeout(timer)
  }, [currentCommand])

  return (
    <section className="py-20 px-4 md:px-8 bg-black/30">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-12">
          <span className="text-creeper-light font-pixel text-xs md:text-sm">04</span>
          <h2 className="font-pixel text-lg md:text-2xl text-white">TERMINAL.access</h2>
          <span className="flex-1 h-px bg-gradient-to-r from-creeper to-transparent" />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* ASCII Art */}
          <div className="bg-black border border-creeper/30 rounded-lg p-4 overflow-hidden">
            <pre className="text-creeper-light text-xs md:text-sm font-mono leading-tight whitespace-pre select-none">
              {asciiCreeper}
            </pre>
            <p className="text-center text-gray-500 text-xs mt-4 font-mono">
              [ CREEPER.ascii ]
            </p>
          </div>

          {/* Terminal output */}
          <div className="bg-black border border-creeper/30 rounded-lg overflow-hidden">
            {/* Terminal header */}
            <div className="bg-creeper-dark/30 px-4 py-2 flex items-center gap-2 border-b border-creeper/30">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-4 text-gray-400 text-xs font-mono">bash - ccc@mainframe</span>
            </div>

            {/* Terminal content */}
            <div className="p-4 h-64 overflow-hidden">
              <div className="font-mono text-sm space-y-1">
                {displayedLines.map((line, index) => (
                  <p
                    key={index}
                    className={
                      line.includes('READY') || line.includes('OPERATIONAL')
                        ? 'text-neon-green'
                        : line.includes('[CCC]')
                          ? 'text-creeper-light font-bold'
                          : 'text-gray-400'
                    }
                  >
                    {line}
                  </p>
                ))}
                {isTyping && (
                  <span className="inline-block w-2 h-4 bg-neon-green animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Command hint */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm font-mono">
            <span className="text-creeper-light">TIP:</span> Try pressing{' '}
            <kbd className="bg-creeper-dark/50 px-2 py-1 rounded text-xs">Ctrl</kbd> +{' '}
            <kbd className="bg-creeper-dark/50 px-2 py-1 rounded text-xs">C</kbd> to exit...
            just kidding, there's no escape <Icon name="bomb" className="inline text-creeper-light" />
          </p>
        </div>
      </div>
    </section>
  )
}

export default Terminal
