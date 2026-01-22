// Nerd Font icons - https://www.nerdfonts.com/cheat-sheet
// Using Unicode codepoints from Nerd Fonts v3

export const icons = {
  // Achievement icons
  diamond: '\ue615',        // nf-oct-diamond
  sword: '\uf0b4',          // nf-fa-gavel (hammer/combat)
  building: '\uf0f7',       // nf-fa-building
  fire: '\uf06d',           // nf-fa-fire
  moon: '\uf186',           // nf-fa-moon_o
  brain: '\uf5dc',          // nf-fa-brain
  target: '\uf140',         // nf-fa-bullseye
  users: '\uf0c0',          // nf-fa-users

  // Contact icons
  pencil: '\uf040',         // nf-fa-pencil
  globe: '\uf0ac',          // nf-fa-globe
  link: '\uf0c1',           // nf-fa-link

  // Misc
  heart: '\uf004',          // nf-fa-heart
  bomb: '\uf1e2',           // nf-fa-bomb
  terminal: '\uf120',       // nf-fa-terminal
  gamepad: '\uf11b',        // nf-fa-gamepad
  code: '\uf121',           // nf-fa-code
  rocket: '\uf135',         // nf-fa-rocket
  bolt: '\uf0e7',           // nf-fa-bolt
  shield: '\uf132',         // nf-fa-shield

  // CCCP page icons
  hammer: '\uf0ad',         // nf-fa-wrench (tools)
  pickaxe: '\uf1b2',        // nf-fa-cube (mining)
  medal: '\uf5a2',          // nf-mdi-medal
  star: '\uf005',           // nf-fa-star
  wheat: '\uf1bb',          // nf-fa-tree (crops)
  factory: '\uf275',        // nf-fa-industry
  robot: '\uf544',          // nf-mdi-robot
  home: '\uf015',           // nf-fa-home
  explosion: '\uf1e2',      // nf-fa-bomb
  clipboard: '\uf0ea',      // nf-fa-clipboard
  eye: '\uf06e',            // nf-fa-eye
  gift: '\uf06b',           // nf-fa-gift
  user: '\uf007',           // nf-fa-user
  check: '\uf00c',          // nf-fa-check
  cog: '\uf013',            // nf-fa-cog
  gear: '\uf085',           // nf-fa-gears
  chart: '\uf080',          // nf-fa-bar_chart
  hammer_pick: '\uf0ad',    // nf-fa-wrench
  leaf: '\uf06c',           // nf-fa-leaf
  cube: '\uf1b2',           // nf-fa-cube
  cubes: '\uf1b3',          // nf-fa-cubes
  trophy: '\uf091',         // nf-fa-trophy
  flag: '\uf024',           // nf-fa-flag
  comment: '\uf075',        // nf-fa-comment
  quote: '\uf10d',          // nf-fa-quote_left
  play: '\uf04b',           // nf-fa-play
  server: '\uf233',         // nf-fa-server
  database: '\uf1c0',       // nf-fa-database
  crown: '\uf521',          // nf-mdi-crown
  village: '\uf1ad',        // nf-fa-building_o
} as const

type IconName = keyof typeof icons

interface IconProps {
  name: IconName
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
}

const Icon = ({ name, className = '', size = 'md' }: IconProps) => {
  return (
    <span className={`nf ${sizeClasses[size]} ${className}`} aria-hidden="true">
      {icons[name]}
    </span>
  )
}

export default Icon
