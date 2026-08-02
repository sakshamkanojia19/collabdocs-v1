import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  CircleCheck,
  Gavel,
  ListChecks,
  Loader2,
  MessageSquare,
  Quote,
  RefreshCw,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '../../services/api';
import { openChatPanel, setActiveChatGroup } from '../../store/chatSlice';
import { requestAnchorFocus } from '../../store/documentSlice';
import { formatRelative, initialsOf, avatarTone } from '../chat/chat-utils';
import ActionItemsPanel from './ActionItemsPanel';

const VIEWS = [
  { id: 'decisions', label: 'Decisions', icon: Gavel },
  { id: 'threads', label: 'Comments', icon: MessageSquare },
  { id: 'work', label: 'Work', icon: ListChecks }
];

/**
 * The document's institutional memory: what was decided, and the open discussion
 * anchored to specific passages. Both come from chat, scoped to this document.
 */
const DecisionLogPanel = ({ documentId, chatContext, onFocusAnchor, canEdit, participants }) => {
  const dispatch = useDispatch();
  const [view, setView] = useState('decisions');
  const [decisions, setDecisions] = useState([]);
  const [threads, setThreads] = useState([]);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError('');
    try {
      const [decisionResponse, threadResponse] = await Promise.all([
        api.get(`/chat/documents/${documentId}/decisions`),
        api.get(`/chat/documents/${documentId}/threads?includeResolved=true`)
      ]);
      setDecisions(decisionResponse.data?.decisions || []);
      setThreads(threadResponse.data?.threads || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || 'The decision log could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleThreads = useMemo(
    () => threads.filter((thread) => showResolved || !thread.anchor?.resolvedAt),
    [showResolved, threads]
  );

  const openThread = (groupId) => {
    if (groupId) {
      dispatch(setActiveChatGroup(groupId));
    }
    dispatch(openChatPanel({ context: chatContext }));
  };

  const focusAnchor = (quote) => {
    if (!quote) return;
    dispatch(requestAnchorFocus({ documentId, quote, requestedAt: Date.now() }));
    onFocusAnchor?.(quote);
  };

  const unresolvedCount = threads.filter((thread) => !thread.anchor?.resolvedAt).length;

  // Work has its own loading and mutation lifecycle; the record header stays shared.
  if (view === 'work') {
    return (
      <div>
        <div className="flex items-center justify-between gap-2 px-3 pt-3">
          <div className="flex rounded-lg bg-secondary p-0.5">
            {VIEWS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setView(option.id)}
                className={cn(
                  'flex h-6 items-center gap-1 rounded-md px-2 text-caption transition-colors duration-control',
                  view === option.id
                    ? 'bg-card font-medium text-foreground shadow-raised'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <option.icon className="size-3.5" strokeWidth={1.8} />
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <ActionItemsPanel
          documentId={documentId}
          canEdit={canEdit}
          participants={participants}
        />
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-lg bg-secondary p-0.5">
          {VIEWS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setView(option.id)}
              className={cn(
                'flex h-6 items-center gap-1 rounded-md px-2 text-caption transition-colors duration-control',
                view === option.id
                  ? 'bg-card font-medium text-foreground shadow-raised'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <option.icon className="size-3.5" strokeWidth={1.8} />
              {option.label}
              {option.id === 'decisions' && decisions.length > 0 && (
                <span className="opacity-70">{decisions.length}</span>
              )}
              {option.id === 'threads' && unresolvedCount > 0 && (
                <span className="opacity-70">{unresolvedCount}</span>
              )}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={load}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-2 text-caption text-destructive"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-4 flex items-center justify-center gap-1.5 py-8 text-caption text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Loading…
        </div>
      ) : view === 'decisions' ? (
        <div className="mt-3 space-y-2">
          {decisions.length === 0 ? (
            <div className="rounded-xl border border-dashed px-3 py-8 text-center">
              <Gavel className="mx-auto size-4 text-muted-foreground/50" />
              <p className="mt-2 text-body font-medium">No decisions recorded</p>
              <p className="mt-1 text-caption text-muted-foreground">
                In a document conversation, open a message menu and choose
                <span className="font-medium"> Record as decision</span> to keep the reasoning
                with the work.
              </p>
            </div>
          ) : (
            decisions.map((decision) => (
              <article
                key={decision.messageId}
                className="surface-card p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-success-soft text-success">
                    <Gavel className="size-3" strokeWidth={1.8} />
                  </span>
                  <p className="min-w-0 flex-1 text-body font-medium">
                    {decision.summary}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-meta text-muted-foreground">
                  <span
                    className={cn(
                      'grid size-5 place-items-center rounded-full text-meta font-semibold',
                      avatarTone(decision.markedBy?.userId || '')
                    )}
                  >
                    {initialsOf(decision.markedBy?.name || '?')}
                  </span>
                  <span>{decision.markedBy?.name || 'Someone'}</span>
                  <span>·</span>
                  <span>{formatRelative(decision.markedAt)} ago</span>
                  <Badge variant="outline" className="ml-auto rounded-full text-meta font-medium">
                    {decision.groupName}
                  </Badge>
                </div>

                {decision.anchorQuote && (
                  <button
                    type="button"
                    onClick={() => focusAnchor(decision.anchorQuote)}
                    className="mt-2 flex w-full items-start gap-1.5 rounded-md border-l-2 border-warning/60 bg-warning-soft/60 px-2 py-1 text-left transition-colors duration-control hover:bg-warning-soft"
                  >
                    <Quote className="mt-0.5 size-3 shrink-0 opacity-70" strokeWidth={1.8} />
                    <span className="line-clamp-2 text-meta italic">{decision.anchorQuote}</span>
                  </button>
                )}

                {decision.canOpenThread ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1.5 h-7 gap-1.5 px-2 text-caption"
                    onClick={() => openThread(decision.groupId)}
                  >
                    <MessageSquare className="size-3.5" strokeWidth={1.8} /> View discussion
                  </Button>
                ) : (
                  <p className="mt-1.5 text-meta italic text-muted-foreground">
                    Discussion is private to that conversation.
                  </p>
                )}
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {threads.some((thread) => thread.anchor?.resolvedAt) && (
            <label className="flex items-center gap-1.5 px-0.5 text-meta text-muted-foreground">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(event) => setShowResolved(event.target.checked)}
                className="size-3 accent-primary"
              />
              Show resolved
            </label>
          )}

          {visibleThreads.length === 0 ? (
            <div className="rounded-xl border border-dashed px-3 py-8 text-center">
              <Target className="mx-auto size-4 text-muted-foreground/50" />
              <p className="mt-2 text-body font-medium">No anchored comments</p>
              <p className="mt-1 text-caption text-muted-foreground">
                Select text in the document and choose <span className="font-medium">Discuss</span>{' '}
                to start a comment tied to that passage.
              </p>
            </div>
          ) : (
            visibleThreads.map((thread) => (
              <article
                key={thread.id}
                className={cn(
                  'surface-card p-3',
                  thread.anchor?.resolvedAt && 'opacity-65'
                )}
              >
                <button
                  type="button"
                  onClick={() => focusAnchor(thread.anchor?.quote)}
                  className="flex w-full items-start gap-1.5 rounded-md border-l-2 border-warning/60 bg-warning-soft/60 px-2 py-1 text-left transition-colors duration-control hover:bg-warning-soft"
                >
                  <Quote className="mt-0.5 size-3 shrink-0 opacity-70" strokeWidth={1.8} />
                  <span className="line-clamp-2 text-meta italic">{thread.anchor?.quote}</span>
                </button>

                <p className="mt-2 line-clamp-3 text-body">{thread.content}</p>

                <div className="mt-1.5 flex items-center gap-1.5 text-meta text-muted-foreground">
                  <span
                    className={cn(
                      'grid size-5 place-items-center rounded-full text-meta font-semibold',
                      avatarTone(thread.sender?.userId || '')
                    )}
                  >
                    {initialsOf(thread.sender?.name || '?')}
                  </span>
                  <span className="truncate">{thread.sender?.name}</span>
                  <span>·</span>
                  <span className="shrink-0">{formatRelative(thread.createdAt)} ago</span>
                  {thread.anchor?.resolvedAt && (
                    <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-success">
                      <CircleCheck className="size-3" strokeWidth={1.8} /> Resolved
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 gap-1.5 px-2 text-caption"
                  onClick={() => openThread(thread.groupId)}
                >
                  <MessageSquare className="size-3.5" strokeWidth={1.8} /> Open in {thread.groupName}
                </Button>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DecisionLogPanel;
