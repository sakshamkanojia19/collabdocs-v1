import { useMemo, useState } from 'react';
import { AtSign, FileText, Loader2, MessageSquare, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatRelative, initialsOf } from './chat-utils';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'documents', label: 'Documents' }
];

const ConversationRow = ({ group, isActive, onSelect }) => {
  const unread = group.unreadCount || 0;
  const mentions = group.mentionCount || 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(group.id)}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-control',
        isActive ? 'bg-accent' : 'hover:bg-secondary/60'
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-caption font-semibold text-primary">
        {initialsOf(group.name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              'truncate text-body',
              unread > 0 ? 'font-semibold text-foreground' : 'font-medium'
            )}
          >
            {group.name || 'Conversation'}
          </span>
          <span className="ml-auto shrink-0 text-meta text-muted-foreground">
            {formatRelative(group.lastMessage?.sentAt || group.updatedAt)}
          </span>
        </span>

        <span className="mt-0.5 flex items-center gap-1.5">
          <span
            className={cn(
              'truncate text-caption',
              unread > 0 ? 'text-foreground/80' : 'text-muted-foreground'
            )}
          >
            {group.lastMessage?.preview
              ? `${group.lastMessage.sender?.name ? `${group.lastMessage.sender.name.split(' ')[0]}: ` : ''}${group.lastMessage.preview}`
              : `${group.participants?.length || 0} participants · no messages yet`}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {mentions > 0 && (
              <span
                className="grid size-[18px] place-items-center rounded-full bg-warning-soft text-warning"
                title={`${mentions} mention${mentions === 1 ? '' : 's'}`}
              >
                <AtSign className="size-2.5" strokeWidth={1.8} />
              </span>
            )}
            {unread > 0 && (
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-meta font-semibold text-primary-foreground">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </span>
        </span>

        {group.context?.type === 'document' && group.context?.documentTitle && (
          <span className="mt-1 flex items-center gap-1 text-meta text-muted-foreground">
            <FileText className="size-2.5" strokeWidth={1.8} />
            <span className="truncate">{group.context.documentTitle}</span>
          </span>
        )}
      </span>
    </button>
  );
};

const ConversationList = ({
  groups = [],
  activeGroupId,
  loading,
  onSelect,
  onCreate,
  className,
  highlightDocumentId
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups.filter((group) => {
      if (filter === 'unread' && !(group.unreadCount > 0)) return false;
      if (filter === 'documents' && group.context?.type !== 'document') return false;
      if (!query) return true;
      return `${group.name || ''} ${group.lastMessage?.preview || ''} ${group.context?.documentTitle || ''}`
        .toLowerCase()
        .includes(query);
    });
  }, [filter, groups, search]);

  // Conversations tied to the document in view come first when opened in context.
  const { contextual, others } = useMemo(() => {
    if (!highlightDocumentId) return { contextual: [], others: filtered };
    return {
      contextual: filtered.filter(
        (group) => String(group.context?.documentId || '') === String(highlightDocumentId)
      ),
      others: filtered.filter(
        (group) => String(group.context?.documentId || '') !== String(highlightDocumentId)
      )
    };
  }, [filtered, highlightDocumentId]);

  const totalUnread = groups.reduce((sum, group) => sum + (group.unreadCount || 0), 0);

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="shrink-0 space-y-2 border-b p-3">
        <div className="flex items-center gap-2">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="h-9 rounded-lg bg-background pl-8 text-body"
            />
          </label>
          {onCreate && (
            <Button
              size="icon"
              className="size-9 shrink-0 rounded-full shadow-raised"
              onClick={onCreate}
              title="New conversation"
            >
              <Plus className="size-4" strokeWidth={1.8} />
            </Button>
          )}
        </div>

        <div className="flex gap-1">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                'rounded-full px-2.5 py-1 text-caption font-medium transition-colors duration-control',
                filter === option.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              {option.label}
              {option.id === 'unread' && totalUnread > 0 && (
                <span className="ml-1 opacity-80">{totalUnread}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="workspace-scrollbar min-h-0 flex-1 overflow-y-auto">
        {loading && groups.length === 0 ? (
          <div className="space-y-1.5 p-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <span className="icon-chip mx-auto size-10">
              <MessageSquare className="size-4" strokeWidth={1.8} />
            </span>
            <p className="mt-3 text-body font-semibold">
              {search || filter !== 'all' ? 'No matching conversations' : 'No conversations yet'}
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              {search || filter !== 'all'
                ? 'Try another name, filter, or document title.'
                : 'Start a group to keep decisions close to the work.'}
            </p>
            {onCreate && !search && filter === 'all' && (
              <Button
                size="sm"
                className="mt-3 h-8 gap-1.5 rounded-full px-3 text-caption"
                onClick={onCreate}
              >
                <Plus className="size-3" strokeWidth={1.8} /> New conversation
              </Button>
            )}
          </div>
        ) : (
          <>
            {contextual.length > 0 && (
              <div>
                <p className="px-3 pb-1 pt-2.5 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  This document
                </p>
                <div className="divide-y divide-border/60">
                  {contextual.map((group) => (
                    <ConversationRow
                      key={group.id}
                      group={group}
                      isActive={group.id === activeGroupId}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div>
                {contextual.length > 0 && (
                  <p className="border-t px-3 pb-1 pt-2.5 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    All conversations
                  </p>
                )}
                <div className="divide-y divide-border/60">
                  {others.map((group) => (
                    <ConversationRow
                      key={group.id}
                      group={group}
                      isActive={group.id === activeGroupId}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {loading && groups.length > 0 && (
          <div className="flex justify-center py-2">
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
