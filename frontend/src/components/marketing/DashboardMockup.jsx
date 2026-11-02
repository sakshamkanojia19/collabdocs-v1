import { ChevronDown, FileText, Gavel, LayoutTemplate, NotebookPen, Plus, WandSparkles } from 'lucide-react';
import AppWindow, { AvatarStack } from './AppWindow';
import { people, Pill } from './mockup-kit';

/* Dashboard -------------------------------------------------------------- */

const stats = [
  { label: 'Documents', value: '48', delta: '+6 this week' },
  { label: 'Shared with you', value: '12', delta: '3 unread' },
  { label: 'Open action items', value: '7', delta: '3 assigned to you' },
  { label: 'Decisions logged', value: '23', delta: '+4 this week' }
];

const templates = [
  { icon: NotebookPen, name: 'Meeting notes' },
  { icon: LayoutTemplate, name: 'Product spec' },
  { icon: FileText, name: 'Project brief' },
  { icon: Gavel, name: 'Decision record' }
];

const recentDocs = [
  {
    title: 'Atlas v2 — Launch plan',
    excerpt: 'Pricing moves to Oct 14. Onboarding checklist owned by Maya, rollout in three waves…',
    edited: 'Edited 12 min ago',
    status: ['success', 'Owner'],
    team: [people.riya, people.arjun, people.maya]
  },
  {
    title: 'Weekly product sync',
    excerpt: 'Agreed to ship templates first. Search by meaning follows in the next sprint…',
    edited: 'Edited 2 h ago',
    status: ['info', 'Shared'],
    team: [people.arjun, people.dev]
  },
  {
    title: 'Customer interview notes',
    excerpt: 'Teams lose decisions in chat threads. Top ask: one place for the why behind changes…',
    edited: 'Edited yesterday',
    status: ['success', 'Owner'],
    team: [people.maya]
  }
];

const myWork = [
  { task: 'Finalize pricing page copy', doc: 'Atlas v2 — Launch plan', due: 'Today', tone: 'warning' },
  { task: 'Share onboarding checklist', doc: 'Weekly product sync', due: 'Tomorrow', tone: 'info' },
  { task: 'Review interview synthesis', doc: 'Customer interview notes', due: 'Fri', tone: 'neutral' }
];

const DashboardMockup = () => (
  <AppWindow active="home" path="dashboard">
    <div className="h-full px-7 py-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-caption font-medium text-muted-foreground">Saturday, 27 September</p>
          <h3 className="mt-1 text-title-lg font-semibold tracking-tight">Good morning, Riya</h3>
          <p className="mt-1 text-body text-muted-foreground">
            3 documents changed by teammates in the last day.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="flex h-9 items-center gap-1.5 rounded-full border bg-card px-4 text-caption font-semibold">
            <WandSparkles className="size-3.5 text-primary" /> Ask AI
          </span>
          <span className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-caption font-semibold text-primary-foreground">
            <Plus className="size-3.5" /> New document
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="surface-card p-3.5">
            <p className="text-caption text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-title font-semibold">{stat.value}</p>
            <p className="mt-0.5 text-meta font-medium text-success">{stat.delta}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_280px] gap-4">
        <div>
          <p className="text-body-lg font-semibold">Start from a template</p>
          <div className="mt-2.5 grid grid-cols-4 gap-2.5">
            {templates.map((template) => (
              <div key={template.name} className="flex items-center gap-2.5 rounded-xl border bg-card p-2.5">
                <span className="icon-chip size-8">
                  <template.icon className="size-4" strokeWidth={1.8} />
                </span>
                <span className="text-caption font-semibold">{template.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-body-lg font-semibold">Recent documents</p>
            <span className="flex items-center gap-1 text-caption text-muted-foreground">
              Last edited <ChevronDown className="size-3.5" />
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-3">
            {recentDocs.map((doc) => (
              <div key={doc.title} className="surface-card flex flex-col p-3.5">
                <div className="flex items-center justify-between">
                  <span className="icon-chip size-7">
                    <FileText className="size-3.5" strokeWidth={1.8} />
                  </span>
                  <Pill tone={doc.status[0]}>{doc.status[1]}</Pill>
                </div>
                <p className="mt-3 text-body font-semibold">{doc.title}</p>
                <p className="mt-1 line-clamp-2 text-caption text-muted-foreground">{doc.excerpt}</p>
                <div className="mt-3 flex items-center justify-between border-t pt-2.5">
                  <span className="text-meta text-muted-foreground">{doc.edited}</span>
                  <AvatarStack people={doc.team} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-body-lg font-semibold">My work</p>
            <span className="text-meta font-semibold text-primary">View all</span>
          </div>
          <div className="mt-3 space-y-2">
            {myWork.map((item) => (
              <div key={item.task} className="flex gap-2.5 rounded-lg border p-2.5">
                <span className="mt-0.5 size-3.5 shrink-0 rounded border-2 border-input" />
                <div className="min-w-0 flex-1">
                  <p className="text-caption font-semibold">{item.task}</p>
                  <p className="truncate text-meta text-muted-foreground">{item.doc}</p>
                </div>
                <Pill tone={item.tone}>{item.due}</Pill>
              </div>
            ))}
          </div>
          <p className="mt-4 text-caption font-semibold">Latest decision</p>
          <div className="mt-2 rounded-lg bg-accent/60 p-2.5">
            <p className="flex items-center gap-1.5 text-caption font-semibold text-accent-foreground">
              <Gavel className="size-3.5" /> Launch moves to Oct 14
            </p>
            <p className="mt-1 text-meta text-muted-foreground">Logged by Arjun · Atlas v2 — Launch plan</p>
          </div>
        </div>
      </div>
    </div>
  </AppWindow>
);

export default DashboardMockup;
