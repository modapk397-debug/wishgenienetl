import { useEffect, useRef } from 'react'
import type { AnimationTheme } from '../lib/api'

/**
 * Full-screen canvas animation layer.
 * One requestAnimationFrame loop drives whichever theme is selected —
 * cheap enough for mobile, and pauses automatically when the tab is hidden.
 */

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vr: number
  color: string
  life: number
  maxLife: number
  text?: string
}

const CONFETTI_COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#eab308', '#ec4899']
const HEART_COLORS = ['#fb7185', '#f43f5e', '#e11d48', '#fda4af', '#fecdd3']
const BALLOON_COLORS = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#06b6d4']
const SPARK_COLORS = ['#fde68a', '#fef3c7', '#fbbf24', '#fff7ed', '#fdba74']

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export default function AnimationLayer({ theme, className = '' }: { theme: AnimationTheme; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true
    const particles: Particle[] = []
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => window.innerWidth
    const H = () => window.innerHeight

    /* ---------------- spawners per theme ---------------- */

    function spawnConfetti(): Particle {
      return {
        x: rand(0, W()),
        y: rand(-40, -10),
        vx: rand(-0.7, 0.7),
        vy: rand(1.4, 3.2),
        size: rand(5, 10),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.08, 0.08),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        life: 0,
        maxLife: Infinity,
      }
    }

    function spawnHeart(): Particle {
      return {
        x: rand(0, W()),
        y: H() + rand(10, 60),
        vx: rand(-0.4, 0.4),
        vy: rand(-1.6, -0.7),
        size: rand(12, 26),
        rot: rand(-0.3, 0.3),
        vr: rand(-0.01, 0.01),
        color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
        life: 0,
        maxLife: Infinity,
      }
    }

    function spawnBalloon(): Particle {
      return {
        x: rand(10, W() - 10),
        y: H() + rand(20, 120),
        vx: rand(-0.3, 0.3),
        vy: rand(-1.9, -1),
        size: rand(16, 30),
        rot: rand(-0.1, 0.1),
        vr: rand(-0.005, 0.005),
        color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
        life: 0,
        maxLife: Infinity,
      }
    }

    function spawnFirework(): Particle {
      // Bursts are seeded as a cluster of sparks from one origin.
      const cx = rand(W() * 0.15, W() * 0.85)
      const cy = rand(H() * 0.1, H() * 0.5)
      const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)]
      const angle = rand(0, Math.PI * 2)
      const speed = rand(0.6, 2.6)
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(1.5, 3),
        rot: 0,
        vr: 0,
        color,
        life: 0,
        maxLife: rand(50, 90),
      }
    }

    function spawnParticle(): Particle {
      return {
        x: rand(0, W()),
        y: rand(0, H()),
        vx: rand(-0.25, 0.25),
        vy: rand(-0.25, 0.25),
        size: rand(1.5, 4),
        rot: 0,
        vr: 0,
        color: 'rgba(255,255,255,0.55)',
        life: 0,
        maxLife: rand(200, 500),
      }
    }

    /* ---------------- drawing helpers ---------------- */

    const drawHeart = (p: Particle) => {
      const s = p.size
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      ctx.moveTo(0, s * 0.35)
      ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.5, -s, 0, -s * 0.35)
      ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.4, 0, s * 0.35)
      ctx.fill()
      ctx.restore()
    }

    const drawBalloon = (p: Particle) => {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = 0.85
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size * 0.75, p.size, 0, 0, Math.PI * 2)
      ctx.fill()
      // knot + string
      ctx.beginPath()
      ctx.moveTo(-3, p.size)
      ctx.lineTo(3, p.size)
      ctx.lineTo(0, p.size + 5)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, p.size + 5)
      ctx.quadraticCurveTo(4, p.size + 16, 0, p.size + 26)
      ctx.stroke()
      // shine
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.beginPath()
      ctx.ellipse(-p.size * 0.28, -p.size * 0.35, p.size * 0.16, p.size * 0.28, -0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    /* ---------------- main loop ---------------- */

    let last = performance.now()
    let acc = 0

    function frame(now: number) {
      if (!running) return
      const dt = Math.min(now - last, 64)
      last = now
      acc += dt
      ctx!.clearRect(0, 0, W(), H())

      // spawn budget: roughly N particles per second
      const targetRate: Record<AnimationTheme, number> = { confetti: 14, hearts: 4, balloons: 2.5, fireworks: 26, particles: 0 }
      const rate = targetRate[theme]
      if (rate > 0) {
        const want = Math.floor((acc / 1000) * rate)
        if (want > 0) {
          acc = 0
          for (let i = 0; i < want; i++) {
            if (particles.length < 400) {
              particles.push(theme === 'confetti' ? spawnConfetti() : theme === 'hearts' ? spawnHeart() : theme === 'fireworks' ? spawnFirework() : spawnBalloon())
            }
          }
        }
      } else if (particles.length === 0) {
        // static ambient field for 'particles'
        for (let i = 0; i < 70; i++) particles.push(spawnParticle())
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life += dt / 16.7
        p.x += p.vx * (dt / 16.7)
        p.y += p.vy * (dt / 16.7)
        p.rot += p.vr * (dt / 16.7)

        if (theme === 'confetti') {
          p.x += Math.sin((p.life + p.size) / 12) * 0.6
          if (p.y > H() + 20) particles.splice(i, 1)
          else {
            ctx!.save()
            ctx!.translate(p.x, p.y)
            ctx!.rotate(p.rot)
            ctx!.globalAlpha = 0.9
            ctx!.fillStyle = p.color
            ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
            ctx!.restore()
          }
        } else if (theme === 'hearts') {
          p.x += Math.sin(p.life / 20) * 0.5
          if (p.y < -50) particles.splice(i, 1)
          else drawHeart(p)
        } else if (theme === 'balloons') {
          p.x += Math.sin(p.life / 25) * 0.4
          if (p.y < -80) particles.splice(i, 1)
          else drawBalloon(p)
        } else if (theme === 'fireworks') {
          p.vy += 0.02 * (dt / 16.7)
          p.vx *= 0.985
          p.vy *= 0.985
          if (p.life > p.maxLife) particles.splice(i, 1)
          else {
            ctx!.globalAlpha = Math.max(0, 1 - p.life / p.maxLife)
            ctx!.fillStyle = p.color
            ctx!.beginPath()
            ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx!.fill()
            ctx!.globalAlpha = 1
          }
        } else {
          // gentle particles: drift + wrap around the viewport
          if (p.x < -10) p.x = W() + 10
          if (p.x > W() + 10) p.x = -10
          if (p.y < -10) p.y = H() + 10
          if (p.y > H() + 10) p.y = -10
          p.life += 0.01
          ctx!.globalAlpha = 0.35 + Math.sin(p.life / 30) * 0.25
          ctx!.fillStyle = p.color
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx!.fill()
          ctx!.globalAlpha = 1
        }
      }

      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(frame)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [theme])

  return <canvas ref={canvasRef} aria-hidden className={`pointer-events-none fixed inset-0 z-0 ${className}`} />
}
