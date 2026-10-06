import { motion } from 'framer-motion'
import { Download, Heart, LoaderCircle, Moon, Music, Music2, Share2, Sun } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AnimationLayer from '../components/AnimationLayer'
import IntroScreen from '../components/IntroScreen'
import LetterCard from '../components/LetterCard'
import Slideshow from '../components/Slideshow'
import { publicApi, PublicPage, Photo, Wish, photoUrl } from '../lib/api'
import { COLOR_THEMES, occasionEmoji, occasionLabel } from '../lib/themes'

/** VIEW-ONLY public page: animated presentation + gallery + letter + wishes. */
export default function GreetingView() {
  const { token = '' } = useParams()
  const [page, setPage] = useState<PublicPage | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [wishes, setWishes] = useState<Wish[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dark, setDark] = useState(false)
  const [musicOn, setMusicOn] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await publicApi.getViewPage(token)
        if (!alive) return
        setPage(data.page)
        setPhotos(data.photos)
        setWishes(data.wishes)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'This greeting link is invalid.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [token])

  const theme = useMemo(() => COLOR_THEMES[page?.colorTheme || 'rose'], [page?.colorTheme])

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <LoaderCircle className="animate-spin text-pink-300" />
      </main>
    )
  }

  if (error || !page) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/10 p-7 text-center backdrop-blur">
          <h1 className="font-display text-3xl font-black">Wish not found</h1>
          <p className="mt-2 text-white/65">{error}</p>
          <Link to="/" className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 font-bold text-slate-950">Go home</Link>
        </div>
      </main>
    )
  }

  const bg = dark ? 'linear-gradient(160deg,#020617 0%,#111827 55%,#312e81 100%)' : theme.bg
  const ink = dark ? '#f8fafc' : theme.ink
  const accent = dark ? '#f9a8d4' : theme.accent

  return (
    <main className="relative min-h-screen overflow-hidden transition-colors" style={{ background: bg, color: ink }}>
      <IntroScreen title={page.title} />
      <AnimationLayer theme={page.animation} />

      {page.music && musicOn && <audio src={page.music} autoPlay loop />}

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-10 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 rounded-full bg-white/45 px-3 py-2 text-sm font-bold shadow-sm backdrop-blur-sm">
            <span>🧞</span> Wish Genie
          </Link>
          <div className="flex items-center gap-2">
            {page.music && (
              <button onClick={() => setMusicOn((v) => !v)} className="rounded-full bg-white/45 p-2 shadow-sm backdrop-blur-sm" title="Toggle music">
                {musicOn ? <Music2 size={18} /> : <Music size={18} />}
              </button>
            )}
            <button onClick={() => setDark((v) => !v)} className="rounded-full bg-white/45 p-2 shadow-sm backdrop-blur-sm" title="Toggle dark/light">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => navigator.share?.({ title: page.title, url: location.href }).catch(() => navigator.clipboard.writeText(location.href)) || navigator.clipboard.writeText(location.href)}
              className="rounded-full bg-white/45 p-2 shadow-sm backdrop-blur-sm"
              title="Share"
            >
              <Share2 size={18} />
            </button>
          </div>
        </header>

        <section className="text-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}>
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white/45 px-4 py-2 text-sm font-bold shadow-sm backdrop-blur-sm">
              <span>{occasionEmoji(page.occasion)}</span> {occasionLabel(page.occasion)} wish
            </div>
            <h1 className="mx-auto max-w-4xl font-display text-5xl font-black leading-[0.98] tracking-tight sm:text-7xl">{page.title}</h1>
            {page.recipient && <p className="mt-4 text-lg opacity-75">Made especially for {page.recipient}</p>}
          </motion.div>
        </section>

        <motion.section initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7, duration: 0.8 }} className="mt-12">
          <Slideshow photos={photos} accent={accent} />
        </motion.section>

        <section className="mt-10">
          <LetterCard html={page.letter} accent={accent} />
        </section>

        <section className="mt-10 rounded-[2rem] bg-white/65 p-5 shadow-xl shadow-black/5 backdrop-blur-sm sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-3xl font-black" style={{ color: dark ? '#111827' : ink }}>Wishes from everyone</h2>
              <p className="mt-1 text-sm text-gray-600">Newest messages appear first.</p>
            </div>
            <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: accent }}>
              {wishes.length} wishes
            </span>
          </div>

          <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {wishes.length === 0 ? (
              <div className="rounded-3xl bg-white/70 p-6 text-center text-gray-500">No wishes yet — they will appear here after friends and family contribute.</div>
            ) : (
              wishes.map((wish) => <WishCard key={wish.id} wish={wish} accent={accent} />)
            )}
          </div>
        </section>

        <section className="mt-10 flex flex-col items-center gap-3 pb-8 text-center">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-white/65 px-5 py-3 text-sm font-bold shadow-sm backdrop-blur-sm">
            <Download size={17} /> Save / print this letter
          </button>
          <p className="text-xs opacity-60">Made with Wish Genie</p>
        </section>
      </div>
    </main>
  )
}

function WishCard({ wish, accent }: { wish: Wish; accent: string }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-3xl bg-white p-4 text-gray-800 shadow-sm"
    >
      <div className="flex gap-3">
        {wish.photo ? (
          <img src={photoUrl(wish.photo)} alt="" className="h-16 w-16 flex-none rounded-2xl object-cover" />
        ) : (
          <div className="grid h-16 w-16 flex-none place-items-center rounded-2xl" style={{ background: `${accent}18`, color: accent }}>
            <Heart fill="currentColor" size={22} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">{wish.name}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">{wish.message}</p>
        </div>
      </div>
    </motion.article>
  )
}
