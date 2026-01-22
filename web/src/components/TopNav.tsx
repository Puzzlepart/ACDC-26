const navLinks = [
  { label: '~/', href: '/', external: false },
  { label: 'CCCP', href: 'https://cccp.craycon.no', external: true },
  { label: 'SharePoint', href: 'https://craycon.sharepoint.com', external: true },
  { label: 'ACDC', href: 'https://arcticclouddeveloperchallenge.net', external: true },
]

const TopNav = () => {
  return (
    <header className="fixed top-0 inset-x-0 z-30">
      <div className="mx-auto max-w-6xl px-4 md:px-8 pt-4">
        <div className="bg-black/60 border border-creeper/30 rounded-lg px-4 py-3 backdrop-blur-md shadow-[0_0_20px_rgba(57,255,20,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="font-pixel text-[10px] text-creeper-light">NAV.sys</span>
              <span className="h-4 w-px bg-creeper/40" />
              <span className="font-mono text-xs text-gray-400">link-out</span>
            </div>
            <nav className="flex flex-wrap items-center gap-3 sm:gap-6 font-mono text-xs md:text-sm">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-gray-300 hover:text-creeper-light transition-colors"
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noreferrer' : undefined}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopNav
