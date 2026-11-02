import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';
import { Check, Gavel, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/document-display';
import api from '../../services/api';

const COLLAPSED_COUNT = 4;

const dueTone = (dueDate) => {
  if (!dueDate) return null;
  if (/today|overdue|asap/i.test(dueDate)) return 'warning';
  if (/tomorrow/i.test(dueDate)) return 'info';
  return 'neutral';
};

/**
 * Dashboard rail: open action items (yours first, then unassigned) and the
 * latest logged decision. Items and decisions are loaded by the dashboard so
 * the stat tiles and this panel always agree.
 */
const MyWorkSection = ({ items, onItemsChange, latestDecision, documentTitles, loading }) => {
  const { user } = useSelector((state) => state.auth);
  const [busyId, setBusyId] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const ordered = useMemo(() => {
    const mine = items.filter((item) => item.assignee?.userId === user?.id);
    const rest = items.filter((item) => item.assignee?.userId !== user?.id);
    return [...mine, ...rest];
  }, [items, user?.id]);
  const visible = expanded ? ordered : ordered.slice(0, COLLAPSED_COUNT);

  const complete = async (itemId) => {
    setBusyId(itemId);
    try {
      await api.patch(`/ai/action-items/${itemId}`, { status: 'done' });
      onItemsChange(items.filter((item) => item.id !== itemId));
    } catch {
      // Leaving the item in place is the correct outcome when the update fails.
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section id="my-work" aria-labelledby="work-heading" className="surface-card scroll-mt-20 p-4">
      <div className="flex items-center justify-between">
        <h2 id="work-heading" className="text-body-lg font-semibold">
          My work
        </h2>
        {ordered.length > COLLAPSED_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-caption font-semibold text-primary transition-colors duration-control hover:text-primary/80"
          >
            {expanded ? 'Show less' : `View all ${ordered.length}`}
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-lg border bg-secondary/40" />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed px-4 py-6 text-center">
          <span className="icon-chip mx-auto">
            <ListChecks className="size-4" strokeWidth={1.8} />
          </span>
          <p className="mt-2 text-body font-semibold">No open work</p>
          <p className="mt-0.5 text-caption text-muted-foreground">
            Action items extracted from your documents appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((item) => {
            const tone = dueTone(item.dueDate);
            const isMine = item.assignee?.userId === user?.id;
            return (
              <li key={item.id} className="flex items-start gap-2.5 rounded-lg border p-3 transition-colors duration-control hover:bg-secondary/40">
                <button
                  type="button"
                  onClick={() => complete(item.id)}
                  disabled={busyId === item.id}
                  aria-label={`Mark “${item.task}” done`}
                  title="Mark done"
                  className={cn(
                    'mt-0.5 grid size-4 shrink-0 place-items-center rounded border-2 border-input transition-colors duration-control hover:border-success',
                    busyId === item.id && 'border-success bg-success text-primary-foreground'
                  )}
                >
                  {busyId === item.id && <Check className="size-3" strokeWidth={3} />}
                </button>
                <Link to={`/document/${item.documentId}`} className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-foreground">{item.task}</span>
                  <span className="mt-0.5 block truncate text-caption text-muted-foreground">
                    {isMine ? 'Yours · ' : item.suggestedOwner ? `${item.suggestedOwner} · ` : ''}
                    {documentTitles.get(item.documentId) || 'Document'}
                  </span>
                </Link>
                {tone && <span className={`status-pill status-pill--${tone} shrink-0`}>{item.dueDate}</span>}
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="mt-5 text-body font-semibold">Latest decision</h3>
      {latestDecision ? (
        <Link
          to={`/document/${latestDecision.documentId}`}
          className="mt-2 block rounded-lg bg-accent/60 p-3 transition-colors duration-control hover:bg-accent"
        >
          <span className="flex items-center gap-1.5 text-body font-semibold text-accent-foreground">
            <Gavel className="size-3.5 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{latestDecision.summary}</span>
          </span>
          <span className="mt-1 block truncate text-caption text-muted-foreground">
            Logged by {latestDecision.markedBy?.name || 'a teammate'} · {latestDecision.documentTitle} ·{' '}
            {formatRelativeDate(latestDecision.markedAt)}
          </span>
        </Link>
      ) : (
        <p className="mt-2 rounded-lg bg-secondary/60 p-3 text-caption text-muted-foreground">
          No decisions yet. Mark a message as a decision in any document conversation to log it here.
        </p>
      )}
    </section>
  );
};

export default MyWorkSection;
