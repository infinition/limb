# Limb

A self-hosted iOS springboard-style dashboard for your home services. Organize apps, bookmarks and widgets on a paginated grid with drag-and-drop, search and full JSON persistence.

![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Express](https://img.shields.io/badge/Express-4-green) ![Docker](https://img.shields.io/badge/Docker-ready-blue)

---

## Features

- **Paginated grid** - swipe or arrow-key between pages, free-placement coordinate layout.
- **Drag & drop** - reorder apps across pages with live drop preview.
- **Search** - full-screen instant search overlay.
- **App management** - add, edit, delete apps from the web UI. Drop an external URL onto the grid to auto-create an app with its favicon.
- **Folders** - group apps into folders via a modal overlay.
- **Widgets** - load custom widgets from the `gallery/` directory. Supports JSON and TSX widget formats, rendered in shadow DOM.
- **Uploads** - custom icons and wallpapers uploaded through the settings panel.
- **Themes** - glassmorphism UI, icon shape selection (square, rounded, circle), adjustable grid spacing.
- **Weather chip** - optional weather display with city-based lookup (toggleable).
- **Localization** - persistent EN / FR switch.
- **PWA** - installable on iPhone / Android home screen with proper icons and manifest.
- **Backup** - full export / import with base64-encoded assets and automatic daily snapshots (retention: 10).
- **Dashboard branding** - customizable dashboard name, page title, and favicon.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 5 |
| Backend | Express 4, Node.js 20+ |
| Persistence | JSON file (`data/dashboard.json`) |
| Uploads | Multer → `public/uploads/` |
| Widgets | Shadow DOM runtime, TSX/JSON |

## Project Structure

```
home_dashboard/
├── server/
│   ├── index.js          # Express API + static file serving
│   └── storage.js        # JSON persistence, backup, gallery management
├── src/
│   ├── App.jsx           # Main dashboard state & rendering
│   ├── i18n.js           # EN/FR translations
│   ├── lib/
│   │   └── api.js        # Client-side API wrappers
│   └── components/
│       ├── AppTile.jsx
│       ├── FolderOverlay.jsx
│       ├── FolderTile.jsx
│       ├── SearchOverlay.jsx
│       ├── SettingsModal.jsx
│       └── ShadowWidget.jsx
├── gallery/              # Widget source files (JSON, TSX)
├── public/
│   ├── icons/            # PWA icons
│   ├── uploads/          # User-uploaded icons & wallpapers
│   ├── manifest.webmanifest
│   └── sw.js             # Service worker (app shell only)
├── data/
│   └── dashboard.json    # Persisted dashboard state
├── backups/              # Automatic daily snapshots
├── Dockerfile
├── docker-compose.yml
├── vite.config.js
├── package.json
└── index.html
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Local Development

```bash
git clone https://github.com/<your-username>/limb.git
cd limb
npm install
npm run dev
```

This starts both the Express API on `http://localhost:3001` and the Vite dev server on `http://localhost:5173`.

### Production Build

```bash
npm run build
npm start
```

The app is served entirely from Express on port `3001` (or `PORT` env var).

## Docker Deployment

### Build & Run

```bash
docker compose up -d --build
```

The dashboard is accessible at `http://<host>:8090`.

### Synology NAS

1. Copy the project files to your NAS (via SSH, File Station, or git clone).
2. Create the persistent directories:
   ```bash
   mkdir -p /volume1/docker/home-dashboard/{data,backups,gallery,uploads/icons,uploads/wallpapers}
   ```
3. Place your `dashboard.json` in `/volume1/docker/home-dashboard/data/` (or let the app create a default one).
4. Build and start:
   ```bash
   cd /path/to/home-dashboard
   docker compose up -d --build
   ```
5. Access at `http://<nas-ip>:8090`.

### Docker Compose Configuration

```yaml
services:
  home-dashboard:
    build: .
    container_name: home-dashboard
    restart: unless-stopped
    ports:
      - "8090:3001"
    volumes:
      - /volume1/docker/home-dashboard/data:/app/data
      - /volume1/docker/home-dashboard/backups:/app/backups
      - /volume1/docker/home-dashboard/gallery:/app/gallery
      - /volume1/docker/home-dashboard/uploads:/app/public/uploads
    environment:
      - NODE_ENV=production
      - PORT=3001
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server listening port |
| `NODE_ENV` | - | Set to `production` for optimized serving |

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Fetch dashboard state + widget library + assets |
| `PUT` | `/api/dashboard` | Save dashboard state |
| `POST` | `/api/upload/icon` | Upload an icon |
| `POST` | `/api/upload/wallpaper` | Upload a wallpaper |
| `DELETE` | `/api/upload/icon/:name` | Delete an icon |
| `DELETE` | `/api/upload/wallpaper/:name` | Delete a wallpaper |
| `GET` | `/api/widgets/gallery` | List available widgets |
| `POST` | `/api/widgets/gallery` | Save a widget to the gallery |
| `POST` | `/api/widgets/import` | Import a widget file |
| `DELETE` | `/api/widgets/gallery/:file` | Delete a widget |
| `PUT` | `/api/widgets/:id/state` | Save widget instance state |
| `GET` | `/api/backup/export` | Download full backup bundle |
| `POST` | `/api/backup/import` | Restore from a backup bundle |

## Adding Widgets

Place a `.json` or `.tsx` file in the `gallery/` directory.

**JSON format:**
```json
{
  "name": "My Widget",
  "description": "A simple counter",
  "defaultW": 2,
  "defaultH": 2,
  "html": "<div id=\"root\">0</div>",
  "css": "#root { font-size: 2rem; text-align: center; }",
  "js": "let c=0; document.getElementById('root').onclick=()=>{document.getElementById('root').textContent=++c;}"
}
```

Widgets can also be imported directly from the Settings panel.

## License

MIT
