# Wish Genie

Wish Genie is a full-stack personalized greeting/wishing website. The admin creates polished greeting pages with photos, a rich-text letter, color + animation themes, and two separate unguessable links:

- **View-only link**: the recipient can view the finished page and approved wishes.
- **Contribute link**: friends/family can submit a short wish and optional photo without editing the original page.

## Features

- React + Tailwind CSS mobile-first frontend
- Node/Express backend
- SQLite database via Node's built-in `node:sqlite`
- Local filesystem uploads in `server/uploads/`
- Admin passcode authentication with signed bearer sessions
- Admin dashboard for create/edit/delete/stats/share links
- Drag-and-drop photo upload, preview, delete, and reorder
- Rich-text letter editor with bold/italic/underline/lists/emojis
- Public animated greeting page with slideshow, typewriter letter, wishes, intro screen, dark/light toggle, music toggle, print/save
- Contribute form with rate limiting and 5MB image validation
- Optional moderation toggle per page: auto-publish or pending approval

## Requirements

- Node.js 24+ recommended, because the app uses built-in `node:sqlite`.

## Local development

```bash
npm install
npm run dev
```

Open:

- Frontend: http://localhost:5173
- API: http://localhost:8787
- Admin dashboard: http://localhost:5173/admin

Default dev admin passcode:

```txt
wishgenie-admin
```

Set a custom passcode before production:

```bash
ADMIN_PASSCODE="your-long-secret" npm start
```

PowerShell example:

```powershell
$env:ADMIN_PASSCODE="your-long-secret"; npm start
```

## Production build

```bash
npm run build
npm start
```

`npm start` serves the Express API and the built frontend from `dist/`.

## Deployment options

### Render / Railway

Good fit for this app because it includes an Express server, SQLite file, and local uploads.

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variables:
  - `ADMIN_PASSCODE=your-long-secret`
  - `PORT` is usually provided by the host
- Add a persistent disk/volume for:
  - `server/data/`
  - `server/uploads/`

### Vercel / Netlify

These are best for static frontend deployments. Because this app uses Express, SQLite, and local uploads, deploy the backend separately on Render/Railway/Fly.io and point the frontend API requests at that backend, or migrate the API to serverless functions + managed Postgres/S3.

## Data locations

- SQLite DB: `server/data/wish-genie.db`
- Uploaded images: `server/uploads/`

Back up both folders if you want to preserve pages and media.
