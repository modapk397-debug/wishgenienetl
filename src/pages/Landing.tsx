import { ArrowRight, LockKeyhole, Sparkles, Wand2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(129,140,248,0.35),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-2xl shadow-lg">🧞</span>
            Wish Genie
          </Link>
          <Link to="/admin" className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10">
            Admin
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-pink-100 backdrop-blur">
              <Sparkles size={15} /> Personalized greeting pages with magic links
            </div>
            <h1 className="font-display text-5xl font-black leading-[0.98] tracking-tight sm:text-7xl">
              Build a wish they will never forget.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
              Create beautiful birthday, anniversary and celebration pages with photos, a personal letter, animations, and two secure links: one to view and one to collect wishes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/admin" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-slate-950 shadow-xl transition hover:-translate-y-0.5 hover:shadow-pink-500/20">
                Open Dashboard <ArrowRight size={18} />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-bold text-white transition hover:bg-white/10">
                See Features
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-pink-500/30 to-indigo-500/30 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-rose-100 via-pink-100 to-violet-100 p-5 text-slate-900">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#fb7185,#fef3c7,#c4b5fd)] p-5">
                  <div className="mb-4 flex justify-end gap-1">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <span key={i} className="h-2 w-1.5 rounded-sm bg-white/80" />
                    ))}
                  </div>
                  <h2 className="font-display text-4xl font-black">Happy Birthday, Aanya!</h2>
                  <p className="mt-3 max-w-sm rounded-2xl bg-white/60 p-4 text-sm leading-6 backdrop-blur">
                    Dear you, today is all about the joy you bring into everyone’s life…
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {['View-only link', 'Contribute link', 'Moderation'].map((item) => (
                    <div key={item} className="rounded-2xl bg-white p-3 text-center text-xs font-bold shadow-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-4 pb-10 sm:grid-cols-3">
          {[
            ['Admin protected', 'Secret passcode login keeps all editing tools private.', LockKeyhole],
            ['Magic links', 'Separate unguessable tokens for viewing and contributing.', Wand2],
            ['Animated pages', 'Confetti, hearts, balloons, fireworks, particles and intro reveal.', Sparkles],
          ].map(([title, text, Icon]) => (
            <article key={String(title)} className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <Icon className="mb-4 text-pink-200" />
              <h3 className="font-bold">{String(title)}</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">{String(text)}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
