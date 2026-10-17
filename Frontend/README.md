# GistPin Frontend

This is the **GistPin web frontend**, built with **Next.js**, responsible for:

- Displaying nearby gists on a map
- Allowing users to drop anonymous gists
- Talking to the GistPin backend API (and, eventually, the Stellar/Soroban contracts)

> **Status:** the map currently renders **mock data** (hard-coded gists) and is
> not yet connected to the backend API or the Soroban contract.

This app is for **end users** who want to explore and contribute hyperlocal content.

---

## 🧰 Tech Stack

- Next.js 15 (App Router, Turbopack)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Leaflet + React Leaflet (OpenStreetMap tiles)
- Framer Motion and GSAP for animation
- lucide-react for icons

---

## ⚙️ Setup Instructions

### Requirements

- Node.js ≥ 18
- npm (the app is developed and locked with npm; `package-lock.json` is committed)

### Install

```bash
npm install
```

### Run

```bash
npm run dev    # start the dev server on http://localhost:3000
npm run build  # production build
npm run start  # serve the production build
npm run lint   # run ESLint
```

---

## 🗺️ Routes

- `/` - landing page
- `/map` - the interactive Leaflet map
