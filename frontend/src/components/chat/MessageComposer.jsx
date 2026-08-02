import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CornerUpLeft, Quote, Send, SmilePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { REACTION_CHOICES, detectMentions, initialsOf } from './chat-utils';

const MAX_ROWS_HEIGHT = 160;

const MessageComposer = ({
  participants = [],
  currentUserId,
  replyTo,
  anchor,
  disabled,
  onSend,
  onTyping,
  onCancelReply,
  onCancelAnchor
}) => {
  const [value, setValue] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();
    return participants
      .filter((participant) => participant.userId !== currentUserId)
      .filter(
        (participant) =>
          !query ||
          participant.name?.toLowerCase().includes(query) ||
          participant.email?.toLowerCase().includes(query)
      )
      .slice(0, 6);
  }, [currentUserId, mentionQuery, participants]);

  const autoGrow = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, MAX_ROWS_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    autoGrow();
  }, [autoGrow, value]);

  useEffect(() => {
    if (replyTo || anchor) {
      textareaRef.current?.focus();
    }
  }, [anchor, replyTo]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping?.(false);
    }
  }, [onTyping]);

  // Broadcast typing on the first keystroke, then let it lapse after a pause
  // instead of emitting on every character.
  const signalTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping?.(true);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(stopTyping, 2500);
  }, [onTyping, stopTyping]);

  useEffect(() => stopTyping, [stopTyping]);

  const updateMentionQuery = (text, caretPosition) => {
    const upToCaret = text.slice(0, caretPosition);
    const match = /(?:^|\s)@([\p{L}\p{N}'.\- ]{0,40})$/u.exec(upToCaret);
    setMentionQuery(match ? match[1] : null);
    setHighlightIndex(0);
  };

  const handleChange = (event) => {
    setValue(event.target.value);
    updateMentionQuery(event.target.value, event.target.selectionStart);
    signalTyping();
  };

  const applyMention = (participant) => {
    const node = textareaRef.current;
    const caret = node?.selectionStart ?? value.length;
    const upToCaret = value.slice(0, caret);
    const replaced = upToCaret.replace(/@([\p{L}\p{N}'.\- ]{0,40})$/u, `@${participant.name} `);
    const next = `${replaced}${value.slice(caret)}`;
    setValue(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      node?.focus();
      const position = replaced.length;
      node?.setSelectionRange(position, position);
    });
  };

  const submit = () => {
    const content = value.trim();
    if (!content || disabled) return;
    onSend?.({
      content,
      mentions: detectMentions(content, participants)
    });
    setValue('');
    setMentionQuery(null);
    stopTyping();
  };

  const handleKeyDown = (event) => {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightIndex((index) => (index + 1) % mentionCandidates.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightIndex(
          (index) => (index - 1 + mentionCandidates.length) % mentionCandidates.length
        );
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        applyMention(mentionCandidates[highlightIndex]);
        return;
      }
      if (event.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="shrink-0 border-t bg-card px-3 py-2.5">
      {anchor && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-warning/70 bg-warning/10 px-2.5 py-1.5">
          <Quote className="mt-0.5 size-3 shrink-0 text-warning" strokeWidth={1.8} />
          <div className="min-w-0 flex-1">
            <p className="text-meta font-semibold uppercase tracking-[0.1em] text-warning">
              Commenting on selection
            </p>
            <p className="line-clamp-2 text-caption italic text-muted-foreground">{anchor.quote}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 rounded-lg text-muted-foreground"
            onClick={onCancelAnchor}
            title="Remove selection"
          >
            <X className="size-3" strokeWidth={1.8} />
          </Button>
        </div>
      )}

      {replyTo && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-primary/60 bg-secondary/70 px-2.5 py-1.5">
          <CornerUpLeft className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={1.8} />
          <div className="min-w-0 flex-1">
            <p className="text-meta font-semibold text-primary">
              Replying to {replyTo.senderName}
            </p>
            <p className="line-clamp-1 text-caption text-muted-foreground">{replyTo.preview}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 rounded-lg text-muted-foreground"
            onClick={onCancelReply}
            title="Cancel reply"
          >
            <X className="size-3" strokeWidth={1.8} />
          </Button>
        </div>
      )}

      <div className="relative">
        {mentionQuery !== null && mentionCandidates.length > 0 && (
          <div
            role="listbox"
            aria-label="Mention a participant"
            className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-xl border bg-popover shadow-floating"
          >
            <p className="border-b px-2.5 py-1.5 text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Mention
            </p>
            {mentionCandidates.map((participant, index) => (
              <button
                key={participant.userId}
                type="button"
                role="option"
                aria-selected={index === highlightIndex}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => applyMention(participant)}
                className={cn(
                  'flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors duration-control',
                  index === highlightIndex ? 'bg-secondary' : 'hover:bg-secondary/60'
                )}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-meta font-semibold text-primary">
                  {initialsOf(participant.name || participant.email)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-caption font-medium">{participant.name}</span>
                  <span className="block truncate text-meta text-muted-foreground">
                    {participant.email}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-xl border bg-background p-1.5 transition-[border-color,box-shadow] duration-control focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 rounded-lg text-muted-foreground"
                title="Insert emoji"
              >
                <SmilePlus className="size-4" strokeWidth={1.8} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1.5 shadow-floating" align="start">
              <div className="flex gap-0.5">
                {REACTION_CHOICES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="grid size-7 place-items-center rounded-md text-body-lg transition-colors duration-control hover:bg-secondary"
                    onClick={() => {
                      setValue((current) => `${current}${emoji}`);
                      textareaRef.current?.focus();
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Textarea
            ref={textareaRef}
            value={value}
            rows={1}
            disabled={disabled}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={stopTyping}
            placeholder={
              anchor ? 'Comment on the selected passage…' : 'Message the group — @ to mention'
            }
            aria-label="Message"
            className="min-h-0 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-body shadow-none focus-visible:ring-0"
          />

          <Button
            type="button"
            size="icon"
            className="size-8 shrink-0 rounded-full shadow-raised"
            onClick={submit}
            disabled={disabled || !value.trim()}
            title="Send message"
          >
            <Send className="size-4" strokeWidth={1.8} />
          </Button>
        </div>
      </div>

      <p className="mt-1 px-1 text-meta text-muted-foreground">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
};

export default MessageComposer;
