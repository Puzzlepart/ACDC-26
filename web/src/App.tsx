import MatrixRain from './components/MatrixRain'
import Hero from './components/Hero'
import About from './components/About'
import Team from './components/Team'
import Stats from './components/Stats'
import Terminal from './components/Terminal'
import Contact from './components/Contact'

function App() {
  return (
    <div className="relative min-h-screen bg-terminal-bg">
      <MatrixRain />

      <div className="relative z-10">
        <Hero />
        <About />
        <Team />
        <Stats />
        <Terminal />
        <Contact />
      </div>

      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 scanlines opacity-30" />
    </div>
  )
}

export default App
