import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { Photo } from '../lib/api'
import { photoUrl } from '../lib/api'

/**
 * Auto-advancing photo slideshow with swipe-free arrow/dot controls.
 * Falls back to a static grid prompt when the page has no photos.
 */
export default function Slideshow({ photos, accent }: { photos: Photo[]; accent: string }) {
  const [index, setIndex] = useState(0)
  const count = photos.length

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count])
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count])

  useEffect(() => {
    if (count < 2) return
    const id = setInterval(next, 4500)
    return () => clearInterval(id)
  }, [count, next])

  useEffect(() => {
    if (index >= count) setIndex(0)
  }, [count, index])

  if (!count) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl border-2 border-dashed border-black/10 bg-white/40 text-sm opacity-70">
        No photos yet
      </div>
    )
  }

  const current = photos[index]

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-lg shadow-black/10">
      <div className="aspect-[4/3] w-full sm:aspect-[16/10]">
        <AnimatePresence mode="wait">
          <motion.img
            key={current.id}
            src={photoUrl(current.filename)}
            alt=""
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="h-full w-full object-cover"
          />
        </AnimatePresence>
      </div>

      {count > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white backdrop-blur transition hover:bg-black/55"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white backdrop-blur transition hover:bg-black/55"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => setIndex(i)}
                className="h-2 rounded-full transition-all"
                style={{
                  width: i === index ? 20 : 8,
                  background: i === index ? accent : 'rgba(255,255,255,0.65)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
