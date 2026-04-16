# Limb

A self-hosted iOS springboard-style dashboard for your home services. Organize apps, bookmarks and widgets on a paginated grid with drag-and-drop, search and full JSON persistence.

![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Express](https://img.shields.io/badge/Express-4-green) ![Docker](https://img.shields.io/badge/Docker-ready-blue)


<img width="1015" height="913" alt="image" src="https://github.com/user-attachments/assets/6fcf22c9-1cec-44ab-bba2-169d29c43d0c" />

<img width="537" height="1130" alt="image" src="https://github.com/user-attachments/assets/d0a0362f-6c69-4c60-8df4-c8b102cb0032" />

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

### Docker (recommended)

No need to clone the repository. Just create a `docker-compose.yml` anywhere on your machine:

```yaml
services:
  limb:
    image: ghcr.io/infinition/limb:latest
    container_name: limb
    restart: unless-stopped
    ports:
      - "8090:3001"
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
      - ./gallery:/app/gallery
      - ./uploads:/app/public/uploads
    environment:
      - NODE_ENV=production
      - PORT=3001
```

Then run:

```bash
docker compose up -d
```

That's it. The dashboard is accessible at `http://<host>:8090`.

To update to the latest version:

```bash
docker compose pull && docker compose up -d
```

<details>
<summary><strong>Optional: automatic updates with Watchtower</strong></summary>

Add this service to your `docker-compose.yml` to automatically pull new versions every 5 minutes:

```yaml
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower-limb
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=300
    command: limb
```

</details>

<details>
<summary><strong>NAS / custom volume paths</strong></summary>

If your data directory is elsewhere (e.g. Synology NAS), adjust the volume paths:

```yaml
    volumes:
      - /volume1/docker/limb/data:/app/data
      - /volume1/docker/limb/backups:/app/backups
      - /volume1/docker/limb/gallery:/app/gallery
      - /volume1/docker/limb/uploads:/app/public/uploads
```

</details>

### Local Development

For contributors who want to work on the code:

```bash
git clone https://github.com/infinition/limb.git
cd limb
npm install
npm run dev
```

This starts both the Express API on `http://localhost:3001` and the Vite dev server on `http://localhost:5173`.

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

## Star History

<a href="https://www.star-history.com/?repos=infinition%2Flimb&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=infinition/limb&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=infinition/limb&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=infinition/limb&type=date&legend=top-left" />
 </picture>
</a>
