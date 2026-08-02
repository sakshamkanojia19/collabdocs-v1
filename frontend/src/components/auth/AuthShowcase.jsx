import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const highlights = ['Real-time co-editing', 'Decisions stay logged', 'AI grounded in your docs'];

/**
 * Wise-style brand panel for the auth split layout. Deep violet is derived
 * from the primary token (darkened with a neutral overlay) so the panel keeps
 * tracking the brand hue in both themes.
 */
const AuthShowcase = () => (
  <aside
    className="relative hidden overflow-hidden bg-[hsl(var(--primary))] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
    aria-hidden="true"
  >
    {/* Depth: darken toward the bottom, one soft glow top-right. */}
    <div className="absolute inset-0 bg-[linear-gradient(200deg,rgba(0,0,0,0.18),rgba(10,4,28,0.62))]" />
    <div className="absolute -right-28 -top-28 size-[420px] rounded-full bg-white/15 blur-3xl" />
    <div className="absolute -bottom-40 -left-24 size-[380px] rounded-full bg-black/25 blur-3xl" />

    <div className="relative">
      {/* Floating document card with the circular arrow chip, Wise-collage style. */}
      <div className="relative w-[280px]">
        <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-white text-caption font-bold text-[hsl(var(--primary))]">
              CD
            </span>
            <div className="space-y-1.5">
              <div className="h-2 w-28 rounded-full bg-white/80" />
              <div className="h-1.5 w-20 rounded-full bg-white/40" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-1.5 w-full rounded-full bg-white/35" />
            <div className="h-1.5 w-5/6 rounded-full bg-white/35" />
            <div className="h-1.5 w-2/3 rounded-full bg-white/25" />
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="grid size-5 place-items-center rounded-full bg-white/90 text-meta font-bold text-[hsl(var(--primary))] ring-2 ring-white/20">
              A
            </span>
            <span className="grid size-5 place-items-center rounded-full bg-white/70 text-meta font-bold text-[hsl(var(--primary))] ring-2 ring-white/20">
              S
            </span>
            <span className="h-1.5 w-16 rounded-full bg-white/30" />
          </div>
        </div>
        <span className="absolute -bottom-6 -right-8 grid size-16 place-items-center rounded-full bg-white text-[hsl(var(--primary))] shadow-floating">
          <ArrowRight className="size-6" strokeWidth={2.2} />
        </span>
      </div>
    </div>

    <div className="relative">
      <h2 className="text-display font-extrabold uppercase leading-[1.06] tracking-tight xl:text-[44px]">
        Docs, decisions
        <br />
        &amp; chat.
        <br />
        <span className="text-white/70">One workspace.</span>
      </h2>
      <p className="mt-5 max-w-sm text-body-lg leading-6 text-white/75">
        CollabDocs keeps every document connected to the conversations and decisions behind it.
      </p>
      <p className="mt-4 text-body-lg font-semibold">
        Why teams switch?{' '}
        <Link to="/" className="underline underline-offset-4 transition-colors hover:text-white/80">
          Get the full story
        </Link>
      </p>

      <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/15 pt-5">
        {highlights.map((item) => (
          <span key={item} className="flex items-center gap-1.5 text-caption font-medium text-white/80">
            <Check className="size-3.5 text-white" strokeWidth={2.4} />
            {item}
          </span>
        ))}
      </div>
    </div>
  </aside>
);

export default AuthShowcase;
