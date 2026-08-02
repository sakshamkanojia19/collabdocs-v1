import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCheck,
  CircleCheck,
  Clock3,
  CornerUpLeft,
  FileInput,
  Gavel,
  MoreHorizontal,
  Pencil,
  Quote,
  RotateCcw,
  SmilePlus,
  Trash2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  REACTION_CHOICES,
  formatClock,
  readReceiptState,
  splitMentions
} from './chat-utils';

const ReceiptIcon = ({ state }) => {
  if (state === 'sent') return <Check className="size-3" aria-label="Sent" />;
  if (state === 'seen-some') return <CheckCheck className="size-3" aria-label="Seen by some" />;
  if (state === 'seen-all') {
    return <CheckCheck className="size-3 text-primary-foreground" aria-label="Seen by everyone" />;
  }
  return null;
};

const MessageBubble = ({
  message,
  group,
  currentUserId,
  showSenderName,
  canRecordDecision,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onRetry,
  onMarkDecision,
  onUnmarkDecision,
  onToggleResolved,
  onJumpToAnchor,
  onInsertIntoDocument
}) => {
  const isOwn = message.isOwn ?? message.sender?.userId === currentUserId;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content || '');
  const editRef = useRef(null);
  const receipt = readReceiptState(message, group, currentUserId);
  const mentionsMe =
    message.mentionsMe ?? (message.mentions || []).some((m) => m.userId === currentUserId);

  useEffect(() => {
    if (isEditing) {
      setDraft(message.content || '');
      editRef.current?.focus();
    }
  }, [isEditing, message.content]);

  const submitEdit = () => {
    const next = draft.trim();
    if (next && next !== message.content) {
      onEdit?.(message, next);
    }
    setIsEditing(false);
  };

  if (message.isDeleted) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <p className="rounded-lg border border-dashed px-3 py-1.5 text-caption italic text-muted-foreground">
          Message deleted
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group/message flex flex-col',
        isOwn ? 'items-end' : 'items-start'
      )}
    >
      {showSenderName && !isOwn && (
        <p className="mb-1 px-1 text-meta font-semibold text-muted-foreground">
          {message.sender?.name || message.sender?.email}
        </p>
      )}

      <div
        className={cn(
          'flex max-w-full items-end gap-1',
          isOwn ? 'flex-row' : 'flex-row-reverse'
        )}
      >
        {/* Hover actions sit outside the bubble so they never overlap text. */}
        {!isEditing && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-control focus-within:opacity-100 group-hover/message:opacity-100">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-lg text-muted-foreground"
                  title="Add reaction"
                >
                  <SmilePlus className="size-3.5" strokeWidth={1.8} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1.5 shadow-floating" align={isOwn ? 'end' : 'start'}>
                <div className="flex gap-0.5">
                  {REACTION_CHOICES.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="grid size-7 place-items-center rounded-md text-body-lg transition-colors duration-control hover:bg-secondary"
                      onClick={() => onReact?.(message, emoji)}
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="size-6 rounded-lg text-muted-foreground"
              onClick={() => onReply?.(message)}
              title="Reply"
            >
              <CornerUpLeft className="size-3.5" strokeWidth={1.8} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-lg text-muted-foreground"
                  title="More actions"
                >
                  <MoreHorizontal className="size-3.5" strokeWidth={1.8} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="w-52">
                {message.decision ? (
                  <DropdownMenuItem
                    className="text-body"
                    onClick={() => onUnmarkDecision?.(message)}
                    disabled={!canRecordDecision}
                  >
                    <Gavel className="mr-2 size-3.5" strokeWidth={1.8} /> Remove from decision log
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-body"
                    onClick={() => onMarkDecision?.(message)}
                    disabled={!canRecordDecision}
                  >
                    <Gavel className="mr-2 size-3.5" strokeWidth={1.8} /> Record as decision
                  </DropdownMenuItem>
                )}
                {message.anchor && (
                  <DropdownMenuItem className="text-body" onClick={() => onToggleResolved?.(message)}>
                    <CircleCheck className="mr-2 size-3.5" strokeWidth={1.8} />
                    {message.anchor.resolvedAt ? 'Reopen thread' : 'Resolve thread'}
                  </DropdownMenuItem>
                )}
                {onInsertIntoDocument && (
                  <DropdownMenuItem
                    className="text-body"
                    onClick={() => onInsertIntoDocument(message)}
                  >
                    <FileInput className="mr-2 size-3.5" strokeWidth={1.8} /> Insert into document
                  </DropdownMenuItem>
                )}
                {isOwn && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-body" onClick={() => setIsEditing(true)}>
                      <Pencil className="mr-2 size-3.5" strokeWidth={1.8} /> Edit message
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-body text-destructive focus:text-destructive"
                      onClick={() => onDelete?.(message)}
                    >
                      <Trash2 className="mr-2 size-3.5" strokeWidth={1.8} /> Delete message
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div
          className={cn(
            'min-w-0 max-w-[min(560px,80vw)] rounded-2xl px-3 py-2 text-body',
            isOwn
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md bg-secondary text-foreground',
            mentionsMe && !isOwn && 'ring-1 ring-warning/60',
            message.pending && 'opacity-70',
            message.failed && 'ring-1 ring-destructive'
          )}
        >
          {message.decision && (
            <p
              className={cn(
                'mb-1.5 flex items-center gap-1.5 border-b pb-1.5 text-meta font-semibold uppercase tracking-[0.1em]',
                isOwn ? 'border-primary-foreground/25' : 'border-border text-success'
              )}
            >
              <Gavel className="size-3" strokeWidth={1.8} /> Decision
            </p>
          )}

          {message.replyTo && (
            <div
              className={cn(
                'mb-1.5 rounded-md border-l-2 px-2 py-1',
                isOwn
                  ? 'border-primary-foreground/50 bg-primary-foreground/10'
                  : 'border-primary/50 bg-background/70'
              )}
            >
              <p className="text-meta font-semibold opacity-80">{message.replyTo.senderName}</p>
              <p className="line-clamp-2 text-caption opacity-75">{message.replyTo.preview}</p>
            </div>
          )}

          {message.anchor && (
            <button
              type="button"
              onClick={() => onJumpToAnchor?.(message)}
              className={cn(
                'mb-1.5 flex w-full items-start gap-1.5 rounded-md border-l-2 px-2 py-1 text-left transition-colors duration-control',
                isOwn
                  ? 'border-primary-foreground/50 bg-primary-foreground/10 hover:bg-primary-foreground/20'
                  : 'border-warning/70 bg-warning/10 hover:bg-warning/15'
              )}
              title="Jump to this passage in the document"
            >
              <Quote className="mt-0.5 size-3 shrink-0 opacity-70" strokeWidth={1.8} />
              <span className="min-w-0">
                <span className="line-clamp-2 block text-caption italic opacity-85">
                  {message.anchor.quote}
                </span>
                {message.anchor.resolvedAt && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-meta font-medium opacity-80">
                    <CircleCheck className="size-2.5" strokeWidth={1.8} /> Resolved
                  </span>
                )}
              </span>
            </button>
          )}

          {isEditing ? (
            <div className="w-[min(420px,70vw)]">
              <Textarea
                ref={editRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submitEdit();
                  }
                  if (event.key === 'Escape') {
                    setIsEditing(false);
                  }
                }}
                rows={2}
                className="min-h-0 resize-none rounded-lg bg-background text-body text-foreground"
              />
              <div className="mt-1.5 flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-lg px-2 text-caption"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="mr-1 size-3" strokeWidth={1.8} /> Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 rounded-full px-3 text-caption"
                  onClick={submitEdit}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">
              {splitMentions(message.content, message.mentions).map((segment, index) =>
                segment.type === 'mention' ? (
                  <span
                    key={`${segment.value}-${index}`}
                    className={cn(
                      'rounded px-0.5 font-semibold',
                      isOwn ? 'bg-primary-foreground/20' : 'bg-primary/10 text-primary'
                    )}
                  >
                    {segment.value}
                  </span>
                ) : (
                  segment.value
                )
              )}
            </p>
          )}

          <span
            className={cn(
              'mt-0.5 flex items-center justify-end gap-1 text-meta',
              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {message.isEdited && <span className="italic">edited</span>}
            {message.pending ? (
              <Clock3 className="size-3" aria-label="Sending" />
            ) : message.failed ? (
              <button
                type="button"
                onClick={() => onRetry?.(message)}
                className="inline-flex items-center gap-1 font-medium text-destructive"
              >
                <AlertCircle className="size-3" strokeWidth={1.8} /> Not sent — retry
                <RotateCcw className="size-3" strokeWidth={1.8} />
              </button>
            ) : (
              <>
                {formatClock(message.createdAt)}
                <ReceiptIcon state={receipt} />
              </>
            )}
          </span>
        </div>
      </div>

      {message.reactions?.length > 0 && (
        <div className={cn('mt-1 flex flex-wrap gap-1', isOwn ? 'justify-end pr-1' : 'pl-1')}>
          {message.reactions.map((reaction) => {
            const reacted =
              reaction.reacted ?? (reaction.userIds || []).includes(currentUserId);
            return (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => onReact?.(message, reaction.emoji)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-caption transition-colors duration-control',
                  reacted
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                )}
                aria-pressed={reacted}
              >
                <span>{reaction.emoji}</span>
                <span className="font-medium">{reaction.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
