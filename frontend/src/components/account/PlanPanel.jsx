import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Check,
  Loader2,
  LockKeyhole,
  Search,
  Sparkles,
  Trash2,
  UserPlus
} from 'lucide-react';
import api from '../../services/api';
import { refreshAccount } from '../../store/authSlice';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PLAN_TIERS } from '../../lib/plan-tiers';

const PLAN_PILL = {
  free: 'status-pill--neutral',
  pro: 'status-pill--info',
  team: 'status-pill--success'
};

const getInitials = (name, email) =>
  (name || email || 'CD')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const readError = (error) =>
  error.response?.data?.error ||
  error.response?.data?.message ||
  error.message ||
  'Something went wrong';

/**
 * The caller's own plan: tier, seat usage, feature entitlements, and — for
 * Team owners — seat member management. Plans are granted by the platform
 * super admin until self-serve billing exists.
 */
export const PlanPanel = () => {
  const dispatch = useDispatch();
  const { account, entitlements } = useSelector((state) => state.auth);
  const [memberEmail, setMemberEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!account) dispatch(refreshAccount());
  }, [account, dispatch]);

  if (!account || !entitlements) {
    return (
      <div className="surface-card flex items-center gap-2 p-4 text-body text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading plan details…
      </div>
    );
  }

  const providerAI = entitlements.features?.providerAI;
  // Every plan can onboard a team within its seat allowance (Free 3 / Pro 10 /
  // Team 20); only the account owner manages seats.
  const canManageSeats = account.isOwner;
  const seatsFull = account.seatsUsed >= account.seats;

  const submitMember = async (event) => {
    event.preventDefault();
    if (!memberEmail.trim()) return;
    setPending(true);
    setFeedback(null);
    try {
      await api.post('/account/members', { email: memberEmail.trim() });
      setMemberEmail('');
      setFeedback({ tone: 'success', text: 'Seat member added.' });
      dispatch(refreshAccount());
    } catch (error) {
      setFeedback({ tone: 'error', text: readError(error) });
    } finally {
      setPending(false);
    }
  };

  const removeMember = async (memberUserId) => {
    setPending(true);
    setFeedback(null);
    try {
      await api.delete(`/account/members/${memberUserId}`);
      setFeedback({ tone: 'success', text: 'Seat freed.' });
      dispatch(refreshAccount());
    } catch (error) {
      setFeedback({ tone: 'error', text: readError(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <p className="text-body-lg font-semibold">{account.name}</p>
            <span
              className={cn(
                'status-pill',
                entitlements.isSuperAdmin ? 'status-pill--warning' : PLAN_PILL[account.plan]
              )}
            >
              {entitlements.planLabel}
            </span>
          </div>
          <p className="mt-1 text-caption text-muted-foreground">
            {account.seatsUsed} of {account.seats} {account.seats === 1 ? 'seat' : 'seats'} in use
            {account.isOwner ? ' · You own this account' : ' · You occupy a seat'}
          </p>
        </div>
        {!providerAI && (
          <p className="text-caption text-muted-foreground">
            Plans are granted by the platform administrator.
          </p>
        )}
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <div className="flex items-start gap-2.5 rounded-lg border bg-background p-3">
          <span className="icon-chip">
            <Sparkles className="size-4" strokeWidth={1.8} />
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-body font-semibold">
              Everyday AI <Check className="size-3.5 text-success" strokeWidth={2.2} />
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Summaries, mind maps, and action items — included on every plan.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 rounded-lg border bg-background p-3">
          <span className="icon-chip">
            <LockKeyhole className="size-4" strokeWidth={1.8} />
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-body font-semibold">
              Advanced AI
              {providerAI ? (
                <Check className="size-3.5 text-success" strokeWidth={2.2} />
              ) : (
                <span className="status-pill status-pill--warning">Pro & Team</span>
              )}
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Deeper answers with citations, smarter search, and document Q&amp;A.
            </p>
          </div>
        </div>
      </div>

      {canManageSeats && (
        <div className="border-t p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-body font-semibold">Your organization</p>
              <p className="mt-0.5 text-caption text-muted-foreground">
                Onboard teammates into your workspace — they inherit your plan&apos;s
                features, and people search, chat, and sharing only see members of
                your organization.
              </p>
            </div>
            {seatsFull && (
              <span className="status-pill status-pill--warning">All seats in use</span>
            )}
          </div>

          <form onSubmit={submitMember} className="mt-3 flex gap-2">
            <Input
              type="email"
              value={memberEmail}
              onChange={(event) => setMemberEmail(event.target.value)}
              placeholder="teammate@company.com"
              className="h-9 rounded-lg text-body"
              disabled={pending}
            />
            <Button type="submit" className="h-9 shrink-0 gap-1.5 rounded-full px-4" disabled={pending}>
              <UserPlus className="size-3.5" /> Add
            </Button>
          </form>

          <div className="mt-3 space-y-1.5">
            {(account.members || []).length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-center text-caption text-muted-foreground">
                No seat members yet — add a teammate by email.
              </p>
            ) : (
              account.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-meta font-semibold text-primary">
                      {getInitials(member.name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium">{member.name}</p>
                    <p className="truncate text-meta text-muted-foreground">{member.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeMember(member.userId)}
                    disabled={pending}
                    aria-label={`Remove ${member.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className={cn(
            'mx-4 mb-4 rounded-lg px-3 py-2 text-caption sm:mx-5',
            feedback.tone === 'success'
              ? 'bg-success-soft text-success'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
};

/** Side-by-side plan comparison used in Settings (and mirrored on the landing page). */
export const PricingTiers = () => {
  const { account, entitlements } = useSelector((state) => state.auth);
  const [notice, setNotice] = useState('');
  const currentPlan = account?.plan || 'free';

  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-3">
        {PLAN_TIERS.map((tier) => {
          const isCurrent = currentPlan === tier.id;
          return (
            <div
              key={tier.id}
              className={cn(
                'surface-card relative flex flex-col p-5',
                tier.highlight && 'border-primary/40 ring-1 ring-primary/20'
              )}
            >
              {tier.highlight && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2.5 py-0.5 text-meta font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="text-body-lg font-semibold">{tier.name}</p>
                <span className="status-pill status-pill--neutral">{tier.seats}</span>
              </div>
              <p className="mt-2 text-title-lg font-semibold tracking-tight">
                {tier.price}
                <span className="ml-1.5 text-meta font-normal text-muted-foreground">
                  {tier.period}
                </span>
              </p>
              <p className="mt-2 text-caption text-muted-foreground">{tier.tagline}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-caption">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={2.2} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={tier.highlight && !isCurrent ? 'default' : 'outline'}
                className="mt-5 h-9 w-full rounded-full"
                disabled={isCurrent}
                onClick={() =>
                  setNotice(
                    entitlements?.isSuperAdmin
                      ? 'You are the platform administrator — grant plans from the Administration panel below.'
                      : `To move to ${tier.name}, ask your platform administrator for an upgrade. Self-serve billing is coming soon.`
                  )
                }
              >
                {isCurrent ? 'Current plan' : `Request ${tier.name}`}
              </Button>
            </div>
          );
        })}
      </div>
      {notice && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-info-soft px-3 py-2 text-caption text-info"
        >
          {notice}
        </p>
      )}
    </div>
  );
};

/**
 * Super-admin console: find any user and grant a plan (with seats for Team).
 * Rendered only when the signed-in user is a platform super admin; the
 * backend enforces the same rule independently.
 */
export const AdminUsersPanel = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [drafts, setDrafts] = useState({});

  const loadUsers = async (term = '') => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users', {
        params: term ? { query: term } : {}
      });
      setUsers(response.data.users || []);
    } catch (error) {
      setFeedback({ tone: 'error', text: readError(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const draftFor = (row) => drafts[row.id] || { plan: row.plan, seats: row.seats };

  const applyPlan = async (row) => {
    const draft = draftFor(row);
    setFeedback(null);
    try {
      await api.patch(`/admin/users/${row.id}/plan`, {
        plan: draft.plan,
        ...(draft.plan === 'team' ? { seats: Number(draft.seats) || 20 } : {})
      });
      setFeedback({ tone: 'success', text: `${row.name} is now on the ${draft.plan} plan.` });
      loadUsers(query);
      if (row.id === user?.id || row.id === user?._id) dispatch(refreshAccount());
    } catch (error) {
      setFeedback({ tone: 'error', text: readError(error) });
    }
  };

  return (
    <div className="surface-card overflow-hidden">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          loadUsers(query);
        }}
        className="flex gap-2 border-b p-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users by name or email"
            className="h-9 rounded-lg pl-8 text-body"
          />
        </div>
        <Button type="submit" variant="outline" className="h-9 rounded-full px-4">
          Search
        </Button>
      </form>

      {loading ? (
        <p className="flex items-center gap-2 p-4 text-body text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading users…
        </p>
      ) : users.length === 0 ? (
        <p className="p-4 text-body text-muted-foreground">No users match that search.</p>
      ) : (
        <div className="divide-y">
          {users.map((row) => {
            const draft = draftFor(row);
            return (
              <div key={row.id} className="flex flex-wrap items-center gap-3 p-4">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-meta font-semibold text-primary">
                    {getInitials(row.name, row.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-body font-medium">
                    {row.name}
                    {row.isSuperAdmin && (
                      <span className="status-pill status-pill--warning">Super admin</span>
                    )}
                  </p>
                  <p className="truncate text-meta text-muted-foreground">
                    {row.email} · {row.seatsUsed}/{row.seats} seats
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={draft.plan}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.id]: { ...draft, plan: event.target.value }
                      }))
                    }
                    className="h-8 rounded-lg border border-input bg-background px-2 text-caption"
                    aria-label={`Plan for ${row.name}`}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="team">Team</option>
                  </select>
                  {draft.plan === 'team' && (
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={draft.seats}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: { ...draft, seats: event.target.value }
                        }))
                      }
                      className="h-8 w-20 rounded-lg text-caption"
                      aria-label={`Seats for ${row.name}`}
                    />
                  )}
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => applyPlan(row)}
                    disabled={draft.plan === row.plan && Number(draft.seats) === row.seats}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className={cn(
            'mx-4 mb-4 rounded-lg px-3 py-2 text-caption',
            feedback.tone === 'success'
              ? 'bg-success-soft text-success'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
};
