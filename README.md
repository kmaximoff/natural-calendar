# 🌙 Natural Calendar

A **13-month lunar calendar system** aligned with Earth's natural rhythms and lunar cycles. Built with TypeScript.

![Natural Calendar Preview](https://via.placeholder.com/800x400/1a1a2e/a8c7fa?text=Natural+Calendar)

## ✨ Features

- **13 Months, 28 Days Each** - Every month is exactly 4 weeks
- **Aeterna (Day Out of Time)** - Special day on the Vernal Equinox (March 20th)
- **Live Moon Phases** - Real-time lunar phase calculations for every day
- **Year Navigation** - Browse past and future years infinitely
- **Esoteric Insights** - Moon phase wisdom and guidance
- **Cosmic Dark Theme** - Beautiful glassmorphism design

## 🗓️ Calendar Structure

```
365 Days = 1 Aeterna + (13 Months × 28 Days)
```

| Component | Details |
|-----------|---------|
| **Months** | Vernis, Germen, Flora, Sol, Aestus, Serere, Fructus, Messis, Autumnus, Bruma, Niveus, Glacies, Renova |
| **Week** | 3 Days of Work + 1 Day of Rest (4-day cycle) |
| **Year Start** | Vernal Equinox (March 20th) |
| **Year 0** | 2025 (Gregorian) |

## 🚀 Live Demo

[View Live Demo →](https://yourusername.github.io/natural-calendar)

## 💻 Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/natural-calendar.git
cd natural-calendar

# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode (auto-rebuild on changes)
npm run dev
```

### Project Structure

```
natural-calendar/
├── src/
│   └── calendar.ts    # Main TypeScript source
├── index.html         # Main calendar view
├── about.html         # Philosophy & documentation
├── style.css          # Cosmic dark theme styles
├── calendar.js        # Compiled JavaScript (auto-generated)
├── package.json       # npm configuration
└── tsconfig.json      # TypeScript configuration
```

## 🌘 Moon Phases

The calendar displays 8 distinct moon phases:

| Phase | Symbol | Energy |
|-------|--------|--------|
| New Moon | 🌑 | Inward, intentions |
| Waxing Crescent | 🌒 | Building |
| First Quarter | 🌓 | Action |
| Waxing Gibbous | 🌔 | Refinement |
| Full Moon | 🌕 | Peak, illumination |
| Waning Gibbous | 🌖 | Gratitude |
| Last Quarter | 🌗 | Release |
| Waning Crescent | 🌘 | Rest, integration |

## 📜 Philosophy

> "Time is Art, not just money."

The Gregorian calendar disconnects us from natural rhythms with its irregular months (28-31 days). The Natural Calendar restores harmony:

- **Consistent rhythm**: Every month is identical
- **Lunar awareness**: See moon phases at a glance
- **Seasonal alignment**: Year begins with spring equinox
- **Sustainable work**: 3 days work, 1 day rest

[Read full documentation →](about.html)

## 🛠️ Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Vanilla CSS** - Custom glassmorphism design system
- **No frameworks** - Pure HTML/CSS/JS for maximum performance
- **GitHub Pages** - Static hosting

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

*Aligned with Earth & Moon* 🌍🌙
