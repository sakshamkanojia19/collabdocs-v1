import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { AtSign, MessagesSquare, Plus } from 'lucide-react';
import { fetchChatGroups, setActiveChatGroup } from '../store/chatSlice';
import ChatThread from '../components/chat/ChatThread';
import ConversationList from '../components/chat/ConversationList';
import ConversationDialog from '../components/chat/ConversationDialog';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const MessagesPage = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { groups, activeGroupId, loading, error } = useSelector((state) => state.chat);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const requestedGroupId = searchParams.get('group');

  useEffect(() => {
    dispatch(fetchChatGroups());
  }, [dispatch]);

  // A deep link wins over the previously active conversation.
  useEffect(() => {
    if (requestedGroupId && requestedGroupId !== activeGroupId) {
      dispatch(setActiveChatGroup(requestedGroupId));
    }
  }, [activeGroupId, dispatch, requestedGroupId]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) || null,
    [activeGroupId, groups]
  );

  const totals = useMemo(
    () =>
      groups.reduce(
        (acc, group) => ({
          unread: acc.unread + (group.unreadCount || 0),
          mentions: acc.mentions + (group.mentionCount || 0)
        }),
        { unread: 0, mentions: 0 }
      ),
    [groups]
  );

  const selectGroup = (groupId) => {
    dispatch(setActiveChatGroup(groupId));
    setSearchParams(groupId ? { group: groupId } : {}, { replace: true });
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <header className="shrink-0 border-b bg-background px-4 py-4 sm:px-6 xl:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <MessagesSquare className="size-3" strokeWidth={1.8} /> Team communication
            </div>
            <h1 className="mt-1 text-title-lg font-semibold tracking-tight">Messages</h1>
            <p className="mt-1 text-body text-muted-foreground">
              Discussion stays attached to the documents it belongs to, so decisions keep their
              context.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {totals.mentions > 0 && (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-warning-soft px-2.5 text-caption font-medium text-warning">
                <AtSign className="size-3" strokeWidth={1.8} /> {totals.mentions} mention
                {totals.mentions === 1 ? '' : 's'}
              </span>
            )}
            {totals.unread > 0 && (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 text-caption font-medium text-primary">
                {totals.unread} unread
              </span>
            )}
            <Button
              className="h-9 gap-2 rounded-full px-4 text-body font-medium shadow-raised"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3.5" strokeWidth={1.8} /> New conversation
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="border-b border-destructive/20 bg-destructive/5 px-4 py-2.5 text-body text-destructive sm:px-6"
        >
          {error.message || error.error || 'Conversations could not be loaded.'}
        </div>
      )}

      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ConversationList
          groups={groups}
          activeGroupId={activeGroupId}
          loading={loading}
          onSelect={selectGroup}
          onCreate={() => setCreateOpen(true)}
          className={cn(
            'border-r bg-card',
            // On small screens the list and thread swap places instead of stacking.
            activeGroupId ? 'hidden lg:flex' : 'flex'
          )}
        />

        <ChatThread
          group={activeGroup}
          className={activeGroupId ? 'flex' : 'hidden lg:flex'}
          onBack={() => selectGroup(null)}
          onManageMembers={() => setManageOpen(true)}
        />
      </div>

      <ConversationDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConversationDialog open={manageOpen} onOpenChange={setManageOpen} group={activeGroup} />
    </div>
  );
};

export default MessagesPage;
