import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FilePlus2,
  Files,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Share2,
  Sparkles,
  Sun,
  UserPlus,
  UserRound,
  UsersRound,
  WandSparkles
} from 'lucide-react';
import { logout } from '../../store/authSlice';
import { setTheme } from '../../store/themeSlice';
import { fetchNotifications, markNotificationRead } from '../../store/notificationSlice';
import {
  fetchChatNotifications,
  markChatNotificationRead,
  openChatPanel,
  setActiveChatGroup
} from '../../store/chatSlice';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from '../ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '../ui/sheet';
import { cn } from '../../lib/utils';
import CollabDocsLogo from '../brand/CollabDocsLogo';

const ChatSidebar = lazy(() => import('../chat/ChatSidebar'));

const getInitials = (name, email) =>
  (name || email || 'CollabDocs')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const primaryItems = [
  { label: 'Home', icon: Home, href: '/dashboard', key: 'home' },
  { label: 'My documents', icon: Files, href: '/documents', key: 'mine' },
  { label: 'Shared with me', icon: Share2, href: '/shared', key: 'shared' },
  { label: 'Messages', icon: MessageCircle, href: '/messages', key: 'messages' }
];

const intelligenceItems = [
  { label: 'Mind maps', icon: Network, href: '/mind-maps' },
  { label: 'AI workspace', icon: WandSparkles, href: '/ai' }
];

const WorkspaceShell = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('cd:sidebar-collapsed') === '1'
  );

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      window.localStorage.setItem('cd:sidebar-collapsed', prev ? '0' : '1');
      return !prev;
    });
  };

  const { user, account, entitlements } = useSelector((state) => state.auth);
  const { currentTheme } = useSelector((state) => state.theme);
  const { documents } = useSelector((state) => state.document);
  const { items: notifications, loading: notificationsLoading } = useSelector(
    (state) => state.notifications
  );
  const { groups: chatGroups, notifications: chatNotifications } = useSelector(
    (state) => state.chat
  );

  const unreadDocuments = notifications.filter((item) => item.status === 'pending').length;
  const unreadChats = chatNotifications.filter((item) => item.status !== 'read').length;

  const chatBadgeCount = useMemo(() => {
    const unreadGroups = chatGroups.reduce((count, group) => {
      if (!group?.lastMessage) return count;
      const membership = group.participants?.find(
        (participant) => participant.userId === user?.id
      );
      const lastReadAt = membership?.lastReadAt ? new Date(membership.lastReadAt) : null;
      const lastSentAt = group.lastMessage?.sentAt ? new Date(group.lastMessage.sentAt) : null;
      return lastSentAt && (!lastReadAt || lastSentAt > lastReadAt) ? count + 1 : count;
    }, 0);
    return unreadGroups + unreadChats;
  }, [chatGroups, unreadChats, user?.id]);

  const recentDocuments = useMemo(
    () =>
      [...documents]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 12),
    [documents]
  );

  useEffect(() => {
    dispatch(fetchNotifications());
    dispatch(fetchChatNotifications());
    const interval = window.setInterval(() => {
      dispatch(fetchNotifications());
      dispatch(fetchChatNotifications());
    }, 30000);
    return () => window.clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'n' &&
        !location.pathname.startsWith('/document/')
      ) {
        event.preventDefault();
        navigate('/dashboard?create=1');
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [location.pathname, navigate]);

  const goTo = (href) => {
    navigate(href);
    setMobileNavOpen(false);
    setCommandOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navItemClass = (isActive) =>
    cn(
      'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body transition-colors duration-control',
      isActive
        ? 'bg-accent font-medium text-accent-foreground'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
    );

  const countBadge = (count) => (
    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-meta font-semibold text-primary-foreground">
      {count > 99 ? '99+' : count}
    </span>
  );

  const renderNavigation = () => (
    <div className="flex h-full min-h-0 flex-col bg-[hsl(var(--sidebar))]">
      <div className="flex h-14 items-center justify-between px-3">
        <button
          type="button"
          onClick={() => goTo('/dashboard')}
          className="flex min-w-0 items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors duration-control hover:bg-secondary"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-caption font-bold text-primary-foreground">
            CD
          </span>
          <span className="min-w-0">
            <span className="block truncate text-body font-semibold">
              {account?.name || 'CollabDocs'}
            </span>
            <span className="block truncate text-meta text-muted-foreground">
              {entitlements?.planLabel
                ? `${entitlements.planLabel} plan${
                    account?.plan === 'team' ? ` · ${account.seatsUsed}/${account.seats} seats` : ''
                  }`
                : 'Personal workspace'}
            </span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation"
        >
          <PanelLeftClose className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden size-8 text-muted-foreground lg:inline-flex"
          onClick={toggleSidebar}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="size-4" />
        </Button>
      </div>

      <div className="px-3 pb-1">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="flex h-9 w-full items-center gap-2 rounded-lg border bg-background px-2.5 text-body text-muted-foreground shadow-raised transition-colors duration-control hover:border-input"
        >
          <Search className="size-3.5" />
          <span className="flex-1 truncate text-left">Search…</span>
          <kbd className="rounded border bg-secondary px-1.5 py-0.5 font-sans text-meta font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </button>
      </div>

      <nav
        className="workspace-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-4"
        aria-label="Workspace"
      >
        <p className="mb-1.5 px-2 pt-4 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Workspace
        </p>
        <div className="space-y-0.5">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => goTo(item.href)}
                className={navItemClass(isActive)}
              >
                <Icon className="size-4" strokeWidth={1.8} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.key === 'shared' && unreadDocuments > 0 && countBadge(unreadDocuments)}
                {item.key === 'messages' && chatBadgeCount > 0 && countBadge(chatBadgeCount)}
              </button>
            );
          })}
        </div>

        <p className="mb-1.5 px-2 pt-6 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Intelligence
        </p>
        <div className="space-y-0.5">
          {intelligenceItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => goTo(item.href)}
              className={navItemClass(location.pathname === item.href)}
            >
              <item.icon className="size-4" strokeWidth={1.8} />
              <span className="flex-1">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mb-1.5 flex items-center justify-between px-2 pt-6">
          <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Recent
          </p>
          <Clock3 className="size-3 text-muted-foreground/70" />
        </div>
        <div className="workspace-scrollbar max-h-32 space-y-0.5 overflow-y-auto pr-1">
          {recentDocuments.length > 0 ? (
            recentDocuments.map((document) => (
              <button
                key={document._id}
                type="button"
                onClick={() => goTo(`/document/${document._id}`)}
                className={cn(
                  'flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body transition-colors duration-control',
                  location.pathname === `/document/${document._id}`
                    ? 'bg-secondary font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Files className="size-3.5 shrink-0 text-muted-foreground/70" strokeWidth={1.8} />
                <span className="truncate">{document.title || 'Untitled document'}</span>
              </button>
            ))
          ) : (
            <p className="px-2 py-2 text-caption leading-5 text-muted-foreground">
              Your recently edited documents will appear here.
            </p>
          )}
        </div>

        <p className="mb-1.5 px-2 pt-6 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Manage
        </p>
        <button
          type="button"
          onClick={() => goTo('/settings')}
          className={navItemClass(['/profile', '/settings'].includes(location.pathname))}
        >
          <Settings2 className="size-4" strokeWidth={1.8} />
          Settings
        </button>
      </nav>

      <div className="mx-3 mb-3 rounded-xl border bg-card p-3.5 shadow-raised">
        <div className="flex items-center gap-2.5">
          <span className="icon-chip">
            <UsersRound className="size-4" />
          </span>
          <div>
            <p className="text-body font-semibold">Build your team</p>
            <p className="mt-0.5 text-meta text-muted-foreground">Collaborate in real time</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="mt-3 h-8 w-full gap-2 rounded-lg text-caption"
          onClick={() => goTo('/settings')}
        >
          <UserPlus className="size-3.5" /> Invite members
        </Button>
      </div>

      <div className="border-t px-3 py-2">
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body text-muted-foreground transition-colors duration-control hover:bg-secondary hover:text-foreground"
        >
          <CircleHelp className="size-4" strokeWidth={1.8} />
          Help & shortcuts
        </button>
      </div>
    </div>
  );

  const renderCollapsedRail = () => (
    <div className="flex h-full flex-col items-center gap-1 bg-[hsl(var(--sidebar))] py-3">
      <button
        type="button"
        onClick={() => goTo('/dashboard')}
        className="mb-1 grid size-8 place-items-center rounded-lg bg-primary text-caption font-bold text-primary-foreground"
        aria-label="CollabDocs home"
        title="CollabDocs"
      >
        CD
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-lg text-muted-foreground"
        onClick={toggleSidebar}
        aria-label="Expand sidebar"
        title="Expand sidebar"
      >
        <PanelLeftOpen className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-lg text-muted-foreground"
        onClick={() => setCommandOpen(true)}
        aria-label="Search"
        title="Search (Ctrl K)"
      >
        <Search className="size-4" />
      </Button>
      <div className="my-1 h-px w-8 bg-border" />
      {[...primaryItems, ...intelligenceItems].map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        const showDot =
          (item.key === 'shared' && unreadDocuments > 0) ||
          (item.key === 'messages' && chatBadgeCount > 0);
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => goTo(item.href)}
            className={cn(
              'relative grid size-9 place-items-center rounded-lg transition-colors duration-control',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
            aria-label={item.label}
            title={item.label}
          >
            <Icon className="size-4" strokeWidth={1.8} />
            {showDot && (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
      <div className="mt-auto flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => goTo('/settings')}
          className={cn(
            'grid size-9 place-items-center rounded-lg transition-colors duration-control',
            ['/profile', '/settings'].includes(location.pathname)
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
          aria-label="Settings"
          title="Settings"
        >
          <Settings2 className="size-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--workspace))]">
      <header
        className={cn(
          'fixed left-0 right-0 top-0 z-50 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur-xl sm:px-4',
          sidebarCollapsed ? 'lg:left-[60px]' : 'lg:left-64'
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-lg lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open workspace navigation"
        >
          <Menu className="size-4" />
        </Button>

        <CollabDocsLogo to="/dashboard" className="lg:hidden" />

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="mx-auto hidden h-9 w-full min-w-0 max-w-[420px] items-center gap-2 rounded-full border bg-[hsl(var(--workspace))] px-3.5 text-left text-body text-muted-foreground transition-colors duration-control hover:border-input hover:bg-background md:flex"
        >
          <Search className="size-4" />
          <span className="flex-1 truncate">Search documents, people, or actions</span>
          <kbd className="rounded-md border bg-background px-1.5 py-0.5 font-sans text-meta font-medium">
            Ctrl K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button
            className="mr-1 hidden h-9 gap-2 rounded-full px-4 text-body font-medium shadow-raised sm:inline-flex"
            onClick={() => goTo('/dashboard?create=1')}
          >
            <FilePlus2 className="size-3.5" /> New document
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="hidden size-9 rounded-lg text-muted-foreground sm:inline-flex"
            aria-label="Help"
          >
            <CircleHelp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-9 rounded-lg text-muted-foreground sm:inline-flex"
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <Settings2 className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative size-9 rounded-lg text-muted-foreground"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                {unreadDocuments + unreadChats > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[min(380px,calc(100vw-24px))] p-1">
              <div className="flex items-center justify-between px-2 py-2">
                <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                <Badge variant="secondary" className="rounded-full text-meta">
                  {unreadDocuments + unreadChats} new
                </Badge>
              </div>
              <DropdownMenuSeparator />
              {notificationsLoading ? (
                <p className="px-3 py-8 text-center text-body text-muted-foreground">
                  Loading notifications...
                </p>
              ) : notifications.length + chatNotifications.length === 0 ? (
                <p className="px-3 py-8 text-center text-body text-muted-foreground">
                  You are all caught up.
                </p>
              ) : (
                <>
                  {notifications.slice(0, 4).map((notification) => (
                    <DropdownMenuItem
                      key={notification._id}
                      className="items-start gap-2.5 py-2.5"
                      onSelect={() => {
                        dispatch(markNotificationRead(notification._id));
                        if (notification.documentId) {
                          navigate(`/document/${notification.documentId}`);
                        }
                      }}
                    >
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="min-w-0">
                        <span className="block text-body font-medium">
                          {notification.title || 'Document update'}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-caption text-muted-foreground">
                          {notification.message}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                  {chatNotifications.slice(0, 3).map((notification) => (
                    <DropdownMenuItem
                      key={notification._id}
                      className="items-start gap-2.5 py-2.5"
                      onSelect={() => {
                        dispatch(markChatNotificationRead(notification._id));
                        if (notification.groupId) dispatch(setActiveChatGroup(notification.groupId));
                        dispatch(openChatPanel());
                      }}
                    >
                      <MessageCircle className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block text-body font-medium">
                          {notification.title || 'New message'}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-caption text-muted-foreground">
                          {notification.message}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors duration-control hover:bg-secondary"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/10 text-meta font-semibold text-primary">
                    {getInitials(user?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="hidden size-3 text-muted-foreground sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate text-body">{user?.name || 'Your account'}</span>
                <span className="block truncate text-meta font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/profile')}>
                <UserRound className="mr-2 size-4" />
                Account settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-meta font-medium text-muted-foreground">
                Appearance
              </DropdownMenuLabel>
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Sparkles }
              ].map((theme) => (
                <DropdownMenuItem
                  key={theme.value}
                  onSelect={() => dispatch(setTheme(theme.value))}
                >
                  <theme.icon className="mr-2 size-4" />
                  {theme.label}
                  {currentTheme === theme.value && <Check className="ml-auto size-4" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={handleLogout}
              >
                <LogOut className="mr-2 size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r transition-[width] duration-panel ease-emphasis lg:block',
          sidebarCollapsed ? 'w-[60px]' : 'w-64'
        )}
      >
        {sidebarCollapsed ? renderCollapsedRail() : renderNavigation()}
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[286px] gap-0 p-0 sm:max-w-[286px] [&>button]:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Workspace navigation</SheetTitle>
            <SheetDescription>Navigate documents, messages, and settings.</SheetDescription>
          </SheetHeader>
          {renderNavigation()}
        </SheetContent>
      </Sheet>

      <div className={cn('min-w-0 pt-14', sidebarCollapsed ? 'lg:pl-[60px]' : 'lg:pl-64')}>
        <main>
          <Outlet />
        </main>
      </div>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search documents or run an action..." />
        <CommandList>
          <CommandEmpty>No matching documents or actions.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => goTo('/dashboard?create=1')}>
              <FilePlus2 className="mr-2 size-4" />
              Create a new document
              <CommandShortcut>Ctrl N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => goTo('/messages')}>
              <MessageCircle className="mr-2 size-4" />
              Open messages
            </CommandItem>
            <CommandItem onSelect={() => goTo('/mind-maps')}>
              <Network className="mr-2 size-4" />
              Browse mind maps
            </CommandItem>
            <CommandItem onSelect={() => goTo('/ai')}>
              <WandSparkles className="mr-2 size-4" />
              Open AI workspace
            </CommandItem>
            <CommandItem onSelect={() => goTo('/settings')}>
              <Settings2 className="mr-2 size-4" />
              Workspace settings
            </CommandItem>
          </CommandGroup>
          {documents.length > 0 && (
            <CommandGroup heading="Documents">
              {documents.slice(0, 12).map((document) => (
                <CommandItem
                  key={document._id}
                  value={`${document.title} ${document.owner?.name || ''}`}
                  onSelect={() => goTo(`/document/${document._id}`)}
                >
                  <Files className="mr-2 size-4" />
                  <span className="truncate">{document.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      <Suspense fallback={null}>
        <ChatSidebar />
      </Suspense>
    </div>
  );
};

export default WorkspaceShell;
