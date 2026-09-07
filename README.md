# ChordSync 🎸

A personal chord-chart viewer and playlist sync app for small groups. Search songs from ChordLanka and Ultimate Guitar, save them to playlists, and sync sessions live across devices — perfect for band practice.

---

## Quick Start (Development)

```bash
# Install all dependencies
npm run install:all

# Start both servers (client on :5173, API on :3001)
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Self-hosted (Docker)

```bash
docker-compose up -d
```

App runs on **http://localhost:3001** (serves the built client + API together).

---

## Features

- 🔍 **Search** ChordLanka and Ultimate Guitar simultaneously (or paste a URL directly)
- 🎵 **Chord viewer** with correct chord-above-lyric alignment
- 🔀 **Transpose** up/down (client-side, no re-fetch)
- ⏩ **Autoscroll** with adjustable speed
- 🔤 **Font size** controls
- 📋 **Playlists** — create, add songs, drag-and-drop reorder, share
- 🔗 **Share sessions** — anyone with the link joins a live-synced room
- 👑 **Leader/follower** — leader's song, scroll, and transpose broadcast to all followers
- 🔄 **Take control** — any participant can claim leadership anytime
- 💾 **Song cache** — 48h TTL to avoid re-scraping

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v3 |
| Backend | Node.js 22 + Express + TypeScript |
| Database | SQLite via Prisma |
| Realtime | Socket.io v4 |
| Scraping | Axios + Cheerio |

---

## Project Structure

```
HelaChords/
├── server/           # Express + Socket.io + Prisma
│   ├── src/
│   │   ├── adapters/ # ChordLanka & Ultimate Guitar scrapers
│   │   ├── routes/   # REST API handlers
│   │   ├── services/ # SongCache, SessionService
│   │   └── socket/   # Socket.io event handlers
│   └── prisma/       # Schema + SQLite DB
├── client/           # React + Vite + Tailwind
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── lib/
├── Dockerfile
└── docker-compose.yml
```

---

## Notes

- **Auth**: Username-only, stored in `localStorage`. No passwords.
- **Playlists**: Private by default — only accessible via share link.
- **Attribution**: Every song view shows a visible link back to its source (ChordLanka or Ultimate Guitar).
- **Cache**: Song content is cached for 48 hours only, not archived permanently.
- **UG Search**: Ultimate Guitar aggressively blocks bots — the "paste a URL" input is the reliable pathway for UG songs.
