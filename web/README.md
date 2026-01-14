<!-- # CrayCon Creepers (CCC) -->
<p align="center">
  <img src="../assets/ccc_logo.png" alt="CrayCon Creepers Logo" width="200">
</p>
<h2 align="center"> 
  <a href="https://creepers.craycon.no">creepers.craycon.no</a> | CCC Team Website
</h2>

## Stack


- [Bun](https://bun.sh) - JavaScript runtime
- [React](https://react.dev) - UI framework
- [Vite](https://vitejs.dev) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS
- [Cloudflare Workers](https://workers.cloudflare.com/)

---

### Installation

```bash
# Clone the repo
git clone https://github.com/Puzzlepart/ACDC-26.git
cd ACDC-26/web

# Install dependencies
bun install

# Start dev server
bun run dev
```

Visit `http://localhost:5173` to see the site locally.

### Build for Production

```bash
bun run build
```

### Preview Production Build

```bash
bun run preview
```
---

## 📁 Project Structure

```
├── web/                 # Team Website (creepers.craycon.no)
│   ├── public/          # Public static files for the web app
│   ├── src/             # Source code for the web app
└── └   └── components/  # React components
```

---

## 🎨 Design Philosophy

This site fuses three aesthetics:

1. **Minecraft** - Blocky, pixelated, retro gaming vibes
2. **Hacker Culture** - Terminal green, Matrix effects, cyber aesthetics
3. **Modern Web** - Clean, responsive, performant

**Color Palette:**

- Creeper Green: `#7CB342`, `#558B2F`
- Diamond Blue: `#4DD0E1`
- Terminal Neon: `#39FF14`
- Base: Black and dark grays

---

## 🌐 Deployment

The site is deployed as a cloudflare worker with automatic CI/CD on push to `main` branch.  
The web site is set up with DNS pointing to the following domains:

- **Primary:** [creepers.craycon.no](https://creepers.craycon.no)
- **Alias:** [ccc.d0.si](https://ccc.d0.si)