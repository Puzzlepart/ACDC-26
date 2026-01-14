# CrayCon Creepers (CCC) - Team Website

## Project Overview
Team website for CrayCon Creepers, a Crayon Consulting team competing in a Minecraft-themed, Microsoft-focused hackathon formerly known as the Arctic SharePoint Challenge (ASPC). The site lives on `creepers.craycon.no` and `ccc.d0.si`.

## Brand Identity

### Team Name Layers
- **CrayCon Creepers** = CCC
- **CrayCon** = Crayon Consulting shorthand + hacker con vibes
- **Creepers** = Minecraft's iconic explosive mob

### Design Aesthetic
Fusion of:
- **Minecraft**: Blocky, pixelated, 8-bit/16-bit retro gaming
- **Hacker/Cyberpunk**: Terminal green, Matrix vibes, retro computing
- **Modern web**: Clean, responsive, professional but playful

### Color Palette
- **Primary**: Creeper green (#7CB342, #558B2F, #4CAF50)
- **Accent**: Diamond blue (#4DD0E1, #00BCD4)
- **Base**: Black (#000000, #1a1a1a), dark gray (#212121)
- **Highlights**: Neon green (#39FF14), gold/yellow for accents (#FFD700)
- **Text**: White (#FFFFFF), light green (#C8E6C9)

### Typography
- Headers: Monospace/pixel fonts (Minecraft-style) or bold tech fonts
- Body: Clean, readable sans-serif (Inter, Space Grotesk, or system fonts)
- Code/terminal elements: Monospace (Fira Code, JetBrains Mono)

## Team Context

### Company
- **Crayon Consulting** - Microsoft365/SharePoint specialists
- Located in Norway (Oslo area)
- Tech-focused consulting firm

### Competition Theme
- Minecraft-themed company event
- "Arctic Cloud Developer Challenge"
- Mainly Microsoft Stack focus at event, but team is multi-tech/full-stack
- Computer/hacking culture references encouraged
- Year: 2026

## Technical Guidelines

### Preferred Stack
- **Runtime**: Bun > Deno > Node (Bun preferred for speed)
- **Framework**: React + Vite (most agent-friendly)
- **Styling**: Tailwind CSS (utility-first, easy to modify)

### Code Style
- TypeScript preferred where it makes sense
- Clean, well-commented code
- Component-based architecture
- Responsive-first design
- Performance-conscious (fast load times)

### Deployment Targets
- Cloudflare Worker (see `./wrangler.toml` for config)

## Content Guidelines

### Tone
- Professional but playful
- Geeky references encouraged (Minecraft, hacking culture, gaming)
- Not corporate-stiff - this is a fun competition team
- Tech-savvy audience

### Must-Have Sections
1. **Hero** - Logo, team name, tagline
2. **About** - Who we are, what CCC means
3. **Team Roster** - Member cards/list (placeholder for now)
4. **Stats/Achievements** - Fun Minecraft/hacking themed badges
5. **Footer** - Links, Crayon Consulting attribution

### Nice-to-Have Features
- ASCII art easter eggs
- Terminal/command-line aesthetic elements
- Minecraft block animations
- "Matrix rain" or pixel particle effects
- Hover effects on interactive elements
- Konami code easter egg?
- Creeper "hiss" sound on certain interactions (optional)

## Design Principles

### DO:
- Use pixel/blocky elements reminiscent of Minecraft
- Include terminal/CLI aesthetic touches
- Make it fast and responsive
- Add subtle animations that enhance UX
- Keep the Creeper green prominent
- Reference both Minecraft AND hacker culture
- Make it look like an esports team page

### DON'T:
- Make it look like a corporate site
- Overdo animations (avoid being distracting)
- Use bright, eye-straining colors
- Ignore mobile users
- Forget accessibility basics
- Make it too "kiddy" - keep it cool/mature

## Assets

### Logo
- File: `./public/logo.png`
- Features: CCC letters with creeper faces, diamond swords, shield badge
- Colors: Green, black, some yellow/orange accents
- Use prominently in hero section

### Inspiration References
- Chaos Computer Club aesthetic (ccc.de)
- Minecraft official site (minecraft.net)
- Esports team pages (Team Liquid, FaZe Clan style but Minecraft-themed)
- Retro terminal UIs (cool-retro-term, Hollywood hacking aesthetic)
- DEF CON / Black Hat conference sites

## Domain Info
- **Primary**: creepers.craycon.no
- **Alias**: ccc.d0.si
- Both should work identically

## Notes for AI Agents
- This is a FUN project - creativity encouraged!
- User is very technically capable - don't dumb things down
- User values clean, maintainable code over clever hacks
- User will customize content later - focus on structure and style
- Minecraft + hacker culture fusion is the key theme
- The CCC acronym is intentional

## Future Enhancements (Maybe)
- Team member profiles with stats
- Blog/updates section
- Competition results/leaderboard
- Photo gallery
- Integration with Minecraft server stats (if applicable)
- Dark/light mode toggle (though dark is default aesthetic)

---

Remember: This is a team of tech professionals having fun with a Minecraft competition. Balance professional quality with playful, geeky charm. Think "esports team + hacker conference + Minecraft modding community."