import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  CircleDashed,
  Clock3,
  ListChecks,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import api from '../../services/api';
import { getKnowledgeError } from '../../lib/knowledge-errors';

const STATUS_ORDER = ['open', 'in_progress', 'done', 'dismissed'];

const STATUS_META = {
  open: { label: 'To do', icon: Circle, tone: 'text-muted-foreground', pill: 'status-pill--neutral' },
  in_progress: {
    label: 'In progress',
    icon: CircleDashed,
    tone: 'text-warning',
    pill: 'status-pill--warning'
  },
  done: { label: 'Done', icon: CheckCircle2, tone: 'text-success', pill: 'status-pill--success' },
  dismissed: { label: 'Dismissed', icon: X, tone: 'text-muted-foreground', pill: 'status-pill--neutral' }
};

/**
 * Turns the extracted {task, owner, dueDate} the summary engine already produces
 * into work that can be assigned and completed, without losing the link back to
 * the document that produced it.
 */
const ActionItemsPanel = ({ documentId, canEdit, participants = [] }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/ai/documents/${documentId}/action-items`);
      setItems(response.data?.actionItems || []);
    } catch (requestError) {
      setError(getKnowledgeError(requestError, 'Action items could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  const extractFromSummary = async () => {
    setSyncing(true);
    setError('');
    try {
      const response = await api.post(`/ai/documents/${documentId}/action-items/sync`);
      setItems(response.data?.items || []);
      if ((response.data?.created || 0) === 0 && (response.data?.updated || 0) === 0) {
        setError('No new action items were found. Generate a summary first, or add one manually.');
      }
    } catch (requestError) {
      setError(getKnowledgeError(requestError, 'Action items could not be extracted.'));
    } finally {
      setSyncing(false);
    }
  };

  const patchItem = async (itemId, changes) => {
    // Optimistic: work tracking should feel instant, and a failure reloads truth.
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...changes } : item))
    );
    try {
      const response = await api.patch(`/ai/action-items/${itemId}`, changes);
      setItems((current) =>
        current.map((item) => (item.id === itemId ? response.data.actionItem : item))
      );
    } catch (requestError) {
      setError(getKnowledgeError(requestError, 'That change could not be saved.'));
      load();
    }
  };

  const removeItem = async (itemId) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
    try {
      await api.delete(`/ai/action-items/${itemId}`);
    } catch (requestError) {
      setError(getKnowledgeError(requestError, 'That item could not be removed.'));
      load();
    }
  };

  const addItem = async (event) => {
    event.preventDefault();
    const task = draft.trim();
    if (task.length < 3) return;
    setError('');
    try {
      const response = await api.post(`/ai/documents/${documentId}/action-items`, { task });
      setItems((current) => [response.data.actionItem, ...current]);
      setDraft('');
    } catch (requestError) {
      setError(getKnowledgeError(requestError, 'That item could not be added.'));
    }
  };

  const { visible, openCount, doneCount } = useMemo(() => {
    const sorted = [...items].sort(
      (left, right) => STATUS_ORDER.indexOf(left.status) - STATUS_ORDER.indexOf(right.status)
    );
    return {
      visible: showDone
        ? sorted
        : sorted.filter((item) => item.status === 'open' || item.status === 'in_progress'),
      openCount: items.filter((item) => item.status === 'open' || item.status === 'in_progress')
        .length,
      doneCount: items.filter((item) => item.status === 'done').length
    };
  }, [items, showDone]);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="icon-chip size-8">
            <ListChecks className="size-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-body font-semibold">Action items</p>
            <p className="mt-0.5 text-meta text-muted-foreground">
              {openCount} open · {doneCount} done
            </p>
          </div>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0 gap-1.5 rounded-full px-2.5 text-caption"
            onClick={extractFromSummary}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Sparkles className="size-3" strokeWidth={1.8} />
            )}
            Extract
          </Button>
        )}
      </div>

      {canEdit && (
        <form onSubmit={addItem} className="mt-3 flex gap-1.5">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add an action item"
            aria-label="Add an action item"
            className="h-8 rounded-lg text-body"
          />
          <Button
            type="submit"
            size="icon"
            className="size-8 shrink-0 rounded-lg"
            disabled={draft.trim().length < 3}
            title="Add action item"
          >
            <Plus className="size-3.5" />
          </Button>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2.5 rounded-lg border border-warning/25 bg-warning-soft px-2.5 py-2 text-caption text-warning"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="flex items-center justify-center gap-1.5 py-8 text-caption text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Loading…
        </p>
      ) : visible.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed px-3 py-8 text-center">
          <ListChecks className="mx-auto size-4 text-muted-foreground/50" strokeWidth={1.8} />
          <p className="mt-2 text-body font-medium">
            {items.length > 0 ? 'Nothing open' : 'No action items yet'}
          </p>
          <p className="mt-1 text-caption text-muted-foreground">
            {items.length > 0
              ? 'Every tracked item is complete.'
              : 'Generate a summary, then Extract to turn the tasks it found into tracked work.'}
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {visible.map((item) => {
            const meta = STATUS_META[item.status] || STATUS_META.open;
            const StatusIcon = meta.icon;
            const isComplete = item.status === 'done' || item.status === 'dismissed';

            return (
              <li
                key={item.id}
                className={cn(
                  'group/item rounded-xl border bg-card p-2.5 transition-colors duration-control',
                  isComplete && 'opacity-60'
                )}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() =>
                      patchItem(item.id, { status: item.status === 'done' ? 'open' : 'done' })
                    }
                    className={cn('mt-0.5 shrink-0 transition-colors duration-control', meta.tone)}
                    title={item.status === 'done' ? 'Reopen' : 'Mark done'}
                  >
                    <StatusIcon className="size-4" strokeWidth={1.8} />
                  </button>

                  <p
                    className={cn(
                      'min-w-0 flex-1 text-body',
                      isComplete && 'line-through'
                    )}
                  >
                    {item.task}
                  </p>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 text-muted-foreground opacity-0 transition-colors duration-control hover:text-destructive group-hover/item:opacity-100"
                      title="Remove"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.8} />
                    </button>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6 text-meta text-muted-foreground">
                  <span className={cn('status-pill h-5 px-2', meta.pill)}>{meta.label}</span>

                  {canEdit ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 transition-colors duration-control hover:bg-secondary"
                        >
                          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary/10 text-meta font-semibold text-primary">
                            {(item.assignee?.name || item.suggestedOwner || 'U')
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                          {item.assignee?.name || item.suggestedOwner || 'Unassigned'}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel className="text-caption">Assign to</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-body"
                          onClick={() => patchItem(item.id, { assignee: null })}
                        >
                          Unassigned
                        </DropdownMenuItem>
                        {participants.map((participant) => (
                          <DropdownMenuItem
                            key={participant.userId}
                            className="text-body"
                            onClick={() =>
                              patchItem(item.id, {
                                assignee: {
                                  userId: participant.userId,
                                  name: participant.name,
                                  email: participant.email
                                }
                              })
                            }
                          >
                            {participant.name || participant.email}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary/10 text-meta font-semibold text-primary">
                        {(item.assignee?.name || item.suggestedOwner || 'U')
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                      {item.assignee?.name || item.suggestedOwner || 'Unassigned'}
                    </span>
                  )}

                  {item.dueDate && (
                    <span className="inline-flex items-center gap-1 text-meta">
                      <Clock3 className="size-3" strokeWidth={1.8} /> {item.dueDate}
                    </span>
                  )}

                  {canEdit && item.status !== 'done' && (
                    <button
                      type="button"
                      onClick={() =>
                        patchItem(item.id, {
                          status: item.status === 'in_progress' ? 'open' : 'in_progress'
                        })
                      }
                      className="ml-auto rounded-full border px-2 py-0.5 transition-colors duration-control hover:bg-secondary hover:text-foreground"
                    >
                      {item.status === 'in_progress' ? 'Pause' : 'Start'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {doneCount > 0 && (
        <button
          type="button"
          onClick={() => setShowDone((current) => !current)}
          className="mt-2.5 w-full rounded-lg py-1 text-meta text-muted-foreground transition-colors duration-control hover:bg-secondary hover:text-foreground"
        >
          {showDone ? 'Hide completed' : `Show ${doneCount} completed`}
        </button>
      )}
    </div>
  );
};

export default ActionItemsPanel;
