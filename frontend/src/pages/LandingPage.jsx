import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileCheck2,
  FileText,
  Gavel,
  KeyRound,
  LayoutTemplate,
  ListChecks,
  Lock,
  Menu,
  MessageCircle,
  MessagesSquare,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WandSparkles,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CollabDocsLogo from '@/components/brand/CollabDocsLogo';
import ScaledFrame from '@/components/marketing/ScaledFrame';
import { AvatarStack } from '@/components/marketing/AppWindow';
import DashboardMockup from '@/components/marketing/DashboardMockup';
import { PLAN_TIERS } from '@/lib/plan-tiers';
import { cn } from '@/lib/utils';

// The hero dashboard ships with the page; the tour mockups sit below the fold,
// so they load on demand and keep the entry bundle (shared with sign-in) lean.
const tourMockup = (name) =>
  lazy(() => import('@/components/marketing/ProductMockups').then((module) => ({ default: module[name] })));
const DocumentMockup = tourMockup('DocumentMockup');
const AIMockup = tourMockup('AIMockup');
const MindMapMockup = tourMockup('MindMapMockup');
const MessagesMockup = tourMockup('MessagesMockup');

const navLinks = [
  { href: '#product', label: 'Product' },
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#security', label: 'Security' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' }
];

const tourTabs = [
  {
    value: 'docs',
    icon: FileText,
    label: 'Documents',
    title: 'A calm editor with the team built in',
    description:
      'Write together and see who is in the document right now. Changes sync to everyone viewing it, and every decision links back to the passage it came from.',
    points: ['Live presence and synced changes', 'Decisions linked to the exact passage', 'Action items pulled from the text'],
    Mockup: DocumentMockup
  },
  {
    value: 'ai',
    icon: WandSparkles,
    label: 'AI answers',
    title: 'Ask your workspace, get answers with sources',
    description:
      'Ask what was decided, what is blocked, or who owns what. Every answer cites the documents it came from, so you can check it.',
    points: ['Sources listed with every answer', 'Summaries and mind maps in one click', 'Search by meaning on Pro and Team'],
    Mockup: AIMockup
  },
  {
    value: 'maps',
    icon: Network,
    label: 'Mind maps',
    title: 'See how the work connects',
    description:
      'Turn any document into a mind map. Click a node to see the passage behind it, rearrange and edit the map, or explore the workspace map that connects documents by shared themes.',
    points: ['Generated from your own documents', 'Every node traces to its source', 'Drag, rename, and add nodes'],
    Mockup: MindMapMockup
  },
  {
    value: 'chat',
    icon: MessageCircle,
    label: 'Messages',
    title: 'Conversations that end up somewhere',
    description:
      'Group conversations live next to your docs. When a thread lands on a decision, record it on the document in one step, or insert the message straight into the text.',
    points: ['Conversations linked to documents', 'Record any message as a decision', 'Insert messages into the document'],
    Mockup: MessagesMockup
  }
];

const features = [
  {
    icon: UsersRound,
    title: 'Real-time co-editing',
    description: 'See who is in the document right now. Every change is saved and synced to everyone viewing it.',
    wide: true,
    visual: 'presence'
  },
  {
    icon: Gavel,
    title: 'Decision log',
    description: 'Record a decision straight from the conversation, with who made it, when, and a link back to the source.'
  },
  {
    icon: ListChecks,
    title: 'Action items',
    description: 'AI pulls tasks out of any document. Assign each one to a teammate and track it to done.'
  },
  {
    icon: MessagesSquare,
    title: 'Contextual messaging',
    description: 'Talk in conversations linked to a document, and move what matters into the document itself.',
    wide: true,
    visual: 'thread'
  },
  {
    icon: LayoutTemplate,
    title: 'Structured templates',
    description: 'Meeting notes, specs, briefs, and decision records ready on day one.'
  },
  {
    icon: Search,
    title: 'Search that understands',
    description: 'Keyword search on every plan. Pro and Team add search by meaning.'
  },
  {
    icon: Network,
    title: 'Mind maps with sources',
    description: 'Turn any document into a map where every idea links back to its passage.'
  }
];

const steps = [
  {
    title: 'Create your workspace',
    description: 'Sign up free and get your own workspace. Add teammates by email once they have signed up.'
  },
  {
    title: 'Write and decide together',
    description: 'Start from a template, edit together, and record decisions where the discussion happens.'
  },
  {
    title: 'Let AI connect the dots',
    description: 'Get summaries, action items, mind maps, and answers with sources across everything your team writes.'
  }
];

const securityPoints = [
  { icon: Lock, title: 'Protected sessions', description: 'Signed session tokens are checked on every request and every live connection.' },
  { icon: KeyRound, title: 'Role-aware access', description: 'Owners, editors, and viewers per document, with org-level boundaries.' },
  { icon: FileCheck2, title: 'Decision history', description: 'An audit-friendly record of who decided what, when, and why.' },
  { icon: ShieldCheck, title: 'Private AI on Free', description: 'Free-plan AI runs inside your workspace. Nothing is sent to a third party.' }
];

const faqs = [
  {
    q: 'Is the Free plan actually useful?',
    a: 'Yes. Free includes unlimited documents, chat, decisions, summaries, mind maps, and action items for up to 3 seats. Paid plans add deeper AI and more seats.'
  },
  {
    q: 'Where does the AI get its answers?',
    a: 'Only from documents in your workspace that you have access to. Every answer lists its sources so you can open the exact passage.'
  },
  {
    q: 'Can I bring my team later?',
    a: 'Yes. Start solo and add teammates whenever you are ready. Once they have signed up, add them by email from Settings and they join your workspace.'
  },
  {
    q: 'Does it work in dark mode and on mobile?',
    a: 'Yes. CollabDocs supports light, dark, and system themes, and the workspace adapts to phones, tablets, and large displays.'
  }
];

const presenceTeam = [
  { initials: 'RS', tone: 'primary' },
  { initials: 'AM', tone: 'info' },
  { initials: 'MK', tone: 'success' },
  { initials: 'DP', tone: 'warning' }
];

const SectionHeading = ({ eyebrow, title, description, align = 'center' }) => (
  <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
    <p className="text-caption font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
    <h2 className="mt-3 text-balance text-display font-semibold tracking-tight md:text-display-lg">{title}</h2>
    {description && <p className="mt-4 text-pretty text-body-lg text-muted-foreground md:text-title-sm md:font-normal">{description}</p>}
  </div>
);

const MockupStage = ({ children, className }) => (
  <div className={cn('rounded-[20px] border bg-secondary/60 p-1.5 shadow-floating sm:rounded-[24px] sm:p-2.5', className)}>
    <ScaledFrame width={1200} height={720} className="rounded-xl sm:rounded-[14px]">
      {children}
    </ScaledFrame>
  </div>
);

const SiteHeader = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-panel',
        scrolled || open ? 'border-border bg-background/85 backdrop-blur-xl' : 'border-transparent bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6 lg:px-8">
        <CollabDocsLogo />
        <nav className="ml-10 hidden items-center gap-6 text-body font-medium text-muted-foreground lg:flex" aria-label="Marketing">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors duration-control hover:text-foreground">
              {link.label}
            </a>
          ))}
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
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>
      {open && (
        <nav className="border-t bg-background px-4 pb-5 pt-2 lg:hidden" aria-label="Marketing mobile">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-body-lg font-medium text-muted-foreground transition-colors duration-control hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <Button asChild variant="outline" className="mt-3 w-full rounded-full sm:hidden">
            <Link to="/login">Sign in</Link>
          </Button>
        </nav>
      )}
    </header>
  );
};

const Hero = () => (
  <section className="relative px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:px-8">
    <div className="auth-grid pointer-events-none absolute inset-x-0 top-0 h-[640px]" />
    <div className="pointer-events-none absolute left-1/2 top-0 h-[720px] w-[1100px] max-w-none -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.16),transparent)]" />

    <div className="relative mx-auto max-w-4xl text-center">
      <a
        href="#product"
        className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-caption font-medium text-muted-foreground shadow-raised transition-colors duration-control hover:text-foreground"
      >
        <span className="rounded-full bg-primary px-2 py-0.5 text-meta font-semibold text-primary-foreground">New</span>
        AI answers grounded in your documents
        <ArrowRight className="size-3.5" />
      </a>
      <h1 className="mx-auto mt-7 max-w-3xl text-balance text-display-lg font-semibold tracking-tight sm:text-hero">
        Docs, decisions, and conversations.{' '}
        <span className="bg-gradient-to-r from-primary to-[hsl(var(--primary)/0.6)] bg-clip-text text-transparent">
          Finally in one place.
        </span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-body-lg text-muted-foreground sm:text-title-sm sm:font-normal sm:leading-7">
        CollabDocs is the workspace where your team writes together, records why things were decided, and asks AI
        questions about all of it, with the sources shown.
      </p>
      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-11 w-full rounded-full px-6 shadow-lifted sm:w-auto">
          <Link to="/signup">
            Create your free workspace <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-11 w-full rounded-full px-6 sm:w-auto">
          <a href="#product">Take the product tour</a>
        </Button>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-caption font-medium text-muted-foreground">
        {['Free for up to 3 seats', 'No card required', 'Set up in 2 minutes'].map((item) => (
          <span key={item} className="flex items-center gap-1.5">
            <Check className="size-3.5 text-success" strokeWidth={2.4} /> {item}
          </span>
        ))}
      </div>
    </div>

    <div className="relative mx-auto mt-14 max-w-6xl sm:mt-20">
      <MockupStage>
        <DashboardMockup />
      </MockupStage>

      {/* Floating callouts: desktop only, where there is room beside the frame. */}
      <div className="absolute -bottom-10 left-[24%] hidden w-60 rounded-2xl border bg-card p-3.5 shadow-floating xl:block">
        <p className="flex items-center gap-1.5 text-caption font-semibold text-accent-foreground">
          <Gavel className="size-3.5" /> Decision logged
        </p>
        <p className="mt-1.5 text-body font-semibold">Launch moves to Oct 14</p>
        <p className="mt-0.5 text-caption text-muted-foreground">Linked to “Pricing” in the launch plan</p>
      </div>
      <div className="absolute -bottom-10 right-16 hidden w-64 rounded-2xl border bg-card p-3.5 shadow-floating xl:block">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-caption font-semibold text-primary">
            <Sparkles className="size-3.5" /> AI summary ready
          </p>
          <span className="status-pill status-pill--success">5 actions</span>
        </div>
        <p className="mt-1.5 text-caption text-muted-foreground">
          Weekly product sync → 4 key points and 5 action items, each linked to its passage.
        </p>
      </div>
    </div>
  </section>
);

const AudienceStrip = () => (
  <section className="border-y bg-[hsl(var(--workspace))] px-4 py-8 sm:px-6 lg:px-8">
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 md:flex-row md:justify-between">
      <p className="text-body font-medium text-muted-foreground">Built for teams who write things down</p>
      <div className="flex flex-wrap justify-center gap-2">
        {['Product teams', 'Engineering', 'Operations', 'Agencies', 'Founders', 'Research'].map((item) => (
          <span key={item} className="rounded-full border bg-card px-3.5 py-1.5 text-caption font-medium text-foreground/80">
            {item}
          </span>
        ))}
      </div>
    </div>
  </section>
);

const ProductTour = () => (
  <section id="product" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <SectionHeading
        eyebrow="Product tour"
        title="See what it looks like inside"
        description="Four modules, one workspace. Each one knows about the others, so nothing important gets lost between tools."
      />
      <Tabs defaultValue="docs" className="mt-12 gap-10">
        <TabsList className="mx-auto h-auto flex-wrap justify-center gap-1 rounded-full border bg-card p-1 shadow-raised">
          {tourTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-9 flex-none gap-1.5 rounded-full px-4 text-body data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              <tab.icon className="size-4" strokeWidth={1.8} />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tourTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="rise-in">
            <div className="grid items-center gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div>
                <span className="icon-chip size-10">
                  <tab.icon className="size-5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-5 text-title-lg font-semibold tracking-tight">{tab.title}</h3>
                <p className="mt-3 text-body-lg text-muted-foreground">{tab.description}</p>
                <ul className="mt-6 space-y-3">
                  {tab.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-body-lg">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <MockupStage className="min-w-0">
                <Suspense fallback={<div className="size-full animate-pulse bg-card" />}>
                  <tab.Mockup />
                </Suspense>
              </MockupStage>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  </section>
);

const FeatureVisual = ({ type }) => {
  if (type === 'presence') {
    return (
      <div className="mt-6 rounded-xl border bg-[hsl(var(--workspace))] p-4">
        <div className="flex items-center justify-between">
          <p className="text-caption font-semibold">Atlas v2 — Launch plan</p>
          <AvatarStack people={presenceTeam} />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2 w-11/12 rounded bg-muted-foreground/20" />
          <div className="h-2 w-2/3 rounded bg-muted-foreground/20" />
          <div className="h-2 w-4/5 rounded bg-primary/25" />
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-meta text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" /> Saved · synced to everyone
          </span>
          <span>3 editors · 1 viewer</span>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-2 rounded-xl border bg-[hsl(var(--workspace))] p-4">
      <div className="w-fit max-w-[85%] rounded-2xl rounded-tl-md border bg-card px-3 py-1.5 text-caption">
        Partners want plan limits first. Move pricing to Oct 14?
      </div>
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-3 py-1.5 text-caption text-primary-foreground">
        Agreed. Recording it on the launch plan.
      </div>
      <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-meta font-semibold text-accent-foreground">
        <Gavel className="size-3" /> Recorded as a decision on the launch plan
      </div>
    </div>
  );
};

const Features = () => (
  <section id="features" className="scroll-mt-20 border-y bg-[hsl(var(--workspace))] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <SectionHeading
        eyebrow="Features"
        title="Everything the work needs. Nothing it doesn’t."
        description="Focused tools that share one source of truth, instead of ten apps that each hold a piece of it."
      />
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className={cn('interactive-card flex flex-col p-6', feature.wide && 'md:col-span-2')}
          >
            <span className="icon-chip">
              <feature.icon className="size-4" strokeWidth={1.8} />
            </span>
            <h3 className="mt-5 text-title-sm font-semibold tracking-tight">{feature.title}</h3>
            <p className="mt-2 max-w-md text-body text-muted-foreground">{feature.description}</p>
            {feature.visual && <FeatureVisual type={feature.visual} />}
          </article>
        ))}
      </div>
    </div>
  </section>
);

const HowItWorks = () => (
  <section id="how-it-works" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <SectionHeading eyebrow="How it works" title="From sign-up to shared clarity in minutes" />
      <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
        <div className="absolute left-[16%] right-[16%] top-5 hidden h-px bg-gradient-to-r from-primary/10 via-primary/40 to-primary/10 md:block" />
        {steps.map((step, index) => (
          <li key={step.title} className="relative text-center">
            <span className="relative mx-auto grid size-10 place-items-center rounded-full border-4 border-background bg-primary text-body font-semibold text-primary-foreground shadow-lifted">
              {index + 1}
            </span>
            <h3 className="mt-5 text-title-sm font-semibold">{step.title}</h3>
            <p className="mx-auto mt-2 max-w-xs text-body text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

const Security = () => (
  <section id="security" className="scroll-mt-20 px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
    <div className="mx-auto grid max-w-6xl gap-10 rounded-[28px] border bg-gradient-to-br from-[hsl(var(--primary)/0.07)] via-card to-card p-6 shadow-raised sm:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div>
        <span className="inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.16em] text-primary">
          <ShieldCheck className="size-4" /> Secure by design
        </span>
        <h2 className="mt-4 text-display font-semibold tracking-tight">Your team’s knowledge stays yours.</h2>
        <p className="mt-4 max-w-md text-body-lg text-muted-foreground">
          Access control, protected sessions, and a clear decision history are part of the product from the start.
        </p>
        <Button asChild className="mt-8 rounded-full px-5">
          <Link to="/signup">
            Start securely <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {securityPoints.map((item) => (
          <div key={item.title} className="surface-card p-5">
            <span className="icon-chip">
              <item.icon className="size-4" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-body-lg font-semibold">{item.title}</p>
            <p className="mt-1 text-body text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Pricing = () => (
  <section id="pricing" className="scroll-mt-20 border-t bg-[hsl(var(--workspace))] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <SectionHeading
        eyebrow="Pricing"
        title="Every plan onboards a team. Paid plans add reasoning."
        description="Free includes real AI that runs entirely inside your workspace. Pro and Team add deeper answers, smarter search, and document Q&A for every seat."
      />
      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {PLAN_TIERS.map((tier) => (
          <div
            key={tier.id}
            className={cn(
              'surface-card relative flex flex-col p-7',
              tier.highlight && 'border-primary/40 shadow-lifted ring-1 ring-primary/20 lg:-my-3 lg:py-10'
            )}
          >
            {tier.highlight && (
              <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-meta font-semibold text-primary-foreground">
                Most popular
              </span>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-title-sm font-semibold">{tier.name}</p>
              <span className="status-pill status-pill--neutral">{tier.seats}</span>
            </div>
            <p className="mt-4 text-display font-semibold tracking-tight">
              {tier.price}
              <span className="ml-2 text-caption font-normal tracking-normal text-muted-foreground">{tier.period}</span>
            </p>
            <p className="mt-2 text-body text-muted-foreground">{tier.tagline}</p>
            <ul className="mt-6 flex-1 space-y-3 border-t pt-6">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-body">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.2} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant={tier.highlight ? 'default' : 'outline'}
              className="mt-8 h-11 w-full rounded-full"
            >
              <Link to="/signup">{tier.id === 'free' ? 'Start free' : `Start with ${tier.name}`}</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Faq = () => (
  <section id="faq" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
      <SectionHeading
        align="left"
        eyebrow="FAQ"
        title="Questions, answered"
        description="Something else on your mind? Email hello@collabdocs.app and a person will reply."
      />
      {/* Native disclosure: accessible and keyboard-ready without shipping JS. */}
      <div className="surface-card divide-y px-6">
        {faqs.map((item, index) => (
          <details key={item.q} open={index === 0} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-5 text-body-lg font-semibold [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-control group-open:rotate-180" />
            </summary>
            <p className="pb-5 text-body-lg text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

const FinalCta = () => (
  <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
    <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
      <div className="absolute inset-0 bg-[linear-gradient(200deg,rgba(0,0,0,0.08),rgba(10,4,28,0.55))]" />
      <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/15 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-black/25 blur-3xl" />
      <div className="relative">
        <h2 className="mx-auto max-w-2xl text-display font-semibold tracking-tight md:text-display-lg">
          Start with your next document. Bring the team when you’re ready.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-body-lg text-primary-foreground/80">
          Free forever for up to 3 seats. Upgrade only when you want deeper AI.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" variant="secondary" className="h-11 w-full rounded-full bg-white px-6 text-primary hover:bg-white/90 sm:w-auto">
            <Link to="/signup">
              Create your free workspace <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="h-11 w-full rounded-full px-6 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:w-auto"
          >
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

const footerColumns = [
  {
    title: 'Product',
    links: [
      ['Product tour', '#product'],
      ['Features', '#features'],
      ['Pricing', '#pricing'],
      ['Security', '#security']
    ]
  },
  {
    title: 'Get started',
    links: [
      ['Create account', '/signup'],
      ['Sign in', '/login'],
      ['FAQ', '#faq']
    ]
  },
  {
    title: 'Company',
    links: [
      ['Contact', 'mailto:hello@collabdocs.app'],
      ['Privacy', '/privacy'],
      ['Terms', '/terms']
    ]
  }
];

const SiteFooter = () => (
  <footer className="border-t bg-[hsl(var(--workspace))] px-4 pb-10 pt-14 sm:px-6 lg:px-8">
    <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div>
        <CollabDocsLogo />
        <p className="mt-4 max-w-xs text-body text-muted-foreground">
          Documents, decisions, and teamwork in one focused workspace.
        </p>
      </div>
      {footerColumns.map((column) => (
        <div key={column.title}>
          <p className="text-caption font-semibold">{column.title}</p>
          <ul className="mt-3 space-y-2.5">
            {column.links.map(([label, href]) => (
              <li key={label}>
                <a href={href} className="text-body text-muted-foreground transition-colors duration-control hover:text-foreground">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t pt-6 text-caption text-muted-foreground sm:flex-row sm:justify-between">
      <p>© {new Date().getFullYear()} CollabDocs. All rights reserved.</p>
      <p>Made for teams who write things down.</p>
    </div>
  </footer>
);

const LandingPage = () => (
  <div className="min-h-screen overflow-x-clip bg-background text-foreground">
    <SiteHeader />
    <main>
      <Hero />
      <AudienceStrip />
      <ProductTour />
      <Features />
      <HowItWorks />
      <Security />
      <Pricing />
      <Faq />
      <FinalCta />
    </main>
    <SiteFooter />
  </div>
);

export default LandingPage;
