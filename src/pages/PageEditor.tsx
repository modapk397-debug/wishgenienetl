import { ArrowLeft, Check, Copy, ExternalLink, LoaderCircle, Music, Save, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PhotoManager from '../components/PhotoManager'
import RichTextEditor from '../components/RichTextEditor'
import { admin, auth, getAdminToken, Page, Photo, setAdminToken, Wish, WishStatus, photoUrl } from '../lib/api'
import { ANIMATIONS, COLOR_THEMES, OCCASIONS } from '../lib/themes'

const blank: Partial<Page> = {
  title: '',
  occasion: 'birthday',
  recipient: '',
  letter: '',
  animation: 'confetti',
  colorTheme: 'rose',
  music: '',
  autoPublish: true,
}

/** Create/edit form + photo manager + wish moderation. */
export default function PageEditor() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [page, setPage] = useState<Partial<Page>>(blank)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [wishes, setWishes] = useState<Wish[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    async function gate() {
      try {
        if (!getAdminToken()) throw new Error('not authed')
        const { admin: ok } = await auth.me()
        if (!ok) throw new Error('not authed')
        setChecking(false)
      } catch {
        setAdminToken(null)
        navigate('/admin')
      }
    }
    void gate()
  }, [navigate])

  useEffect(() => {
    if (checking || isNew) return
    void load()
  }, [checking, id, isNew])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await admin.getPage(Number(id))
      setPage(data.page)
      setPhotos(data.photos)
      setWishes(data.wishes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load page.')
    } finally {
      setLoading(false)
    }
  }

  async function save(e?: FormEvent) {
    e?.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        title: page.title,
        occasion: page.occasion,
        recipient: page.recipient,
        letter: page.letter,
        animation: page.animation,
        colorTheme: page.colorTheme,
        music: page.music,
        autoPublish: page.autoPublish,
      }
      if (isNew) {
        const { page: created } = await admin.createPage(payload)
        setNotice('Greeting page created. Add photos and share the links!')
        navigate(`/admin/edit/${created.id}`)
      } else {
        const { page: updated } = await admin.updatePage(Number(id), payload)
        setPage(updated)
        setNotice('Saved changes.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save page.')
    } finally {
      setSaving(false)
    }
  }

  async function moderate(wish: Wish, status: WishStatus) {
    try {
      const { wish: updated } = await admin.setWishStatus(wish.id, status)
      setWishes((items) => items.map((item) => (item.id === wish.id ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update wish.')
    }
  }

  async function removeWish(wish: Wish) {
    if (!confirm('Delete this wish?')) return
    try {
      await admin.deleteWish(wish.id)
      setWishes((items) => items.filter((item) => item.id !== wish.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete wish.')
    }
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    setTimeout(() => setCopied(''), 1400)
  }

  const theme = COLOR_THEMES[(page.colorTheme || 'rose') as keyof typeof COLOR_THEMES]
  const viewLink = page.viewToken ? `${location.origin}/g/${page.viewToken}` : ''
  const contributeLink = page.contributeToken ? `${location.origin}/c/${page.contributeToken}` : ''
  const pending = useMemo(() => wishes.filter((wish) => wish.status === 'pending').length, [wishes])

  if (checking || loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-50">
        <LoaderCircle className="animate-spin text-pink-500" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/admin" className="inline-flex items-center gap-2 font-bold text-gray-600 hover:text-gray-950">
            <ArrowLeft size={18} /> Dashboard
          </Link>
          <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
            Save page
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px]">
        <form onSubmit={save} className="space-y-6">
          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-pink-600">{isNew ? 'Create' : 'Edit'} greeting</p>
            <h1 className="mt-1 font-display text-4xl font-black">{isNew ? 'New magic page' : page.title}</h1>

            {(error || notice) && (
              <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Page title">
                <input value={page.title || ''} onChange={(e) => setPage({ ...page, title: e.target.value })} className="input" placeholder="Happy Birthday, Aanya!" required />
              </Field>
              <Field label="Recipient">
                <input value={page.recipient || ''} onChange={(e) => setPage({ ...page, recipient: e.target.value })} className="input" placeholder="Aanya" />
              </Field>
              <Field label="Occasion">
                <select value={page.occasion} onChange={(e) => setPage({ ...page, occasion: e.target.value as Page['occasion'] })} className="input">
                  {OCCASIONS.map((item) => <option key={item.value} value={item.value}>{item.emoji} {item.label}</option>)}
                </select>
              </Field>
              <Field label="Color theme">
                <select value={page.colorTheme} onChange={(e) => setPage({ ...page, colorTheme: e.target.value as Page['colorTheme'] })} className="input">
                  {Object.entries(COLOR_THEMES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                </select>
              </Field>
              <Field label="Animation theme">
                <select value={page.animation} onChange={(e) => setPage({ ...page, animation: e.target.value as Page['animation'] })} className="input">
                  {ANIMATIONS.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.hint}</option>)}
                </select>
              </Field>
              <Field label="Background music URL (optional)">
                <div className="relative">
                  <Music className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input value={page.music || ''} onChange={(e) => setPage({ ...page, music: e.target.value })} className="input pl-9" placeholder="/uploads/song.mp3 or https://..." />
                </div>
              </Field>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-gray-50 p-4">
              <input type="checkbox" checked={!!page.autoPublish} onChange={(e) => setPage({ ...page, autoPublish: e.target.checked })} className="mt-1 h-4 w-4 accent-pink-600" />
              <span>
                <span className="block font-bold">Auto-publish contributed wishes</span>
                <span className="text-sm text-gray-500">Turn off to make new wishes pending until you approve them.</span>
              </span>
            </label>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-2xl font-black">Personal letter</h2>
            <p className="mt-1 text-sm text-gray-500">Use bold, italic, lists and emojis. This becomes the main letter on the public page.</p>
            <div className="mt-4">
              <RichTextEditor value={page.letter || ''} onChange={(letter) => setPage({ ...page, letter })} />
            </div>
          </section>

          {!isNew && page.id && (
            <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-display text-2xl font-black">Photos</h2>
              <p className="mt-1 text-sm text-gray-500">Upload multiple photos, preview them, and drag thumbnails to reorder the slideshow.</p>
              <div className="mt-4">
                <PhotoManager pageId={page.id} photos={photos} onChange={setPhotos} />
              </div>
            </section>
          )}
        </form>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="h-28" style={{ background: theme.bg }} />
            <div className="p-5">
              <h2 className="font-display text-2xl font-black">Preview</h2>
              <p className="mt-2 text-sm text-gray-500">{page.recipient || 'Recipient'} · {page.occasion} · {page.animation}</p>
              <div className="mt-4 rounded-2xl p-4 text-sm" style={{ background: theme.chip, color: theme.ink }}>
                {page.title || 'Your greeting title'}
              </div>
            </div>
          </section>

          {!isNew && page.viewToken && (
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="font-display text-2xl font-black">Share links</h2>
              <LinkBox label="View-only" value={viewLink} copied={copied === 'view'} onCopy={() => void copy('view', viewLink)} />
              <LinkBox label="Contribute" value={contributeLink} copied={copied === 'contribute'} onCopy={() => void copy('contribute', contributeLink)} />
              <div className="mt-3 flex gap-2">
                <Link to={`/g/${page.viewToken}`} target="_blank" className="flex-1 rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-bold text-white">View page</Link>
                <Link to={`/c/${page.contributeToken}`} target="_blank" className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-center text-xs font-bold">Contribute form</Link>
              </div>
            </section>
          )}

          {!isNew && (
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-black">Wishes</h2>
                {pending > 0 && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{pending} pending</span>}
              </div>
              <div className="mt-4 space-y-3">
                {wishes.length === 0 ? (
                  <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">No contributed wishes yet.</p>
                ) : (
                  wishes.map((wish) => <WishRow key={wish.id} wish={wish} onModerate={moderate} onDelete={removeWish} />)
                )}
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-gray-700">{label}</span>
      {children}
    </label>
  )
}

function LinkBox({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="mt-3 rounded-2xl border border-gray-200 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</span>
        <button onClick={onCopy} className="inline-flex items-center gap-1 text-xs font-bold text-pink-600">
          <Copy size={13} /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <a href={value} target="_blank" className="flex items-center gap-1 truncate text-sm font-semibold text-gray-700 hover:text-pink-600" rel="noreferrer">
        {value} <ExternalLink size={13} />
      </a>
    </div>
  )
}

function WishRow({ wish, onModerate, onDelete }: { wish: Wish; onModerate: (wish: Wish, status: WishStatus) => void; onDelete: (wish: Wish) => void }) {
  return (
    <article className="rounded-2xl border border-gray-100 p-3">
      <div className="flex items-start gap-3">
        {wish.photo && <img src={photoUrl(wish.photo)} alt="" className="h-14 w-14 rounded-xl object-cover" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-bold">{wish.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${wish.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : wish.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
              {wish.status}
            </span>
          </div>
          <p className="mt-1 text-sm leading-5 text-gray-600">{wish.message}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {wish.status !== 'approved' && <button onClick={() => onModerate(wish, 'approved')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white"><Check size={13} /> Approve</button>}
        {wish.status !== 'rejected' && <button onClick={() => onModerate(wish, 'rejected')} className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-700">Reject</button>}
        <button onClick={() => onDelete(wish)} className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
      </div>
    </article>
  )
}
