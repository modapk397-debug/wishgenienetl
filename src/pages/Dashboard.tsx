import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, Copy, Eye, Gift, LoaderCircle, LogOut, MessageSquare, Plus, RefreshCcw, Trash2, Wand2 } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { admin, auth, getAdminToken, Page, setAdminToken } from '../lib/api'
import { COLOR_THEMES, occasionEmoji, occasionLabel } from '../lib/themes'

/** Admin dashboard: auth gate + list/create/edit/delete/share links/stats. */
export default function Dashboard() {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    async function check() {
      try {
        if (getAdminToken()) {
          const { admin: ok } = await auth.me()
          if (alive) setAuthed(ok)
        }
      } catch {
        setAdminToken(null)
      } finally {
        if (alive) setChecking(false)
      }
    }
    void check()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    void load()
  }, [authed])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await admin.listPages()
      setPages(data.pages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load pages.')
    } finally {
      setLoading(false)
    }
  }

  async function login(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { token } = await auth.login(passcode)
      setAdminToken(token)
      setAuthed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    setAdminToken(null)
    setAuthed(false)
    setPages([])
  }

  async function removePage(page: Page) {
    if (!confirm(`Delete "${page.title}" and all photos/wishes?`)) return
    try {
      await admin.deletePage(page.id)
      setPages((items) => items.filter((item) => item.id !== page.id))
      setNotice('Greeting page deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete page.')
    }
  }

  async function rotate(page: Page) {
    if (!confirm('Regenerate both share links? Existing links will stop working.')) return
    try {
      const { page: updated } = await admin.rotateTokens(page.id)
      setPages((items) => items.map((item) => (item.id === page.id ? { ...item, ...updated } : item)))
      setNotice('Share links regenerated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not regenerate links.')
    }
  }

  const totals = useMemo(
    () => ({
      pages: pages.length,
      views: pages.reduce((sum, page) => sum + page.views, 0),
      wishes: pages.reduce((sum, page) => sum + (page.wishCount || 0), 0),
    }),
    [pages],
  )

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <LoaderCircle className="animate-spin" />
      </main>
    )
  }

  if (!authed) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <form onSubmit={login} className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/10 p-7 shadow-2xl backdrop-blur">
          <Link to="/" className="mb-8 flex items-center gap-2 font-display text-2xl font-bold">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-2xl">🧞</span>
            Wish Genie
          </Link>
          <h1 className="font-display text-3xl font-black">Admin login</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">Enter your secret passcode to manage greeting pages, photos and submitted wishes.</p>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Admin passcode"
            className="mt-6 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 outline-none ring-pink-300 transition placeholder:text-white/35 focus:ring-2"
            autoFocus
          />
          {error && <p className="mt-3 text-sm text-rose-200">{error}</p>}
          <button disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold text-slate-950 transition hover:-translate-y-0.5 disabled:opacity-60">
            {loading ? <LoaderCircle className="animate-spin" size={18} /> : <Wand2 size={18} />}
            Unlock dashboard
          </button>
          <p className="mt-4 rounded-2xl bg-black/20 p-3 text-xs leading-5 text-white/55">Dev default passcode: <b>wishgenie-admin</b>. Set ADMIN_PASSCODE in production.</p>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-black">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-2xl">🧞</span>
            Wish Genie
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-100" title="Refresh">
              <RefreshCcw size={18} />
            </button>
            <button onClick={logout} className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-100" title="Logout">
              <LogOut size={18} />
            </button>
            <button onClick={() => navigate('/admin/new')} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
              <Plus size={17} /> New page
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-pink-600">Admin Dashboard</p>
            <h1 className="mt-1 font-display text-4xl font-black">Your greeting pages</h1>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[430px]">
            <Stat icon={<Gift />} label="Pages" value={totals.pages} />
            <Stat icon={<Eye />} label="Views" value={totals.views} />
            <Stat icon={<MessageSquare />} label="Wishes" value={totals.wishes} />
          </div>
        </div>

        <AnimatePresence>
          {(error || notice) && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mb-5 rounded-2xl px-4 py-3 text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {error || notice}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="grid min-h-[240px] place-items-center rounded-3xl bg-white shadow-sm">
            <LoaderCircle className="animate-spin text-pink-500" />
          </div>
        ) : pages.length === 0 ? (
          <div className="grid min-h-[360px] place-items-center rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-pink-50 text-3xl">🪄</div>
              <h2 className="mt-4 font-display text-3xl font-black">No greetings yet</h2>
              <p className="mx-auto mt-2 max-w-md text-gray-500">Create your first personalized page, upload photos, write a letter, and share the two magic links.</p>
              <Link to="/admin/new" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">
                <Plus size={18} /> Create greeting
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => (
              <PageCard key={page.id} page={page} onDelete={() => void removePage(page)} onRotate={() => void rotate(page)} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">{icon}{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  )
}

function PageCard({ page, onDelete, onRotate }: { page: Page; onDelete: () => void; onRotate: () => void }) {
  const view = `${location.origin}/g/${page.viewToken}`
  const contribute = `${location.origin}/c/${page.contributeToken}`
  const theme = COLOR_THEMES[page.colorTheme]
  const [copied, setCopied] = useState('')

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    setTimeout(() => setCopied(''), 1600)
  }

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="h-24" style={{ background: theme.bg }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: theme.chip, color: theme.ink }}>
              {occasionEmoji(page.occasion)} {occasionLabel(page.occasion)}
            </span>
            <h2 className="mt-3 line-clamp-2 font-display text-2xl font-black">{page.title}</h2>
            <p className="mt-1 text-sm text-gray-500">For {page.recipient || 'someone special'}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-3 py-2 text-center">
            <BarChart3 className="mx-auto text-gray-400" size={17} />
            <div className="text-sm font-black">{page.views}</div>
            <div className="text-[10px] uppercase text-gray-400">views</div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <Link to={`/g/${page.viewToken}`} target="_blank" className="rounded-xl bg-gray-50 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-100">
            Open view-only page
          </Link>
          <Link to={`/c/${page.contributeToken}`} target="_blank" className="rounded-xl bg-gray-50 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-100">
            Open contribute page
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => void copy('view', view)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold hover:bg-gray-50">
            <Copy size={14} /> {copied === 'view' ? 'Copied' : 'View link'}
          </button>
          <button onClick={() => void copy('contribute', contribute)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold hover:bg-gray-50">
            <Copy size={14} /> {copied === 'contribute' ? 'Copied' : 'Contribute link'}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="text-xs text-gray-400">{page.wishCount || 0} approved wishes</div>
          <div className="flex gap-1">
            <button onClick={onRotate} className="rounded-lg p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-600" title="Regenerate links">
              <RefreshCcw size={16} />
            </button>
            <Link to={`/admin/edit/${page.id}`} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
              Edit
            </Link>
            <button onClick={onDelete} className="rounded-lg p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-600" title="Delete">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
