import { useEffect, useRef } from 'react'

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Matrix characters (mix of Minecraft-themed and hacker symbols)
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ░▒▓█▀▄▌▐■□◆◇CREEPER<>/{}[]#@$%&*'
    const charArray = chars.split('')
    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)

    // Array of drops - one per column
    const drops: number[] = Array(columns).fill(1)

    const draw = () => {
      // Semi-transparent black to create fade effect
      ctx.fillStyle = 'rgba(13, 13, 13, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Green text
      ctx.fillStyle = '#39FF14'
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = charArray[Math.floor(Math.random() * charArray.length)]

        // Vary the green shade
        const greenShade = Math.random() > 0.9 ? '#7CB342' : Math.random() > 0.8 ? '#4DD0E1' : '#39FF14'
        ctx.fillStyle = greenShade

        ctx.fillText(char, i * fontSize, drops[i] * fontSize)

        // Reset drop randomly after it passes screen
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 50)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 opacity-20"
      style={{ background: 'transparent' }}
    />
  )
}

export default MatrixRain
