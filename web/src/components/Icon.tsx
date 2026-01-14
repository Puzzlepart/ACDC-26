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
} as const

type IconName = keyof typeof icons

interface IconProps {
  name: IconName
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
}

const Icon = ({ name, className = '', size = 'md' }: IconProps) => {
  return (
    <span className={`nf ${sizeClasses[size]} ${className}`} aria-hidden="true">
      {icons[name]}
    </span>
  )
}

export default Icon
