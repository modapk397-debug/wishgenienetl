import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * Opening intro: a small "genie lamp" reveal that plays once before the
 * main content fades in. Pass `done` from the parent after data loads.
 */
export default function IntroScreen({ title }: { title?: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2100)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#12101c]"
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className="text-6xl sm:text-7xl"
          >
            🧞
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-4 font-display text-2xl tracking-wide text-amber-200"
          >
            Wish Genie
          </motion.p>
          {title && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 0.7 }} className="mt-1 text-sm text-white/60">
              {title}
            </motion.p>
          )}
          <motion.div
            className="mt-6 h-0.5 w-40 origin-left rounded-full bg-amber-300/70"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 1.4, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
