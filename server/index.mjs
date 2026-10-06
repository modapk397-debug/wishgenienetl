/**
 * Wish Genie API server.
 *
 * Routes:
 *   POST   /api/auth/login                  — admin passcode login → signed session token
 *   GET    /api/auth/me                     — verify session token
 *   GET    /api/admin/pages                 — list pages (admin)
 *   POST   /api/admin/pages                 — create page (admin)
 *   GET    /api/admin/pages/:id             — page + photos + all wishes (admin)
 *   PUT    /api/admin/pages/:id             — update page (admin)
 *   DELETE /api/admin/pages/:id             — delete page (admin)
 *   PUT    /api/admin/pages/:id/tokens      — regenerate share links (admin)
 *   POST   /api/admin/pages/:id/photos      — upload photos (admin, multipart)
 *   PUT    /api/admin/pages/:id/photos      — reorder photos (admin)
 *   DELETE /api/admin/pages/:id/photos/:pid — remove photo (admin)
 *   PATCH  /api/admin/wishes/:id            — approve/reject wish (admin)
 *   DELETE /api/admin/wishes/:id            — delete wish (admin)
 *   GET    /api/p/:token                    — public view-only payload (counts a view)
 *   GET    /api/c/:token                    — public contribute payload
 *   POST   /api/c/:token/wishes             — submit a wish (rate-limited, optional photo)
 */
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'
import { mkdirSync, existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getAuthSecret,
  listPages,
  getPage,
  getPageByViewToken,
  getPageByContributeToken,
  createPage,
  updatePage,
  deletePage,
  incrementViews,
  rotateTokens,
  listPhotos,
  addPhoto,
  getPhoto,
  deletePhoto,
  reorderPhotos,
  listApprovedWishes,
  listAllWishes,
  createWish,
  setWishStatus,
  getWish,
  deleteWish,
  countWishes,
} from './db.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadsDir = join(__dirname, 'uploads')
mkdirSync(uploadsDir, { recursive: true })

const app = express()
const port = Number(process.env.PORT || 8787)

/* ------------------------------------------------------------------ */
/* Config                                                               */
/* ------------------------------------------------------------------ */

/**
 * Admin login passcode. Set the ADMIN_PASSCODE env var in production;
 * falls back to a dev default so `npm run dev` works immediately.
 */
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'wishgenie-admin'

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB per photo
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/* ------------------------------------------------------------------ */
/* Middleware                                                           */
/* ------------------------------------------------------------------ */

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', immutable: true }))

// Multer: memory storage — we validate type/size ourselves before touching disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 10 },
})

/* --------------------------- rate limiters ------------------------- */

/** In-memory fixed-window limiter (no extra dependency; fine for a single instance). */
function makeLimiter({ windowMs, limit, message }) {
  const hits = new Map() // key -> { count, resetAt }
  return function rateLimit(req, res, next) {
    const key = `${req.ip}:${req.baseUrl}${req.path}`
    const now = Date.now()
    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }
    entry.count += 1

    // Periodic cleanup so the map does not grow forever.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
    }

    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({ error: message })
    }
    next()
  }
}

// Strict limiter for the admin login (brute-force protection).
const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many login attempts. Try again in 15 minutes.',
})

// Limiter for the public contribute form (spam protection).
const contributeLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: 'You have submitted several wishes already. Please wait a bit.',
})

/* --------------------------- auth helpers -------------------------- */

/** Signs a payload as `base64url(json).signature`. */
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', getAuthSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verifySession(token) {
  if (typeof token !== 'string' || !token.includes('.')) return false
  const [body, sig] = token.split('.')
  const expected = createHmac('sha256', getAuthSecret()).update(body).digest('base64url')
  const a = Buffer.from(sig || '')
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    return typeof payload.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!verifySession(token)) return res.status(401).json({ error: 'Admin authentication required.' })
  next()
}

/* --------------------------- validation ---------------------------- */

/** Basic HTML sanitizer for the rich-text letter (blocks scripts/handlers). */
function sanitizeHtml(input) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .slice(0, 20000)
}

/** Plain-text field: strip control chars, trim, cap length. */
function cleanText(value, max) {
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max)
}

const OCCASIONS = new Set(['birthday', 'anniversary', 'congratulations', 'thank-you', 'wedding', 'new-baby', 'good-luck', 'just-because', 'other'])
const ANIMATIONS = new Set(['confetti', 'hearts', 'balloons', 'fireworks', 'particles'])
const COLOR_THEMES = new Set(['rose', 'ocean', 'sunset', 'royal', 'mint', 'midnight'])

function readPageInput(body) {
  const title = cleanText(body.title, 120)
  const occasion = String(body.occasion || 'birthday')
  if (!title) return { error: 'Title is required.' }
  if (!OCCASIONS.has(occasion)) return { error: 'Unknown occasion type.' }
  if (!ANIMATIONS.has(String(body.animation))) return { error: 'Unknown animation theme.' }
  if (!COLOR_THEMES.has(String(body.colorTheme))) return { error: 'Unknown color theme.' }
  return {
    value: {
      title,
      occasion,
      recipient: cleanText(body.recipient, 80),
      letter: sanitizeHtml(body.letter),
      animation: String(body.animation),
      colorTheme: String(body.colorTheme),
      music: body.music ? cleanText(body.music, 300) : null,
      autoPublish: !!body.autoPublish,
    },
  }
}

/** Validates an uploaded image; returns a file extension or null. */
function imageExt(file) {
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) return null
  if (file.size > MAX_IMAGE_BYTES) return null
  // Magic-byte sniffing so a renamed file cannot sneak past the MIME check.
  const b = file.buffer
  const isJpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
  const isGif = b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46
  const isWebp = b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP'
  if (isJpeg) return '.jpg'
  if (isPng) return '.png'
  if (isGif) return '.gif'
  if (isWebp) return '.webp'
  return null
}

/** Saves a validated image under a random, non-guessable filename. */
function saveImage(file, prefix) {
  const ext = imageExt(file)
  if (!ext) return null
  const name = `${prefix}-${Date.now()}-${randomBytes(6).toString('hex')}${ext}`
  writeFileSync(join(uploadsDir, name), file.buffer)
  return name
}

/** Deletes a file only if it resolves inside the uploads directory. */
function safeUnlink(filename) {
  if (!filename) return
  const target = normalize(join(uploadsDir, filename))
  if (!target.startsWith(uploadsDir)) return
  if (existsSync(target)) unlinkSync(target)
}

/* ------------------------------------------------------------------ */
/* Auth routes                                                          */
/* ------------------------------------------------------------------ */

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const passcode = String(req.body?.passcode ?? '')
  const a = Buffer.from(passcode)
  const b = Buffer.from(ADMIN_PASSCODE)
  const ok = a.length === b.length && timingSafeEqual(a, b)
  if (!ok) return res.status(401).json({ error: 'Incorrect passcode.' })
  res.json({ token: sign({ role: 'admin', exp: Date.now() + SESSION_TTL_MS }) })
})

app.get('/api/auth/me', (req, res) => {
  const token = String(req.headers.authorization || '').replace(/^Bearer /, '')
  res.json({ admin: verifySession(token) })
})

/* ------------------------------------------------------------------ */
/* Admin routes                                                         */
/* ------------------------------------------------------------------ */

app.get('/api/admin/pages', requireAdmin, (_req, res) => {
  const pages = listPages().map((page) => ({ ...page, wishCount: countWishes(page.id) }))
  res.json({ pages })
})

app.post('/api/admin/pages', requireAdmin, (req, res) => {
  const { error, value } = readPageInput(req.body || {})
  if (error) return res.status(400).json({ error })
  res.status(201).json({ page: createPage(value) })
})

app.get('/api/admin/pages/:id', requireAdmin, (req, res) => {
  const page = getPage(Number(req.params.id))
  if (!page) return res.status(404).json({ error: 'Page not found.' })
  res.json({ page, photos: listPhotos(page.id), wishes: listAllWishes(page.id, req.query.status) })
})

app.put('/api/admin/pages/:id', requireAdmin, (req, res) => {
  const existing = getPage(Number(req.params.id))
  if (!existing) return res.status(404).json({ error: 'Page not found.' })
  const { error, value } = readPageInput(req.body || {})
  if (error) return res.status(400).json({ error })
  res.json({ page: updatePage(existing.id, value) })
})

app.delete('/api/admin/pages/:id', requireAdmin, (req, res) => {
  const page = getPage(Number(req.params.id))
  if (!page) return res.status(404).json({ error: 'Page not found.' })
  listPhotos(page.id).forEach((photo) => safeUnlink(photo.filename))
  listAllWishes(page.id).forEach((wish) => safeUnlink(wish.photo))
  deletePage(page.id)
  res.json({ ok: true })
})

app.put('/api/admin/pages/:id/tokens', requireAdmin, (req, res) => {
  const page = getPage(Number(req.params.id))
  if (!page) return res.status(404).json({ error: 'Page not found.' })
  res.json({ page: rotateTokens(page.id) })
})

/* --------------------------- photo routes -------------------------- */

app.post('/api/admin/pages/:id/photos', requireAdmin, (req, res) => {
  const page = getPage(Number(req.params.id))
  if (!page) return res.status(404).json({ error: 'Page not found.' })

  upload.array('photos', 10)(req, res, (err) => {
    if (err) {
      return res
        .status(400)
        .json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be 5MB or smaller.' : 'Upload failed.' })
    }
    const files = req.files || []
    const saved = []
    const rejected = []
    for (const file of files) {
      const name = saveImage(file, `p${page.id}`)
      if (name) saved.push(addPhoto(page.id, name))
      else rejected.push(file.originalname)
    }
    if (!saved.length && rejected.length) {
      return res.status(400).json({ error: 'Unsupported image type or too large. Use JPEG, PNG, WebP or GIF under 5MB.' })
    }
    res.status(201).json({ photos: listPhotos(page.id), rejected })
  })
})

app.put('/api/admin/pages/:id/photos', requireAdmin, (req, res) => {
  const page = getPage(Number(req.params.id))
  if (!page) return res.status(404).json({ error: 'Page not found.' })
  const ids = Array.isArray(req.body?.order) ? req.body.order.map(Number).filter(Number.isInteger) : []
  reorderPhotos(page.id, ids)
  res.json({ photos: listPhotos(page.id) })
})

app.delete('/api/admin/pages/:id/photos/:photoId', requireAdmin, (req, res) => {
  const photo = getPhoto(Number(req.params.photoId))
  if (!photo || photo.page_id !== Number(req.params.id)) return res.status(404).json({ error: 'Photo not found.' })
  safeUnlink(photo.filename)
  deletePhoto(photo.id)
  res.json({ photos: listPhotos(Number(req.params.id)) })
})

/* --------------------------- wish moderation ----------------------- */

app.patch('/api/admin/wishes/:id', requireAdmin, (req, res) => {
  const wish = getWish(Number(req.params.id))
  if (!wish) return res.status(404).json({ error: 'Wish not found.' })
  const status = String(req.body?.status || '')
  if (!['approved', 'pending', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status.' })
  setWishStatus(wish.id, status)
  res.json({ wish: getWish(wish.id) })
})

app.delete('/api/admin/wishes/:id', requireAdmin, (req, res) => {
  const wish = getWish(Number(req.params.id))
  if (!wish) return res.status(404).json({ error: 'Wish not found.' })
  safeUnlink(wish.photo)
  deleteWish(wish.id)
  res.json({ ok: true })
})

/* ------------------------------------------------------------------ */
/* Public routes                                                        */
/* ------------------------------------------------------------------ */

/** VIEW-ONLY payload: everything except admin data and the contribute token. */
app.get('/api/p/:token', (req, res) => {
  const page = getPageByViewToken(String(req.params.token))
  if (!page) return res.status(404).json({ error: 'This greeting link is invalid or has been revoked.' })
  incrementViews(page.id)
  const { viewToken, contributeToken, ...publicPage } = page
  void viewToken
  void contributeToken
  res.json({ page: publicPage, photos: listPhotos(page.id), wishes: listApprovedWishes(page.id) })
})

/** CONTRIBUTE payload: just enough context for the wish form. */
app.get('/api/c/:token', (req, res) => {
  const page = getPageByContributeToken(String(req.params.token))
  if (!page) return res.status(404).json({ error: 'This contribution link is invalid or has been revoked.' })
  res.json({
    page: {
      title: page.title,
      occasion: page.occasion,
      recipient: page.recipient,
      animation: page.animation,
      colorTheme: page.colorTheme,
      autoPublish: page.autoPublish,
      wishCount: countWishes(page.id),
    },
  })
})

app.post('/api/c/:token/wishes', contributeLimiter, (req, res) => {
  const page = getPageByContributeToken(String(req.params.token))
  if (!page) return res.status(404).json({ error: 'This contribution link is invalid or has been revoked.' })

  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res
        .status(400)
        .json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5MB or smaller.' : 'Upload failed.' })
    }

    const name = cleanText(req.body?.name, 60)
    const message = cleanText(req.body?.message, 500)
    if (!name || !message) return res.status(400).json({ error: 'Please provide your name and a message.' })

    let photo = null
    if (req.file) {
      photo = saveImage(req.file, `w${page.id}`)
      if (!photo) return res.status(400).json({ error: 'Photo must be JPEG, PNG, WebP or GIF under 5MB.' })
    }

    const wish = createWish(page.id, { name, message, photo, autoPublish: page.autoPublish })
    res.status(201).json({
      pending: wish.status === 'pending',
      message: page.autoPublish
        ? 'Your wish has been added to the page!'
        : 'Your wish has been sent — it will appear once it is approved.',
    })
  })
})

/* ------------------------------------------------------------------ */
/* SPA fallback (production serves the Vite build from /dist)           */
/* ------------------------------------------------------------------ */

const distDir = join(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => res.sendFile(join(distDir, 'index.html')))
}

// Central error handler (must be registered last).
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

app.listen(port, () => {
  console.log(`Wish Genie API listening on http://localhost:${port}`)
  if (process.env.ADMIN_PASSCODE) {
    console.log('  Admin passcode: from ADMIN_PASSCODE env')
  } else {
    console.log(`  Admin passcode: ${ADMIN_PASSCODE} (dev default — set ADMIN_PASSCODE to change)`)
  }
})
