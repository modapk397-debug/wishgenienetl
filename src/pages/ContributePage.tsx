import { motion } from 'framer-motion'
import { CheckCircle2, ImagePlus, LoaderCircle, Send, Sparkles } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AnimationLayer from '../components/AnimationLayer'
import { publicApi } from '../lib/api'
import type { AnimationTheme, ColorTheme, Occasion } from '../lib/api'
import { COLOR_THEMES, occasionEmoji, occasionLabel } from '../lib/themes'

interface ContributeInfo {
  title: string
  occasion: Occasion
  recipient: string
  animation: AnimationTheme
  colorTheme: ColorTheme
  autoPublish: boolean
  wishCount: number
}

/** CONTRIBUTE public page: name + message + optional image upload. */
export default function ContributePage() {
  const { token = '' } = useParams()
  const [page, setPage] = useState<ContributeInfo | null>(null)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const data = await publicApi.getContributeInfo(token)
        if (alive) setPage(data.page as ContributeInfo)
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'This contribution link is invalid.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => {
    if (!photo) {
      setPreview('')
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !message.trim()) {
      setError('Please enter your name and a message.')
      return
    }
    if (photo && photo.size > 5 * 1024 * 1024) {
      setError('Photo must be 5MB or smaller.')
      return
    }
    setSubmitting(true)
    setError('')
    setDone('')
    try {
      const form = new FormData()
      form.append('name', name)
      form.append('message', message)
      if (photo) form.append('photo', photo)
      const res = await publicApi.submitWish(token, form)
      setDone(res.message)
      setName('')
      setMessage('')
      setPhoto(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your wish.')
    } finally {
      setSubmitting(false)
    }
  }

  const theme = useMemo(() => COLOR_THEMES[page?.colorTheme || 'rose'], [page?.colorTheme])

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <LoaderCircle className="animate-spin text-pink-300" />
      </main>
    )
  }

  if (error && !page) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/10 p-7 text-center backdrop-blur">
          <h1 className="font-display text-3xl font-black">Contribution link not found</h1>
          <p className="mt-2 text-white/65">{error}</p>
          <Link to="/" className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 font-bold text-slate-950">Go home</Link>
        </div>
      </main>
    )
  }

  if (!page) return null

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: theme.bg, color: theme.ink }}>
      <AnimationLayer theme={page.animation} />
      <div className="relative z-10 mx-auto grid min-h-screen max-w-5xl items-center gap-8 px-4 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="text-center lg:text-left">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/50 px-3 py-2 text-sm font-bold shadow-sm backdrop-blur-sm">
            <span>🧞</span> Wish Genie
          </Link>
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white/55 px-4 py-2 text-sm font-bold shadow-sm backdrop-blur-sm lg:mx-0">
            <Sparkles size={15} /> {occasionEmoji(page.occasion)} {occasionLabel(page.occasion)}
          </div>
          <h1 className="font-display text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl">Add your wish</h1>
          <p className="mt-5 text-lg leading-8 opacity-75">
            {page.recipient ? `Leave a sweet message for ${page.recipient}.` : 'Leave a sweet message for this special greeting page.'} Your wish {page.autoPublish ? 'will appear right away.' : 'will appear after approval.'}
          </p>
          <div className="mt-6 rounded-3xl bg-white/55 p-5 text-left shadow-sm backdrop-blur-sm">
            <p className="text-sm font-bold uppercase tracking-wide opacity-60">Greeting page</p>
            <h2 className="mt-1 font-display text-3xl font-black">{page.title}</h2>
            <p className="mt-2 text-sm opacity-65">{page.wishCount} approved wishes so far</p>
          </div>
        </motion.section>

        <motion.form initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} onSubmit={submit} className="rounded-[2rem] bg-white/80 p-5 shadow-2xl shadow-black/10 backdrop-blur sm:p-7">
          <h2 className="font-display text-3xl font-black text-gray-900">Your message</h2>
          <p className="mt-1 text-sm text-gray-500">Only your wish can be submitted here. You cannot edit the original page.</p>

          {error && <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {done && <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 size={17} /> {done}</div>}

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-bold text-gray-700">Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Your name" maxLength={60} />
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-bold text-gray-700">Short wish/message</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input min-h-[150px] resize-y" placeholder="Write something kind, funny, heartfelt…" maxLength={500} />
            <span className="mt-1 block text-right text-xs text-gray-400">{message.length}/500</span>
          </label>

          <label className="mt-4 flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-gray-600 transition hover:border-pink-300 hover:bg-pink-50">
            {preview ? <img src={preview} alt="Preview" className="h-16 w-16 rounded-2xl object-cover" /> : <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white"><ImagePlus size={24} /></span>}
            <span>
              <span className="block font-bold">Optional photo</span>
              <span className="block text-xs text-gray-400">JPEG, PNG, WebP or GIF under 5MB</span>
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </label>

          <button disabled={submitting} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60" style={{ background: theme.accent }}>
            {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
            Send wish
          </button>
        </motion.form>
      </div>
    </main>
  )
}
