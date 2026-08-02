import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, MessageCircle, PanelRightClose, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  closeChatPanel,
  fetchChatGroups,
  fetchChatNotifications,
  setActiveChatGroup
} from '../../store/chatSlice';
import ChatThread from './ChatThread';
import ConversationList from './ConversationList';
import ConversationDialog from './ConversationDialog';

/**
 * The drawer is the in-context surface: it reuses the same thread and list used by
 * the Messages page so behaviour never diverges between the two entry points.
 */
const ChatSidebar = () => {
  const dispatch = useDispatch();
  const { isPanelOpen, context, groups, activeGroupId, loading } = useSelector(
    (state) => state.chat
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [showListOnMobile, setShowListOnMobile] = useState(false);

  useEffect(() => {
    if (!isPanelOpen) {
      setCreateOpen(false);
      setManageOpen(false);
      return;
    }
    dispatch(fetchChatGroups());
    dispatch(fetchChatNotifications());
  }, [dispatch, isPanelOpen]);

  const documentId = context?.documentId || null;

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) || null,
    [activeGroupId, groups]
  );

  // Opening the drawer from a document lands on that document's conversation.
  useEffect(() => {
    if (!isPanelOpen || activeGroupId) return;
    const preferred = documentId
      ? groups.find((group) => String(group.context?.documentId || '') === String(documentId))
      : null;
    const fallback = preferred || groups[0];
    if (fallback) {
      dispatch(setActiveChatGroup(fallback.id));
    }
  }, [activeGroupId, dispatch, documentId, groups, isPanelOpen]);

  useEffect(() => {
    if (!isPanelOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !createOpen && !manageOpen) {
        dispatch(closeChatPanel());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createOpen, dispatch, isPanelOpen, manageOpen]);

  if (!isPanelOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
        onClick={() => dispatch(closeChatPanel())}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Messages"
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l bg-card shadow-floating md:w-[min(94vw,820px)] xl:w-[54vw] xl:min-w-[760px] xl:max-w-[1040px]"
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-2.5 sm:px-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg md:hidden"
              onClick={() => dispatch(closeChatPanel())}
              title="Close messages"
            >
              <ArrowLeft className="size-4" strokeWidth={1.8} />
            </Button>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <MessageCircle className="size-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-body font-semibold">Messages</h2>
              <p className="truncate text-meta text-muted-foreground">
                {groups.length} {groups.length === 1 ? 'conversation' : 'conversations'}
              </p>
            </div>
            {context?.documentTitle && (
              <Badge
                variant="secondary"
                className="ml-1 hidden max-w-48 truncate rounded-full text-meta sm:inline-flex"
              >
                {context.documentTitle}
              </Badge>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground md:hidden"
              onClick={() => setShowListOnMobile((current) => !current)}
              title="Show conversations"
            >
              <PanelRightClose className="size-4" strokeWidth={1.8} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground"
              onClick={() => setCreateOpen(true)}
              title="New conversation"
            >
              <Plus className="size-4" strokeWidth={1.8} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground"
              onClick={() => dispatch(closeChatPanel())}
              title="Close messages"
            >
              <X className="size-4" strokeWidth={1.8} />
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ConversationList
            groups={groups}
            activeGroupId={activeGroupId}
            loading={loading}
            highlightDocumentId={documentId}
            onSelect={(groupId) => {
              dispatch(setActiveChatGroup(groupId));
              setShowListOnMobile(false);
            }}
            onCreate={() => setCreateOpen(true)}
            className={cn(
              'w-full shrink-0 border-r bg-card md:w-[290px]',
              showListOnMobile || !activeGroupId ? 'flex' : 'hidden md:flex'
            )}
          />

          <ChatThread
            group={activeGroup}
            className={cn(
              'min-w-0',
              showListOnMobile && activeGroupId ? 'hidden md:flex' : 'flex'
            )}
            onBack={() => setShowListOnMobile(true)}
            onManageMembers={() => setManageOpen(true)}
            showDocumentLink={!documentId}
            backButtonClassName="md:hidden"
          />
        </div>
      </aside>

      <ConversationDialog open={createOpen} onOpenChange={setCreateOpen} context={context} />
      <ConversationDialog open={manageOpen} onOpenChange={setManageOpen} group={activeGroup} />
    </>
  );
};

export default ChatSidebar;
