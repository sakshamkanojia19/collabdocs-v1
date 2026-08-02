import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ChevronUp,
  FileText,
  Gavel,
  Loader2,
  MessageSquare,
  Settings2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  clearComposerDraft,
  deleteChatMessage,
  editChatMessage,
  fetchChatMessages,
  markChatGroupRead,
  markMessageAsDecision,
  sendChatMessage,
  setComposerAnchor,
  setComposerReply,
  toggleAnchorResolved,
  toggleMessageReaction,
  unmarkMessageDecision
} from '../../store/chatSlice';
import { requestAnchorFocus, requestContentInsert } from '../../store/documentSlice';
import { getChatSocket } from '../../services/chatSocket';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import { groupMessagesForDisplay, initialsOf, typingLabel } from './chat-utils';

const STALE_TYPING_MS = 6000;

const ChatThread = ({
  group,
  onBack,
  onManageMembers,
  onJumpToAnchor,
  className,
  showDocumentLink = true,
  // The list/thread breakpoint differs between the page and the drawer, so the
  // owner of the layout decides when the back affordance is needed.
  backButtonClassName = 'lg:hidden'
}) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const messagesState = useSelector((state) => state.chat.messages);
  const typingState = useSelector((state) => state.chat.typing);
  const presenceState = useSelector((state) => state.chat.presence);
  const composer = useSelector((state) => state.chat.composer);

  const groupId = group?.id;
  const conversation = messagesState[groupId] || { items: [], loading: false, hasMore: true };
  const scrollRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);

  const participants = group?.participants || [];
  const membership = participants.find((participant) => participant.userId === user?.id);
  const canManage = ['owner', 'admin'].includes(membership?.role || '');
  const documentId = group?.context?.documentId || null;

  const onlineCount = useMemo(() => {
    const online = presenceState[groupId] || {};
    return Object.keys(online).filter((userId) => userId !== user?.id).length;
  }, [groupId, presenceState, user?.id]);

  const typingUsers = useMemo(() => {
    const entries = typingState[groupId] || {};
    const now = Date.now();
    return Object.entries(entries)
      .filter(([userId, entry]) => userId !== user?.id && now - entry.at < STALE_TYPING_MS)
      .map(([, entry]) => entry);
  }, [groupId, typingState, user?.id]);

  const dayGroups = useMemo(
    () => groupMessagesForDisplay(conversation.items),
    [conversation.items]
  );

  const decisionCount = useMemo(
    () => conversation.items.filter((message) => message.decision).length,
    [conversation.items]
  );

  // Join the socket room for this conversation only while it is on screen.
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket || !groupId) return undefined;
    socket.emit('chat:join', { groupId });
    return () => {
      socket.emit('chat:leave', { groupId });
    };
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    if (!messagesState[groupId]) {
      dispatch(fetchChatMessages({ groupId }));
    }
    dispatch(markChatGroupRead({ groupId, userId: user?.id }));
    getChatSocket()?.emit('chat:read', { groupId });
  }, [dispatch, groupId, messagesState, user?.id]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomAnchorRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  // Only auto-scroll when the reader is already at the bottom, so reading history
  // is never interrupted by incoming messages.
  useEffect(() => {
    if (isPinnedToBottom) {
      scrollToBottom('auto');
    }
  }, [conversation.items.length, isPinnedToBottom, scrollToBottom]);

  useEffect(() => {
    setIsPinnedToBottom(true);
  }, [groupId]);

  const handleScroll = (event) => {
    const node = event.currentTarget;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setIsPinnedToBottom(distanceFromBottom < 80);
  };

  const loadEarlier = () => {
    const oldest = conversation.items.find((message) => !message.pending);
    if (!oldest?.createdAt || conversation.loading) return;
    dispatch(fetchChatMessages({ groupId, before: oldest.createdAt }));
  };

  const handleSend = ({ content, mentions }) => {
    if (!groupId) return;
    dispatch(
      sendChatMessage({
        groupId,
        content,
        mentions,
        replyToId: composer.replyTo?.messageId || undefined,
        replyTo: composer.replyTo || undefined,
        anchor: composer.anchor || undefined,
        sender: { userId: user?.id, name: user?.name, email: user?.email }
      })
    );
    dispatch(clearComposerDraft());
    setIsPinnedToBottom(true);
  };

  const handleTyping = (isTyping) => {
    getChatSocket()?.emit('chat:typing', { groupId, isTyping });
  };

  const handleMarkDecision = (message) => {
    dispatch(markMessageAsDecision({ groupId, messageId: message.id }));
  };

  // Promotes an agreed message into the linked document, attributed to its author.
  const handleInsertIntoDocument = (message) => {
    if (!documentId) return;
    dispatch(
      requestContentInsert({
        documentId,
        messageId: message.id,
        author: message.sender?.name || message.sender?.email,
        content: message.content,
        createdAt: message.createdAt
      })
    );
  };

  const handleJumpToAnchor = (message) => {
    if (message.anchor?.quote) {
      dispatch(
        requestAnchorFocus({
          documentId: message.anchor.documentId,
          quote: message.anchor.quote,
          requestedAt: Date.now()
        })
      );
    }
    onJumpToAnchor?.(message);
  };

  if (!group) {
    return (
      <div
        className={cn(
          'grid flex-1 place-items-center bg-[hsl(var(--workspace))] px-6 text-center',
          className
        )}
      >
        <div className="max-w-sm">
          <span className="icon-chip mx-auto size-12 rounded-xl">
            <MessageSquare className="size-5" strokeWidth={1.8} />
          </span>
          <h2 className="mt-4 text-body-lg font-semibold">No conversation selected</h2>
          <p className="mt-1 text-body text-muted-foreground">
            Pick a conversation to continue, or start a new group to keep decisions next to the work.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col bg-[hsl(var(--workspace))]', className)}>
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card px-2 sm:px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className={cn('size-8 rounded-lg', backButtonClassName)}
              onClick={onBack}
            >
              <ArrowLeft className="size-4" strokeWidth={1.8} />
            </Button>
          )}
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-caption font-semibold text-primary">
            {initialsOf(group.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-body font-semibold">{group.name}</p>
            <p className="flex items-center gap-1.5 text-meta text-muted-foreground">
              <Users className="size-2.5" strokeWidth={1.8} />
              {participants.length} {participants.length === 1 ? 'member' : 'members'}
              {onlineCount > 0 && (
                <>
                  <span className="size-1.5 rounded-full bg-success" />
                  <span className="font-medium text-success">{onlineCount} online</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {decisionCount > 0 && (
            <Badge
              variant="outline"
              className="hidden gap-1 rounded-full border-success/30 bg-success-soft text-meta font-medium text-success sm:inline-flex"
            >
              <Gavel className="size-2.5" strokeWidth={1.8} /> {decisionCount} decision
              {decisionCount === 1 ? '' : 's'}
            </Badge>
          )}
          {documentId && showDocumentLink && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2 text-caption text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link to={`/document/${documentId}`}>
                <FileText className="size-3.5" strokeWidth={1.8} />
                <span className="hidden sm:inline">Open document</span>
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground"
            onClick={onManageMembers}
            title={canManage ? 'Manage conversation' : 'Conversation details'}
          >
            <Settings2 className="size-4" strokeWidth={1.8} />
          </Button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="workspace-scrollbar h-full overflow-y-auto px-3 py-4 sm:px-5"
        >
          {conversation.loading && conversation.items.length === 0 ? (
            <div className="flex h-full items-center justify-center gap-2 text-body text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading conversation…
            </div>
          ) : conversation.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="icon-chip size-12 rounded-xl">
                <MessageSquare className="size-5" strokeWidth={1.8} />
              </span>
              <p className="mt-3 text-body-lg font-semibold">Start the conversation</p>
              <p className="mt-1 max-w-xs text-body text-muted-foreground">
                Messages here reach every member. Anything agreed can be recorded as a decision on
                the document.
              </p>
            </div>
          ) : (
            <>
              {conversation.hasMore && (
                <div className="flex justify-center pb-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 gap-1.5 rounded-full px-3 text-caption"
                    onClick={loadEarlier}
                    disabled={conversation.loading}
                  >
                    {conversation.loading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <ChevronUp className="size-3" strokeWidth={1.8} />
                    )}
                    Load earlier messages
                  </Button>
                </div>
              )}

              {dayGroups.map((day) => (
                <section key={day.key} className="space-y-3">
                  <div className="sticky top-0 z-10 flex justify-center py-1">
                    <span className="rounded-full border bg-card/95 px-2.5 py-0.5 text-meta font-medium text-muted-foreground shadow-raised backdrop-blur">
                      {day.label}
                    </span>
                  </div>

                  {day.blocks.map((block) => (
                    <div
                      key={block.key}
                      className={cn(
                        'flex items-end gap-2',
                        block.isOwn ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      <span
                        className="mb-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-meta font-semibold text-primary"
                        title={block.sender?.name}
                      >
                        {initialsOf(block.sender?.name || block.sender?.email)}
                      </span>
                      <div
                        className={cn(
                          'flex min-w-0 flex-1 flex-col gap-1',
                          block.isOwn ? 'items-end' : 'items-start'
                        )}
                      >
                        {block.messages.map((message, index) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            group={group}
                            currentUserId={user?.id}
                            showSenderName={index === 0}
                            canRecordDecision={Boolean(documentId || message.anchor)}
                            onReply={(target) =>
                              dispatch(
                                setComposerReply({
                                  messageId: target.id,
                                  senderName: target.sender?.name,
                                  preview: (target.content || '').slice(0, 200)
                                })
                              )
                            }
                            onEdit={(target, content) =>
                              dispatch(
                                editChatMessage({ groupId, messageId: target.id, content })
                              )
                            }
                            onDelete={(target) =>
                              dispatch(deleteChatMessage({ groupId, messageId: target.id }))
                            }
                            onReact={(target, emoji) =>
                              dispatch(
                                toggleMessageReaction({ groupId, messageId: target.id, emoji })
                              )
                            }
                            onRetry={(target) =>
                              dispatch(
                                sendChatMessage({
                                  groupId,
                                  content: target.content,
                                  mentions: target.mentions,
                                  replyToId: target.replyTo?.messageId,
                                  anchor: target.anchor || undefined,
                                  sender: target.sender
                                })
                              )
                            }
                            onMarkDecision={handleMarkDecision}
                            onUnmarkDecision={(target) =>
                              dispatch(unmarkMessageDecision({ groupId, messageId: target.id }))
                            }
                            onToggleResolved={(target) =>
                              dispatch(toggleAnchorResolved({ groupId, messageId: target.id }))
                            }
                            onJumpToAnchor={handleJumpToAnchor}
                            onInsertIntoDocument={
                              documentId && !message.pending ? handleInsertIntoDocument : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
              <div ref={bottomAnchorRef} className="h-1" />
            </>
          )}
        </div>

        {!isPinnedToBottom && conversation.items.length > 0 && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-3 right-4 size-8 rounded-full border bg-card shadow-lifted"
            onClick={() => {
              setIsPinnedToBottom(true);
              scrollToBottom();
            }}
            title="Jump to latest"
          >
            <ArrowDown className="size-4" strokeWidth={1.8} />
          </Button>
        )}
      </div>

      <div
        className="h-5 shrink-0 px-4 text-meta italic text-muted-foreground"
        aria-live="polite"
      >
        {typingUsers.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="flex gap-0.5">
              <span className="size-1 animate-pulse rounded-full bg-muted-foreground" />
              <span className="size-1 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
              <span className="size-1 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
            </span>
            {typingLabel(typingUsers)}…
          </span>
        )}
      </div>

      <MessageComposer
        participants={participants}
        currentUserId={user?.id}
        replyTo={composer.replyTo}
        anchor={composer.anchor}
        onSend={handleSend}
        onTyping={handleTyping}
        onCancelReply={() => dispatch(setComposerReply(null))}
        onCancelAnchor={() => dispatch(setComposerAnchor(null))}
      />
    </div>
  );
};

export default ChatThread;
