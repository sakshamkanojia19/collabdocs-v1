import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';
import { ArrowUpRight, CheckCircle2, Circle, CircleDashed, Clock3, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '../../services/api';

const STATUS_ICON = {
  open: Circle,
  in_progress: CircleDashed
};

/**
 * Workspace-level view of extracted work. Items assigned to the current user come
 * first, because "what do I owe" is the question the dashboard should answer.
 */
const MyWorkSection = () => {
  const { user } = useSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/ai/action-items?status=open&limit=50')
      .then((response) => {
        if (!cancelled) setItems(response.data?.actionItems || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { mine, unassigned } = useMemo(
    () => ({
      mine: items.filter((item) => item.assignee?.userId === user?.id),
      unassigned: items.filter((item) => !item.assignee)
    }),
    [items, user?.id]
  );

  const complete = async (itemId) => {
    setBusyId(itemId);
    try {
      await api.patch(`/ai/action-items/${itemId}`, { status: 'done' });
      setItems((current) => current.filter((item) => item.id !== itemId));
    } catch {
      // Leaving the item in place is the correct outcome when the update fails.
    } finally {
      setBusyId(null);
    }
  };

  if (loading || items.length === 0) {
    return null;
  }

  const visible = [...mine, ...unassigned.filter((item) => !mine.includes(item))].slice(0, 6);

  return (
    <section aria-labelledby="work-heading" className="surface-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="icon-chip">
          <ListChecks className="size-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h3 id="work-heading" className="text-body font-semibold">
            Open work
          </h3>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {mine.length > 0
              ? `${mine.length} assigned to you · ${unassigned.length} unassigned`
              : `${unassigned.length} unassigned across your documents`}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {visible.map((item) => {
          const StatusIcon = STATUS_ICON[item.status] || Circle;
          const isMine = item.assignee?.userId === user?.id;
          return (
            <li
              key={item.id}
              className="group/work flex items-start gap-2.5 rounded-lg border bg-background p-2.5 transition-colors duration-control hover:bg-secondary/40"
            >
              <button
                type="button"
                onClick={() => complete(item.id)}
                disabled={busyId === item.id}
                className={cn(
                  'mt-0.5 shrink-0 text-muted-foreground transition-colors duration-control hover:text-success',
                  item.status === 'in_progress' && 'text-warning'
                )}
                title="Mark done"
              >
                {busyId === item.id ? (
                  <CheckCircle2 className="size-4 text-success" strokeWidth={1.8} />
                ) : (
                  <StatusIcon className="size-4" strokeWidth={1.8} />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-body">{item.task}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-meta text-muted-foreground">
                  {isMine ? (
                    <span className="status-pill status-pill--info">Yours</span>
                  ) : item.status === 'in_progress' ? (
                    <span className="status-pill status-pill--warning">
                      {item.suggestedOwner || 'In progress'}
                    </span>
                  ) : (
                    <span className="status-pill status-pill--neutral">
                      {item.suggestedOwner || 'Unassigned'}
                    </span>
                  )}
                  {item.dueDate && (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" strokeWidth={1.8} /> {item.dueDate}
                    </span>
                  )}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 rounded-lg opacity-0 transition-opacity duration-control focus-visible:opacity-100 group-hover/work:opacity-100"
                asChild
                title="Open source document"
              >
                <Link to={`/document/${item.documentId}`}>
                  <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default MyWorkSection;
