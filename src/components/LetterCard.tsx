import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * Renders the admin-authored letter HTML.
 * `typewriter` streams the text in gradually; formatting tags are applied
 * after the reveal completes so the animation stays smooth on mobile.
 */
export default function LetterCard({ html, accent, typewriter = true }: { html: string; accent: string; typewriter?: boolean }) {
  const [revealed, setRevealed] = useState(!typewriter)

  // Plain text length drives how long the reveal takes (clamped 2–8s).
  const plain = html.replace(/<[^>]+>/g, ' ')
  const duration = Math.min(8, Math.max(2, plain.length / 90))

  useEffect(() => {
    if (!typewriter) return
    const t = setTimeout(() => setRevealed(true), duration * 1000)
    return () => clearTimeout(t)
  }, [typewriter, duration])

  if (!html.trim()) return null

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7 }}
      className="relative rounded-3xl bg-white/75 p-6 shadow-xl shadow-black/5 backdrop-blur-sm sm:p-9"
    >
      {/* wax-seal style corner accent */}
      <span className="absolute -top-4 right-6 rotate-6 rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-white shadow" style={{ background: accent }}>
        WITH LOVE
      </span>

      <h3 className="font-display text-xl italic opacity-80" style={{ color: accent }}>
        A letter for you…
      </h3>

      <div className="mt-3 leading-relaxed text-gray-800">
        {revealed ? (
          <div className="letter-body" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <TypeReveal html={html} seconds={duration} />
        )}
      </div>
    </motion.article>
  )
}

/** Streams plain text into the card, then swaps to full formatted HTML. */
function TypeReveal({ html, seconds }: { html: string; seconds: number }) {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

  const [count, setCount] = useState(0)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const totalMs = seconds * 1000
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / totalMs)
      setCount(Math.floor(progress * text.length))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, seconds])

  return (
    <p className="min-h-[6rem] whitespace-pre-wrap">
      {text.slice(0, count)}
      <span className="inline-block w-[2px] animate-pulse align-middle" style={{ height: '1.1em', background: 'currentColor' }} />
    </p>
  )
}
