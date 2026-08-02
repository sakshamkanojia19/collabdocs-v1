import { createElement, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell,
  Check,
  CreditCard,
  Info,
  KeyRound,
  LockKeyhole,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  ShieldHalf,
  Sun,
  UserRound
} from 'lucide-react';
import { setTheme } from '../store/themeSlice';
import { PlanPanel, AdminUsersPanel, PricingTiers } from '../components/account/PlanPanel';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { cn } from '@/lib/utils';

const getInitials = (name, email) =>
  (name || email || 'CD')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/** Officevibe-style section: icon chip + heading pair introducing its content. */
const SettingsSection = ({ icon, title, description, children }) => (
  <section className="rise-in">
    <div className="flex items-start gap-3">
      <span className="icon-chip">
        {createElement(icon, { className: 'size-4', strokeWidth: 1.8 })}
      </span>
      <div className="min-w-0">
        <h2 className="text-title-sm font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-body text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor }
];

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, loading, error, entitlements } = useSelector((state) => state.auth);
  const { currentTheme } = useSelector((state) => state.theme);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [documentNotifications, setDocumentNotifications] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = (event) => {
    event.preventDefault();
    setNotice('Profile editing is ready in the interface, but its update API is not connected yet.');
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-4 text-body text-destructive">
          <Info className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          Error loading profile: {error.msg || error.message}
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="p-8 text-body text-muted-foreground">No account data is available.</div>;
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[hsl(var(--workspace))]">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <header>
          <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Workspace settings
          </p>
          <h1 className="mt-1.5 text-title-lg font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Manage your account, preferences, and workspace experience.
          </p>
        </header>

        <div className="mt-8 max-w-3xl space-y-10 pb-10">
          <SettingsSection
            icon={UserRound}
            title="Account"
            description="This information is visible to people you collaborate with."
          >
            <form onSubmit={handleUpdateProfile} className="surface-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-4 border-b pb-5">
                <Avatar className="size-14">
                  <AvatarFallback className="bg-primary/10 text-title-sm font-semibold text-primary">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold">{user.name || 'Your account'}</p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    Image uploads will be available with file storage.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-full" disabled>
                  Upload photo
                </Button>
              </div>

              <div className="grid gap-5 py-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-caption font-medium">
                    Display name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-9 rounded-lg text-body"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="email" className="text-caption font-medium">
                      Email address
                    </Label>
                    <span className="status-pill status-pill--success">Verified</span>
                  </div>
                  <Input id="email" value={email} disabled className="h-9 rounded-lg text-body" />
                  <p className="text-meta text-muted-foreground">
                    Contact an administrator to change your sign-in email.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-caption font-medium">Account role</p>
                  <div>
                    {entitlements?.isSuperAdmin ? (
                      <span className="status-pill status-pill--warning">Super admin</span>
                    ) : (
                      <span className="status-pill status-pill--neutral">Member</span>
                    )}
                  </div>
                </div>
              </div>

              {notice && (
                <div
                  role="status"
                  className="mb-4 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-caption text-warning"
                >
                  <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
                  <span>{notice}</span>
                </div>
              )}

              <div className="flex justify-end border-t pt-4">
                <Button type="submit" className="h-9 rounded-full px-4">
                  Save changes
                </Button>
              </div>
            </form>
          </SettingsSection>

          <SettingsSection
            icon={CreditCard}
            title="Plan & members"
            description="Your plan decides which AI capabilities are available and how many people you can onboard."
          >
            <div className="space-y-4">
              <PlanPanel />
              <PricingTiers />
            </div>
          </SettingsSection>

          {entitlements?.isSuperAdmin && (
            <SettingsSection
              icon={ShieldHalf}
              title="Administration"
              description="Grant Free, Pro, or Team plans to any user. Super-admin only."
            >
              <AdminUsersPanel />
            </SettingsSection>
          )}

          <SettingsSection
            icon={Palette}
            title="Preferences"
            description="Choose how CollabDocs looks on this device."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {themeOptions.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => dispatch(setTheme(theme.value))}
                  className={cn(
                    'surface-card relative p-3 text-left transition-[border-color,box-shadow] duration-control hover:border-foreground/20 hover:shadow-lifted',
                    currentTheme === theme.value && 'border-primary ring-1 ring-primary/25'
                  )}
                >
                  <div className="mb-3 grid h-16 place-items-center rounded-lg border bg-[hsl(var(--workspace))]">
                    <theme.icon className="size-4 text-muted-foreground" strokeWidth={1.8} />
                  </div>
                  <p className="text-body font-medium">{theme.label}</p>
                  {currentTheme === theme.value && (
                    <span className="absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection
            icon={Bell}
            title="Notifications"
            description="Control what appears in your workspace."
          >
            <div className="surface-card divide-y overflow-hidden">
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-body font-semibold">Document activity</p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    Shares, permission changes, and collaboration updates.
                  </p>
                </div>
                <Switch
                  checked={documentNotifications}
                  onCheckedChange={setDocumentNotifications}
                />
              </div>
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-body font-semibold">Email digests</p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    Receive an occasional summary of missed activity.
                  </p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            icon={ShieldCheck}
            title="Security"
            description="Review account access and authentication options."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="setting-tile">
                <span className="icon-chip">
                  <KeyRound className="size-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-body font-semibold">Password</p>
                    <Button variant="outline" size="sm" className="rounded-full" disabled>
                      Change
                    </Button>
                  </div>
                  <p className="mt-1 text-body text-muted-foreground">
                    Password management API is planned for the identity module.
                  </p>
                </div>
              </div>
              <div className="setting-tile">
                <span className="icon-chip">
                  <LockKeyhole className="size-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-body font-semibold">Two-factor authentication</p>
                    <span className="status-pill status-pill--warning">Not enabled</span>
                  </div>
                  <p className="mt-1 text-body text-muted-foreground">
                    Add another layer of protection to your account.
                  </p>
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
