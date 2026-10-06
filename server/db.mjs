/**
 * Wish Genie — data layer.
 * Uses Node's built-in `node:sqlite` (Node 22.5+ / 24), so no native npm modules
 * are required. The database file lives in server/data/ and is created on first run.
 */
import { DatabaseSync } from 'node:sqlite'
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, 'data')
mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(join(dataDir, 'wish-genie.db'))

db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    occasion        TEXT    NOT NULL DEFAULT 'birthday',
    recipient       TEXT    NOT NULL DEFAULT '',
    letter          TEXT    NOT NULL DEFAULT '',
    animation       TEXT    NOT NULL DEFAULT 'confetti',
    color_theme     TEXT    NOT NULL DEFAULT 'rose',
    music           TEXT,
    auto_publish    INTEGER NOT NULL DEFAULT 1,
    view_token      TEXT    NOT NULL UNIQUE,
    contribute_token TEXT   NOT NULL UNIQUE,
    views           INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS photos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id   INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    filename  TEXT    NOT NULL,
    position  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT   NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wishes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    message    TEXT    NOT NULL,
    photo      TEXT,
    status     TEXT    NOT NULL DEFAULT 'approved',  -- 'pending' | 'approved' | 'rejected'
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_photos_page ON photos(page_id, position);
  CREATE INDEX IF NOT EXISTS idx_wishes_page ON wishes(page_id, status, created_at);
`)

/* ------------------------------------------------------------------ */
/* Settings (persists the signing secret across restarts)              */
/* ------------------------------------------------------------------ */

export function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? row.value : null
}

export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

/** Secret used to sign admin session tokens. Generated once, then reused. */
export function getAuthSecret() {
  let secret = getSetting('auth_secret')
  if (!secret) {
    secret = randomBytes(32).toString('hex')
    setSetting('auth_secret', secret)
  }
  return secret
}

/* ------------------------------------------------------------------ */
/* Tokens (unguessable,16 random bytes → 24-char url-safe strings)     */
/* ------------------------------------------------------------------ */

export function makeToken() {
  return randomBytes(16).toString('base64url')
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

const PAGE_COLUMNS = `id, title, occasion, recipient, letter, animation, color_theme, music,
  auto_publish, view_token, contribute_token, views, created_at, updated_at`

/** Strip DB row shape → API shape (snake_case → camelCase). */
export function serializePage(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    occasion: row.occasion,
    recipient: row.recipient,
    letter: row.letter,
    animation: row.animation,
    colorTheme: row.color_theme,
    music: row.music,
    autoPublish: !!row.auto_publish,
    viewToken: row.view_token,
    contributeToken: row.contribute_token,
    views: row.views,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listPages() {
  return db.prepare(`SELECT ${PAGE_COLUMNS} FROM pages ORDER BY created_at DESC`).all().map(serializePage)
}

export function getPage(id) {
  return serializePage(db.prepare(`SELECT ${PAGE_COLUMNS} FROM pages WHERE id = ?`).get(id))
}

export function getPageByViewToken(token) {
  return serializePage(db.prepare(`SELECT ${PAGE_COLUMNS} FROM pages WHERE view_token = ?`).get(token))
}

export function getPageByContributeToken(token) {
  return serializePage(db.prepare(`SELECT ${PAGE_COLUMNS} FROM pages WHERE contribute_token = ?`).get(token))
}

export function createPage(data) {
  const info = db
    .prepare(
      `INSERT INTO pages (title, occasion, recipient, letter, animation, color_theme, music, auto_publish, view_token, contribute_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.title,
      data.occasion,
      data.recipient ?? '',
      data.letter ?? '',
      data.animation,
      data.colorTheme,
      data.music ?? null,
      data.autoPublish ? 1 : 0,
      makeToken(),
      makeToken(),
    )
  return getPage(Number(info.lastInsertRowid))
}

export function updatePage(id, data) {
  db.prepare(
    `UPDATE pages SET title = ?, occasion = ?, recipient = ?, letter = ?, animation = ?,
       color_theme = ?, music = ?, auto_publish = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    data.title,
    data.occasion,
    data.recipient ?? '',
    data.letter ?? '',
    data.animation,
    data.colorTheme,
    data.music ?? null,
    data.autoPublish ? 1 : 0,
    id,
  )
  return getPage(id)
}

export function deletePage(id) {
  db.prepare('DELETE FROM pages WHERE id = ?').run(id)
}

export function incrementViews(id) {
  db.prepare('UPDATE pages SET views = views + 1 WHERE id = ?').run(id)
}

/** Issue fresh (still unguessable) share tokens for a page. */
export function rotateTokens(id) {
  db.prepare('UPDATE pages SET view_token = ?, contribute_token = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
    makeToken(),
    makeToken(),
    id,
  )
  return getPage(id)
}

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

export function listPhotos(pageId) {
  return db.prepare('SELECT id, page_id, filename, position FROM photos WHERE page_id = ? ORDER BY position').all(pageId)
}

export function addPhoto(pageId, filename) {
  const row = db.prepare('SELECT COALESCE(MAX(position), -1) AS maxPos FROM photos WHERE page_id = ?').get(pageId)
  const info = db
    .prepare('INSERT INTO photos (page_id, filename, position) VALUES (?, ?, ?)')
    .run(pageId, filename, row.maxPos + 1)
  return db.prepare('SELECT id, page_id, filename, position FROM photos WHERE id = ?').get(Number(info.lastInsertRowid))
}

export function getPhoto(id) {
  return db.prepare('SELECT id, page_id, filename, position FROM photos WHERE id = ?').get(id)
}

export function deletePhoto(id) {
  db.prepare('DELETE FROM photos WHERE id = ?').run(id)
}

export function reorderPhotos(pageId, orderedIds) {
  const stmt = db.prepare('UPDATE photos SET position = ? WHERE id = ? AND page_id = ?')
  orderedIds.forEach((photoId, index) => stmt.run(index, photoId, pageId))
}

/* ------------------------------------------------------------------ */
/* Wishes                                                              */
/* ------------------------------------------------------------------ */

const WISH_COLUMNS = 'id, page_id, name, message, photo, status, created_at'

function serializeWish(row) {
  if (!row) return null
  return {
    id: row.id,
    pageId: row.page_id,
    name: row.name,
    message: row.message,
    photo: row.photo,
    status: row.status,
    createdAt: row.created_at,
  }
}

/** Approved wishes, newest first — used by the public view page. */
export function listApprovedWishes(pageId) {
  return db
    .prepare(`SELECT ${WISH_COLUMNS} FROM wishes WHERE page_id = ? AND status = 'approved' ORDER BY id DESC`)
    .all(pageId)
    .map(serializeWish)
}

/** All wishes for a page — admin only. */
export function listAllWishes(pageId, status) {
  if (status) {
    return db
      .prepare(`SELECT ${WISH_COLUMNS} FROM wishes WHERE page_id = ? AND status = ? ORDER BY id DESC`)
      .all(pageId, status)
      .map(serializeWish)
  }
  return db.prepare(`SELECT ${WISH_COLUMNS} FROM wishes WHERE page_id = ? ORDER BY id DESC`).all(pageId).map(serializeWish)
}

export function createWish(pageId, { name, message, photo, autoPublish }) {
  const info = db
    .prepare('INSERT INTO wishes (page_id, name, message, photo, status) VALUES (?, ?, ?, ?, ?)')
    .run(pageId, name, message, photo ?? null, autoPublish ? 'approved' : 'pending')
  return serializeWish(db.prepare(`SELECT ${WISH_COLUMNS} FROM wishes WHERE id = ?`).get(Number(info.lastInsertRowid)))
}

export function setWishStatus(id, status) {
  db.prepare('UPDATE wishes SET status = ? WHERE id = ?').run(status, id)
}

export function getWish(id) {
  return serializeWish(db.prepare(`SELECT ${WISH_COLUMNS} FROM wishes WHERE id = ?`).get(id))
}

export function deleteWish(id) {
  db.prepare('DELETE FROM wishes WHERE id = ?').run(id)
}

export function countWishes(pageId) {
  const row = db.prepare("SELECT COUNT(*) AS n FROM wishes WHERE page_id = ? AND status = 'approved'").get(pageId)
  return row.n
}
