import {
  Bell,
  CircleHelp,
  FileText,
  Files,
  Home,
  MessageCircle,
  Network,
  Plus,
  Search,
  Settings,
  Share2,
  WandSparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Avatar tints come from semantic tokens so mockups track both themes.
const AVATAR_TONES = {
  primary: 'bg-primary/15 text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info'
};

export const MockAvatar = ({ initials, tone = 'primary', size = 'md', className }) => (
  <span
    className={cn(
      'grid shrink-0 place-items-center rounded-full font-semibold ring-2 ring-card',
      size === 'sm' ? 'size-7 text-meta' : size === 'lg' ? 'size-8 text-caption' : 'size-7 text-meta',
      AVATAR_TONES[tone],
      className
    )}
  >
    {initials}
  </span>
);

export const AvatarStack = ({ people, size }) => (
  <div className="flex -space-x-1.5">
    {people.map((person) => (
      <MockAvatar key={person.initials} {...person} size={size} />
    ))}
  </div>
);

const workspaceNav = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'mine', label: 'My documents', icon: Files },
  { key: 'shared', label: 'Shared with me', icon: Share2 },
  { key: 'messages', label: 'Messages', icon: MessageCircle, badge: '3' }
];

const intelligenceNav = [
  { key: 'mind-maps', label: 'Mind maps', icon: Network },
  { key: 'ai', label: 'AI workspace', icon: WandSparkles }
];

const NavRow = ({ item, active }) => (
  <div
    className={cn(
      'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-body',
      active ? 'bg-accent font-semibold text-accent-foreground' : 'text-muted-foreground'
    )}
  >
    <item.icon className="size-4" strokeWidth={1.8} />
    <span className="flex-1">{item.label}</span>
    {item.badge && (
      <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-meta font-semibold text-primary-foreground">
        {item.badge}
      </span>
    )}
  </div>
);

/**
 * A faithful miniature of WorkspaceShell — browser chrome, sidebar, top bar —
 * wrapping whichever module a mockup shows.
 */
const AppWindow = ({ active = 'home', path = 'dashboard', sidebar = true, children }) => (
  <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card text-foreground">
    <div className="flex h-9 shrink-0 items-center gap-3 border-b bg-secondary/60 px-3.5">
      <div className="flex gap-1.5">
        <span className="size-2.5 rounded-full bg-destructive/70" />
        <span className="size-2.5 rounded-full bg-warning/70" />
        <span className="size-2.5 rounded-full bg-success/70" />
      </div>
      <div className="mx-auto flex h-6 w-[340px] items-center justify-center gap-1.5 rounded-md bg-background text-meta text-muted-foreground">
        <span className="size-1.5 rounded-full bg-success" />
        app.collabdocs.app/{path}
      </div>
      <span className="w-[42px]" />
    </div>

    <div className="flex min-h-0 flex-1">
      {sidebar && (
        <aside className="flex w-[220px] shrink-0 flex-col border-r bg-[hsl(var(--sidebar))] p-3">
          <div className="flex items-center gap-2 px-1.5 py-1">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="size-3.5" strokeWidth={2.2} />
            </span>
            <div className="leading-tight">
              <p className="text-body font-semibold">Northwind Labs</p>
              <p className="text-meta text-muted-foreground">Pro workspace</p>
            </div>
          </div>
          <div className="mt-3 flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary text-caption font-semibold text-primary-foreground">
            <Plus className="size-3.5" /> New document
          </div>
          <p className="mb-1.5 mt-5 px-2.5 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
            Workspace
          </p>
          <div className="space-y-0.5">
            {workspaceNav.map((item) => (
              <NavRow key={item.key} item={item} active={item.key === active} />
            ))}
          </div>
          <p className="mb-1.5 mt-5 px-2.5 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
            Intelligence
          </p>
          <div className="space-y-0.5">
            {intelligenceNav.map((item) => (
              <NavRow key={item.key} item={item} active={item.key === active} />
            ))}
          </div>
          <p className="mb-1.5 mt-5 px-2.5 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
            Recent
          </p>
          <div className="space-y-0.5">
            {['Atlas v2 — Launch plan', 'Weekly product sync', 'Customer interview notes'].map((title) => (
              <div key={title} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1 text-caption text-muted-foreground">
                <Files className="size-3.5 shrink-0 opacity-70" strokeWidth={1.8} />
                <span className="truncate">{title}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-caption font-semibold">Pro plan</p>
              <span className="text-meta text-muted-foreground">4 of 10 seats</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-[40%] rounded-full bg-primary" />
            </div>
            <p className="mt-1.5 text-meta font-semibold text-primary">Invite teammates</p>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-5">
          <div className="flex h-8 w-[300px] items-center gap-2 rounded-lg bg-secondary px-3 text-caption text-muted-foreground">
            <Search className="size-3.5" />
            Search docs, decisions, people
            <span className="ml-auto rounded border bg-card px-1 text-meta font-medium">⌘K</span>
          </div>
          <div className="ml-auto flex items-center gap-3 text-muted-foreground">
            <CircleHelp className="size-4" strokeWidth={1.8} />
            <Settings className="size-4" strokeWidth={1.8} />
            <span className="relative">
              <Bell className="size-4" strokeWidth={1.8} />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-card" />
            </span>
            <MockAvatar initials="RS" size="lg" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden bg-[hsl(var(--workspace))]">{children}</div>
      </div>
    </div>
  </div>
);

export default AppWindow;
