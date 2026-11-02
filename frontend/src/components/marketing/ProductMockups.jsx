import {
  AlignCenter,
  AlignLeft,
  ArrowLeft,
  ArrowUpRight,
  Bold,
  ChevronDown,
  Copy,
  FileText,
  Gavel,
  Hash,
  Italic,
  List,
  ListOrdered,
  MessageSquare,
  Network,
  PanelRight,
  Pencil,
  Plus,
  Redo2,
  Search,
  Send,
  SendHorizontal,
  Share2,
  ShieldCheck,
  Smile,
  Sparkles,
  Strikethrough,
  Underline,
  Undo2
} from 'lucide-react';
import AppWindow, { AvatarStack, MockAvatar } from './AppWindow';
import { cn } from '@/lib/utils';
import { people, Pill } from './mockup-kit';

// Every mockup mirrors a real screen: the same panels, labels, and data shapes
// the app renders, filled with an example team.

/* Document editor --------------------------------------------------------- */

const formatting = [Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter];

export const DocumentMockup = () => (
  <AppWindow active="mine" path="document/atlas-v2-launch-plan" sidebar={false}>
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-4">
        <ArrowLeft className="size-4 text-muted-foreground" />
        <span className="icon-chip size-7">
          <FileText className="size-3.5" strokeWidth={1.8} />
        </span>
        <div className="leading-tight">
          <p className="text-body font-semibold">Atlas v2 — Launch plan</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-meta text-muted-foreground">
            <Pill tone="success">Saved</Pill> Editing
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <AvatarStack people={[people.riya, people.arjun, people.maya]} size="sm" />
          <span className="flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-caption font-semibold text-primary-foreground">
            <Share2 className="size-3.5" /> Share
          </span>
          <MessageSquare className="size-4 text-muted-foreground" />
          <PanelRight className="size-4 text-muted-foreground" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col bg-[hsl(var(--editor-canvas))]">
          <div className="flex gap-4 border-b bg-card px-4 py-1.5 text-caption text-muted-foreground">
            {['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Help'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="flex items-center gap-1 border-b bg-card px-3 py-1.5">
            <Undo2 className="mx-1 size-3.5 text-muted-foreground" />
            <Redo2 className="mx-1 size-3.5 text-muted-foreground" />
            {['Paragraph', 'Arial', 'Normal'].map((item) => (
              <span key={item} className="ml-1 flex items-center gap-1 rounded-md border px-2 py-0.5 text-caption">
                {item} <ChevronDown className="size-3" />
              </span>
            ))}
            <span className="mx-1.5 h-4 w-px bg-border" />
            {formatting.map((Icon, index) => (
              <span key={index} className="grid size-6 place-items-center rounded text-muted-foreground">
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
            ))}
          </div>

          <div className="relative mx-auto mt-4 w-[560px] flex-1 bg-card px-14 pt-10 shadow-[0_1px_3px_rgb(15_23_42/0.12)]">
            <h3 className="text-display font-semibold">Atlas v2 rollout</h3>
            <p className="mt-4 text-body-lg leading-7 text-foreground/85">
              Atlas v2 brings templates, decision logs, and AI answers grounded in our own documents. We roll out in
              three waves, starting with design partners.
            </p>
            <h4 className="mt-5 text-title font-semibold">Pricing</h4>
            <p className="mt-2 text-body-lg leading-7 text-foreground/85">
              <span className="rounded bg-warning-soft px-0.5 ring-2 ring-warning/20">
                Public pricing goes live on October 14
              </span>
              , after the design-partner wave confirms plan limits.
            </p>
            <h4 className="mt-5 text-title font-semibold">Action items</h4>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-body-lg text-foreground/85">
              <li>Riya to finalize pricing page copy by Friday.</li>
              <li>Maya will share the onboarding checklist tomorrow.</li>
            </ul>
          </div>
          <div className="flex justify-between border-t bg-card px-4 py-1.5 text-meta text-muted-foreground">
            <span>Saved to CollabDocs</span>
            <span>64 words · 1 page · 2 editors · 1 viewer</span>
          </div>
        </div>

        <aside className="flex w-[310px] shrink-0 flex-col border-l bg-card">
          <div className="flex h-11 items-center justify-between border-b px-3">
            <div className="flex rounded-lg bg-secondary p-0.5">
              {['AI', 'Decisions', 'Outline', 'Details'].map((tab) => (
                <span
                  key={tab}
                  className={cn(
                    'rounded-md px-2 py-1 text-caption',
                    tab === 'Decisions' ? 'bg-card font-medium text-foreground shadow-raised' : 'text-muted-foreground'
                  )}
                >
                  {tab}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-4 p-3.5">
            <div>
              <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">Decisions · 2</p>
              <div className="mt-2 space-y-2">
                <div className="rounded-xl border border-primary/30 bg-accent/50 p-3">
                  <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.1em] text-success">
                    <Gavel className="size-3" /> Decision
                  </p>
                  <p className="mt-1.5 text-body font-semibold">Public pricing launches Oct 14</p>
                  <p className="mt-1 text-caption text-muted-foreground">Recorded by Arjun · today · #launch-team</p>
                  <p className="mt-2 text-meta font-semibold text-primary">Show passage</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.1em] text-success">
                    <Gavel className="size-3" /> Decision
                  </p>
                  <p className="mt-1.5 text-body font-semibold">Wave 2 opens to all Pro teams</p>
                  <p className="mt-1 text-caption text-muted-foreground">Recorded by Maya · yesterday · #launch-team</p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">Action items · 2</p>
                <span className="rounded-full border px-2 py-0.5 text-meta font-semibold">Extract</span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex items-start gap-2 rounded-lg border p-2.5">
                  <span className="mt-0.5 size-3.5 shrink-0 rounded-full border-2 border-input" />
                  <div className="min-w-0 flex-1">
                    <p className="text-caption font-semibold">Finalize pricing page copy</p>
                    <p className="mt-1 flex items-center gap-1.5 text-meta text-muted-foreground">
                      <MockAvatar {...people.riya} size="sm" /> Riya · due Friday
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg border p-2.5">
                  <span className="mt-0.5 size-3.5 shrink-0 rounded-full border-2 border-input" />
                  <div className="min-w-0 flex-1">
                    <p className="text-caption font-semibold">Share the onboarding checklist</p>
                    <p className="mt-1 text-meta text-muted-foreground">Suggested owner: Maya · Assign to ▾</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </AppWindow>
);

/* AI workspace ------------------------------------------------------------- */

const SourceNumber = ({ n, active }) => (
  <span
    className={cn(
      'grid size-5 shrink-0 place-items-center rounded text-meta font-semibold',
      active ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'
    )}
  >
    {n}
  </span>
);

const aiSources = [
  ['Atlas v2 — Launch plan', 'Public pricing goes live on October 14, after the design-partner wave confirms plan limits.'],
  ['Design partner feedback', 'Partners want plan limits before pricing is published.'],
  ['Weekly product sync', 'Pricing page copy needs sign-off before launch.']
];

export const AIMockup = () => (
  <AppWindow active="ai" path="ai">
    <div className="h-full px-6 py-5">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_280px] overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <span className="icon-chip size-8">
                <Sparkles className="size-4" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-title-sm font-semibold">Ask your workspace</p>
                <p className="text-caption text-muted-foreground">
                  Answers cite the documents they come from, and only use documents you can open.
                </p>
              </div>
            </div>
            <div className="flex rounded-full bg-secondary p-0.5 text-caption">
              <span className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 font-medium shadow-raised">
                <Sparkles className="size-3" /> Ask
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 text-muted-foreground">
                <Search className="size-3" /> Search
              </span>
            </div>
          </div>

          <div className="ml-auto mt-5 max-w-[400px] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-body text-primary-foreground">
            When does public pricing go live, and what&rsquo;s still blocking it?
          </div>

          <div className="mt-3 max-w-[540px] rounded-2xl rounded-bl-md border border-primary/40 bg-card p-4 shadow-raised">
            <p className="flex items-center gap-1.5 text-caption font-semibold text-primary">
              <Sparkles className="size-3.5" /> Advanced AI answer
              <span className="font-normal text-muted-foreground">· 3 sources</span>
            </p>
            <p className="mt-2 text-body leading-6">
              Public pricing goes live on October 14, once design partners confirm plan limits. The pricing page copy
              still needs sign-off, and partners asked to see plan limits before anything is published.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {aiSources.map(([title], index) => (
                <span key={title} className="flex items-center gap-1.5 rounded-full border bg-secondary/60 py-0.5 pl-0.5 pr-2.5 text-meta">
                  <SourceNumber n={index + 1} /> {title}
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2 border-t pt-3">
              <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-meta font-semibold">
                <Copy className="size-3" /> Copy answer
              </span>
              <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-meta font-semibold">
                <ArrowUpRight className="size-3" /> Open top source
              </span>
            </div>
          </div>

          <div className="mt-auto">
            <div className="mb-2.5 flex gap-2">
              <span className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-caption">
                <FileText className="size-3.5 text-primary" /> Summarize a document
              </span>
              <span className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-caption">
                <Network className="size-3.5 text-primary" /> Generate a mind map
              </span>
            </div>
            <div className="flex h-11 items-center gap-2 rounded-xl border bg-card pl-3.5 pr-1.5 shadow-raised">
              <span className="text-body text-muted-foreground">Ask about any document, decision, or meeting…</span>
              <span className="ml-auto grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <SendHorizontal className="size-3.5" />
              </span>
            </div>
          </div>
        </div>

        <aside className="border-l bg-[hsl(var(--sidebar))] p-4">
          <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">Sources</p>
          <div className="mt-3 space-y-2.5">
            {aiSources.map(([title, quote], index) => (
              <div key={title} className={cn('rounded-xl border bg-card p-3', index === 0 && 'border-primary/30 bg-accent/40')}>
                <div className="flex items-center gap-2">
                  <SourceNumber n={index + 1} active={index === 0} />
                  <p className="truncate text-caption font-semibold">{title}</p>
                  <ArrowUpRight className="ml-auto size-3 shrink-0 opacity-60" />
                </div>
                <p className="mt-1.5 line-clamp-2 border-l-2 border-primary/40 pl-2 text-meta text-muted-foreground">“{quote}”</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-card p-3 ring-1 ring-border">
            <p className="flex items-center gap-1.5 text-caption font-semibold">
              <ShieldCheck className="size-3.5 text-success" /> Grounded answers only
            </p>
            <p className="mt-1 text-meta text-muted-foreground">
              Answers come from your workspace and list their sources, so you can check every claim.
            </p>
          </div>
        </aside>
      </div>
    </div>
  </AppWindow>
);

/* Mind map ----------------------------------------------------------------- */

const center = { x: 360, y: 290 };
const branches = [
  { label: 'Pricing', x: 150, y: 130, children: [['Oct 14 go-live', 0, 60], ['Plan limits first', 10, 190]] },
  { label: 'Rollout waves', x: 570, y: 130, children: [['Design partners', 640, 60], ['All Pro teams', 650, 190]] },
  { label: 'Templates', x: 150, y: 450, children: [['Decision logs', 10, 390], ['AI answers', 20, 520]] },
  { label: 'Action items', x: 570, y: 450, children: [['Pricing page copy', 640, 390], ['Onboarding checklist', 630, 520]] }
];

const curve = (a, b) => {
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
};

export const MindMapMockup = () => (
  <AppWindow active="mind-maps" path="mind-maps">
    <div className="grid h-full grid-cols-[230px_minmax(0,1fr)]">
      <div className="border-r bg-card p-3">
        <div className="flex h-8 items-center gap-2 rounded-lg border px-2.5 text-caption text-muted-foreground">
          <Search className="size-3.5" /> Search mind maps
        </div>
        <p className="mt-2 px-1 text-meta text-muted-foreground">3 mind maps</p>
        <div className="mt-2 space-y-2">
          {[
            ['Atlas v2 — Launch plan mind map', '9 nodes'],
            ['Weekly product sync mind map', '6 nodes'],
            ['Customer interview notes mind map', '5 nodes']
          ].map(([title, count], index) => (
            <div key={title} className={cn('rounded-xl border p-2.5', index === 0 && 'border-primary ring-2 ring-primary/15')}>
              <p className="flex items-center gap-1.5 text-caption font-semibold">
                <Network className="size-3.5 shrink-0 text-primary" /> <span className="truncate">{title}</span>
              </p>
              <p className="mt-1 text-meta text-muted-foreground">{count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-4">
        <div className="flex items-center gap-2">
          <p className="text-body-lg font-semibold">Atlas v2 — Launch plan mind map</p>
          <Pill tone="neutral">9 nodes</Pill>
          <span className="ml-auto flex items-center gap-1 rounded-full border px-2.5 py-1 text-meta font-semibold">
            <Pencil className="size-3" /> Edit map
          </span>
          <span className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-meta font-semibold">
            Open source document <ArrowUpRight className="size-3" />
          </span>
        </div>
        <div className="mt-3 flex min-h-0 flex-1 gap-3">
          <div className="mind-map-grid relative min-w-0 flex-1 overflow-hidden rounded-xl border">
            <div className="absolute left-[16px] top-[18px] h-[600px] w-[860px] origin-top-left scale-[0.6]">
              <svg className="absolute inset-0 size-full overflow-visible" fill="none">
                {branches.map((branch) => (
                  <g key={branch.label}>
                    <path d={curve(center, branch)} stroke="hsl(var(--primary) / 0.45)" strokeWidth="2" />
                    {branch.children.map(([label, x, y]) => (
                      <path key={label} d={curve(branch, { x: x + 60, y })} stroke="hsl(var(--muted-foreground) / 0.35)" strokeWidth="1.5" />
                    ))}
                  </g>
                ))}
              </svg>
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-primary px-5 py-3 text-body-lg font-semibold text-primary-foreground shadow-lifted"
                style={{ left: center.x, top: center.y }}
              >
                Atlas v2 — Launch plan
              </div>
              {branches.map((branch, index) => (
                <div key={branch.label}>
                  <div
                    className={cn(
                      'absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card px-3.5 py-2 text-body font-semibold shadow-raised',
                      index === 0 && 'border-primary ring-2 ring-primary/20'
                    )}
                    style={{ left: branch.x, top: branch.y }}
                  >
                    {branch.label}
                  </div>
                  {branch.children.map(([label, x, y]) => (
                    <div
                      key={label}
                      className="absolute -translate-y-1/2 whitespace-nowrap rounded-lg border bg-accent/70 px-2.5 py-1.5 text-caption font-medium text-accent-foreground"
                      style={{ left: x, top: y }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="absolute bottom-2 left-3 text-meta text-muted-foreground">
              Drag to pan · drag a node to move it · Ctrl + scroll to zoom
            </p>
          </div>
          <aside className="w-[220px] shrink-0 rounded-xl border bg-card p-3">
            <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">Selected node</p>
            <p className="mt-1.5 text-body-lg font-semibold">Pricing</p>
            <p className="mt-0.5 text-caption text-muted-foreground">2 child ideas</p>
            <p className="mt-4 text-caption font-semibold">Source passages</p>
            <div className="mt-2 space-y-2">
              <p className="border-l-2 border-primary/50 pl-2 text-meta text-muted-foreground">
                “Public pricing goes live on October 14…”
              </p>
              <p className="border-l-2 border-primary/50 pl-2 text-meta text-muted-foreground">
                “…after the design-partner wave confirms plan limits.”
              </p>
            </div>
            <p className="mt-3 text-meta text-muted-foreground">From Atlas v2 — Launch plan</p>
          </aside>
        </div>
      </div>
    </div>
  </AppWindow>
);

/* Messages ---------------------------------------------------------------- */

const conversations = [
  { name: 'launch-team', preview: 'Riya: Agreed, recording it on the plan', time: '10:24', unread: 2, linked: true },
  { name: 'design-partners', preview: 'Dev: wave 1 feedback is in', time: '09:51', unread: 1, linked: true },
  { name: 'pricing-review', preview: 'Maya: copy draft is ready', time: 'Yesterday' },
  { name: 'onboarding', preview: 'Arjun: shipping emails Friday', time: 'Mon' }
];

export const MessagesMockup = () => (
  <AppWindow active="messages" path="messages">
    <div className="grid h-full grid-cols-[260px_minmax(0,1fr)]">
      <div className="border-r bg-card p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 flex-1 items-center gap-2 rounded-lg border px-2.5 text-caption text-muted-foreground">
            <Search className="size-3.5" /> Search conversations
          </div>
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <Plus className="size-3.5" />
          </span>
        </div>
        <div className="mt-2.5 flex gap-1 text-caption">
          {['All', 'Unread', 'Documents'].map((tab, index) => (
            <span key={tab} className={cn('rounded-md px-2 py-1', index === 0 ? 'bg-accent font-semibold text-accent-foreground' : 'text-muted-foreground')}>
              {tab}
            </span>
          ))}
        </div>
        <div className="mt-2 space-y-0.5">
          {conversations.map((item, index) => (
            <div key={item.name} className={cn('flex items-center gap-2.5 rounded-lg p-2', index === 0 && 'bg-accent')}>
              <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-meta font-semibold text-primary">
                {item.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1 truncate text-caption font-semibold">
                    {item.name}
                    {item.linked && <FileText className="size-3 shrink-0 text-muted-foreground" />}
                  </p>
                  <span className="text-meta text-muted-foreground">{item.time}</span>
                </div>
                <p className="truncate text-meta text-muted-foreground">{item.preview}</p>
              </div>
              {item.unread && (
                <span className="grid size-4 place-items-center rounded-full bg-primary text-meta font-semibold text-primary-foreground">
                  {item.unread}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex h-12 items-center gap-2 border-b bg-card px-5">
          <Hash className="size-4 text-muted-foreground" />
          <p className="text-body font-semibold">launch-team</p>
          <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-meta text-muted-foreground">
            <FileText className="size-3" /> Atlas v2 — Launch plan
          </span>
          <div className="ml-auto">
            <AvatarStack people={[people.riya, people.arjun, people.maya, people.dev]} size="sm" />
          </div>
        </div>
        <div className="flex-1 space-y-4 px-6 py-5">
          <div className="flex gap-2.5">
            <MockAvatar {...people.arjun} size="lg" />
            <div>
              <p className="text-caption font-semibold">
                Arjun <span className="font-normal text-muted-foreground">10:18</span>
              </p>
              <div className="mt-1 max-w-[440px] rounded-2xl rounded-tl-md border bg-card px-3.5 py-2">
                <p className="mb-1.5 flex items-center gap-1.5 border-b pb-1.5 text-meta font-semibold uppercase tracking-[0.1em] text-success">
                  <Gavel className="size-3" /> Decision
                </p>
                <p className="text-body">
                  Partners want to see plan limits before we publish. Proposing we move public pricing to Oct 14.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-row-reverse gap-2.5">
            <MockAvatar {...people.riya} size="lg" />
            <div className="text-right">
              <p className="text-caption font-semibold">
                <span className="font-normal text-muted-foreground">10:21</span> You
              </p>
              <p className="mt-1 max-w-[440px] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2 text-left text-body text-primary-foreground">
                Agreed. Recording it on the launch plan so it doesn&rsquo;t get lost here.
              </p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <MockAvatar {...people.maya} size="lg" />
            <div>
              <p className="text-caption font-semibold">
                Maya <span className="font-normal text-muted-foreground">10:26</span>
              </p>
              <p className="mt-1 max-w-[440px] rounded-2xl rounded-tl-md border bg-card px-3.5 py-2 text-body">
                I&rsquo;ll insert the partner survey summary into the Pricing section.
              </p>
              <div className="mt-1.5 w-fit rounded-lg border bg-card p-1 text-meta shadow-floating">
                {['Reply', 'Record as decision', 'Insert into document'].map((item, index) => (
                  <p key={item} className={cn('rounded px-2 py-1', index === 2 && 'bg-secondary font-semibold')}>
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t bg-card p-3.5">
          <div className="flex h-10 items-center gap-3 rounded-xl border px-3.5 text-muted-foreground">
            <Smile className="size-4" />
            <span className="text-body">Message #launch-team</span>
            <span className="ml-auto grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Send className="size-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  </AppWindow>
);
