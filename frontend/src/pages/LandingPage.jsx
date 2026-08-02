import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileCheck2,
  Files,
  MessageSquareText,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WandSparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import CollabDocsLogo from '@/components/brand/CollabDocsLogo';
import { PLAN_TIERS } from '@/lib/plan-tiers';
import { cn } from '@/lib/utils';

const featureGroups = [
  {
    icon: Files,
    title: 'Documents that stay organized',
    description:
      'Start from structured templates, find work instantly, and keep every draft in one calm workspace.'
  },
  {
    icon: UsersRound,
    title: 'Collaboration with context',
    description:
      'Comments, presence, messages, and decisions stay connected to the work they belong to.'
  },
  {
    icon: WandSparkles,
    title: 'AI that understands the work',
    description:
      'Turn long documents into summaries, action items, and mind maps without changing tools.'
  }
];

const securityHighlights = [
  { icon: ShieldCheck, label: 'Protected sessions' },
  { icon: FileCheck2, label: 'Decision history' },
  { icon: MessageSquareText, label: 'Contextual messaging' },
  { icon: Network, label: 'Connected knowledge' }
];

const ProductCanvas = () => (
  <div className="relative mx-auto w-full min-w-0 max-w-[1180px] overflow-hidden rounded-2xl border bg-card shadow-floating">
    <div className="flex h-12 items-center border-b px-4">
      <div className="flex w-[150px] shrink-0 items-center gap-2.5 border-r pr-4 sm:w-[200px]">
        <span className="grid size-7 place-items-center rounded-lg bg-primary text-meta font-bold text-primary-foreground">
          CD
        </span>
        <span className="text-meta font-semibold">CollabDocs</span>
      </div>
      <div className="mx-auto flex h-8 w-[38%] items-center rounded-full bg-secondary px-3 text-meta text-muted-foreground/70">
        Search your workspace
      </div>
      <div className="ml-auto flex gap-2">
        <span className="size-7 rounded-lg bg-secondary" />
        <span className="size-7 rounded-full bg-primary/15" />
      </div>
    </div>
    <div className="grid min-h-[480px] min-w-0 grid-cols-[150px_minmax(0,1fr)] bg-[hsl(var(--workspace))] sm:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="border-r bg-[hsl(var(--sidebar))] p-3">
        <div className="rounded-xl border bg-card p-2.5">
          <div className="h-2 w-24 rounded bg-foreground/80" />
          <div className="mt-2 h-1.5 w-16 rounded bg-muted-foreground/25" />
        </div>
        <div className="mt-3 rounded-lg bg-primary px-3 py-2 text-meta font-semibold text-primary-foreground">
          + New document
        </div>
        <p className="mb-2 mt-5 px-2 text-meta font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          Workspace
        </p>
        {['Home', 'My documents', 'Shared with me', 'Messages'].map((item, index) => (
          <div
            key={item}
            className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-meta ${
              index === 0
                ? 'bg-accent font-semibold text-accent-foreground'
                : 'text-muted-foreground'
            }`}
          >
            <span
              className={`size-2 rounded-sm ${index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            />
            {item}
          </div>
        ))}
        <p className="mb-2 mt-5 px-2 text-meta font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          Intelligence
        </p>
        {['Mind maps', 'AI workspace'].map((item) => (
          <div
            key={item}
            className="mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-meta text-muted-foreground"
          >
            <span className="size-2 rounded-sm bg-primary/40" />
            {item}
          </div>
        ))}
      </aside>
      <main className="min-w-0 overflow-hidden p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 h-1.5 w-24 rounded bg-success/60" />
            <div className="h-5 w-52 rounded bg-foreground/85" />
            <div className="mt-2 h-2 w-64 max-w-full rounded bg-muted-foreground/25" />
          </div>
          <div className="shrink-0 rounded-full bg-primary px-4 py-2 text-meta font-semibold text-primary-foreground">
            + New document
          </div>
        </div>

        <div className="mt-7 rounded-2xl border bg-card p-5 shadow-raised">
          <div className="h-3 w-36 rounded bg-foreground/80" />
          <div className="mt-1.5 h-1.5 w-52 max-w-full rounded bg-muted-foreground/25" />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['bg-primary', 'bg-primary/70', 'bg-primary/50', 'bg-primary/30'].map(
              (accent, index) => (
                <div key={accent}>
                  <div className="aspect-[4/3] rounded-xl border bg-accent/60 p-3">
                    <div className={`size-6 rounded-lg ${accent}`} />
                    <div className="mt-4 h-1.5 w-3/5 rounded bg-muted-foreground/35" />
                    <div className="mt-2 h-1 w-full rounded bg-muted-foreground/20" />
                    <div className="mt-1.5 h-1 w-4/5 rounded bg-muted-foreground/20" />
                  </div>
                  <div className="mt-2 h-1.5 w-16 rounded bg-muted-foreground/30" />
                  <span className="sr-only">Template {index + 1}</span>
                </div>
              )
            )}
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between gap-4">
          <div>
            <div className="h-3 w-28 rounded bg-foreground/80" />
            <div className="mt-1.5 h-1.5 w-20 rounded bg-muted-foreground/25" />
          </div>
          <div className="h-8 w-36 rounded-lg border bg-card" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item}>
              <div className="aspect-[0.76] rounded-xl border bg-card p-4 shadow-raised">
                <div className="h-2 w-3/5 rounded bg-foreground/70" />
                <div className="mt-2 h-1 w-2/5 rounded bg-primary/40" />
                <div className="mt-5 space-y-2">
                  {[92, 78, 96, 64, 84, 72].map((width, index) => (
                    <div
                      key={index}
                      className="h-1 rounded bg-muted-foreground/20"
                      style={{ width: `${width}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-2 h-2 w-4/5 rounded bg-foreground/70" />
              <div className="mt-1.5 h-1 w-2/5 rounded bg-muted-foreground/25" />
            </div>
          ))}
        </div>
      </main>
    </div>
  </div>
);

const LandingPage = () => (
  <main className="min-h-screen overflow-hidden bg-background text-foreground">
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6 lg:px-8">
        <CollabDocsLogo />
        <nav
          className="ml-10 hidden items-center gap-7 text-body font-medium text-muted-foreground md:flex"
          aria-label="Marketing"
        >
          <a href="#product" className="transition-colors duration-control hover:text-foreground">
            Product
          </a>
          <a href="#solutions" className="transition-colors duration-control hover:text-foreground">
            Solutions
          </a>
          <a href="#security" className="transition-colors duration-control hover:text-foreground">
            Security
          </a>
          <a href="#pricing" className="transition-colors duration-control hover:text-foreground">
            Pricing
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden rounded-full px-4 sm:inline-flex">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild className="rounded-full px-4">
            <Link to="/signup">
              Get started <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>

    <section className="relative min-w-0 px-4 pb-20 pt-28 sm:px-6 sm:pt-36 lg:px-8">
      <div className="auth-grid pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-[620px] w-[920px] max-w-none -translate-x-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.12),transparent_66%)]" />
      <div className="relative mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1.5 text-caption font-semibold text-accent-foreground">
          <Sparkles className="size-3.5" /> A clearer way to work together
        </span>
        <h1 className="mx-auto mt-6 max-w-2xl text-display font-semibold tracking-tight">
          Turn shared thinking into meaningful progress.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-body-lg text-muted-foreground">
          CollabDocs brings documents, decisions, conversations, and AI into one focused workspace
          your team will actually enjoy using.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full px-6">
            <Link to="/signup">
              Create your workspace <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-5">
            <a href="#product">
              <span className="grid size-6 place-items-center rounded-full bg-secondary">
                <Play className="ml-0.5 size-3 fill-current" />
              </span>
              See how it works
            </a>
          </Button>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-caption font-medium text-muted-foreground">
          {['Free to start', 'No card required', 'Set up in minutes'].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <Check className="size-3.5 text-success" /> {item}
            </span>
          ))}
        </div>
      </div>
      <div
        id="product"
        className="relative mx-auto mt-16 max-w-6xl rounded-[28px] border bg-secondary/50 p-2 sm:p-4"
      >
        <ProductCanvas />
      </div>
    </section>

    <section id="solutions" className="border-y bg-[hsl(var(--workspace))] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <p className="text-meta font-semibold uppercase tracking-[0.18em] text-primary">
            One connected workspace
          </p>
          <h2 className="mt-4 text-title-lg font-semibold tracking-tight">
            Less tool switching. More shared clarity.
          </h2>
          <p className="mt-3 text-body-lg text-muted-foreground">
            Every module is designed to keep the work, the people, and the reasoning behind each
            decision close together.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {featureGroups.map((feature) => (
            <article key={feature.title} className="surface-card group p-5">
              <span className="icon-chip">
                <feature.icon className="size-4" strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 text-title-sm font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-body text-muted-foreground">{feature.description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-caption font-semibold text-primary">
                Explore feature
                <ChevronRight className="size-3.5 transition-transform duration-control group-hover:translate-x-0.5" />
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section id="security" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 rounded-[28px] border bg-gradient-to-br from-[hsl(var(--primary)/0.06)] via-card to-card p-6 shadow-raised sm:p-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-meta font-semibold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="size-4" /> Secure by design
          </span>
          <h2 className="mt-4 text-title-lg font-semibold tracking-tight">
            Your team&rsquo;s knowledge stays protected.
          </h2>
          <p className="mt-4 max-w-xl text-body-lg text-muted-foreground">
            Role-aware access, protected sessions, audit-friendly decisions, and workspace controls
            are built into the product—not bolted on later.
          </p>
          <Button asChild className="mt-7 rounded-full px-5">
            <Link to="/signup">
              Start securely <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {securityHighlights.map((item) => (
            <div key={item.label} className="surface-card p-4">
              <span className="icon-chip">
                <item.icon className="size-4" strokeWidth={1.8} />
              </span>
              <p className="mt-3 text-body font-semibold">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section id="pricing" className="border-t bg-[hsl(var(--workspace))] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-meta font-semibold uppercase tracking-[0.18em] text-primary">
            Pricing
          </p>
          <h2 className="mt-3 text-title-lg font-semibold tracking-tight">
            Every plan onboards a team. Paid plans add reasoning.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-body-lg text-muted-foreground">
            Free includes real AI that runs entirely inside your workspace. Pro and Team add
            deeper answers, smarter search, and document Q&amp;A for every seat.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PLAN_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={cn(
                'surface-card relative flex flex-col p-6',
                tier.highlight && 'border-primary/40 shadow-lifted ring-1 ring-primary/20'
              )}
            >
              {tier.highlight && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-meta font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="text-body-lg font-semibold">{tier.name}</p>
                <span className="status-pill status-pill--neutral">{tier.seats}</span>
              </div>
              <p className="mt-2.5 text-title font-semibold tracking-tight">
                {tier.price}
                <span className="ml-1.5 text-meta font-normal text-muted-foreground">
                  {tier.period}
                </span>
              </p>
              <p className="mt-2 text-body text-muted-foreground">{tier.tagline}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-body">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={2.2} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={tier.highlight ? 'default' : 'outline'}
                className="mt-6 h-10 w-full rounded-full"
              >
                <Link to="/signup">
                  {tier.id === 'free' ? 'Start free' : `Start with ${tier.name}`}
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-body text-muted-foreground">
            Start with your next document. Bring the rest of the team when you are ready.
          </p>
          <Button asChild size="lg" className="mt-5 rounded-full px-6">
            <Link to="/signup">
              Start free today <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>

    <footer className="border-t bg-[hsl(var(--workspace))] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 text-caption text-muted-foreground sm:flex-row sm:items-center">
        <CollabDocsLogo />
        <p className="sm:ml-4">Documents, decisions, and teamwork in one focused workspace.</p>
        <div className="flex gap-5 sm:ml-auto">
          <a href="/privacy" className="transition-colors duration-control hover:text-foreground">
            Privacy
          </a>
          <a href="/terms" className="transition-colors duration-control hover:text-foreground">
            Terms
          </a>
          <a
            href="mailto:hello@collabdocs.app"
            className="transition-colors duration-control hover:text-foreground"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  </main>
);

export default LandingPage;
