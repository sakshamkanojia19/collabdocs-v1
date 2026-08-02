export const REACTION_CHOICES = ['👍', '🎉', '❤️', '👀', '✅', '🙏', '😄', '🤔'];

const AVATAR_TONES = [
  'bg-blue-500/12 text-blue-600 dark:text-blue-300',
  'bg-violet-500/12 text-violet-600 dark:text-violet-300',
  'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
  'bg-amber-500/14 text-amber-600 dark:text-amber-300',
  'bg-rose-500/12 text-rose-600 dark:text-rose-300',
  'bg-cyan-500/12 text-cyan-600 dark:text-cyan-300'
];

export const initialsOf = (value = '') => {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

/** Stable per-identity tone so the same person keeps the same colour everywhere. */
export const avatarTone = (seed = '') => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
};

export const formatClock = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatRelative = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const formatDayLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const startOfDay = (input) =>
    new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(today) - startOfDay(date)) / 86400000);
  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric'
  });
};

const SAME_BLOCK_WINDOW_MS = 5 * 60 * 1000;

/**
 * Turns a flat message list into day sections holding consecutive same-sender
 * blocks, so the thread reads as a conversation instead of a stack of bubbles.
 */
export const groupMessagesForDisplay = (messages = []) => {
  const days = [];

  messages.forEach((message) => {
    const dayKey = new Date(message.createdAt).toDateString();
    let day = days[days.length - 1];
    if (!day || day.key !== dayKey) {
      day = { key: dayKey, label: formatDayLabel(message.createdAt), blocks: [] };
      days.push(day);
    }

    const lastBlock = day.blocks[day.blocks.length - 1];
    const sameSender = lastBlock?.senderId === message.sender?.userId;
    const withinWindow =
      lastBlock &&
      new Date(message.createdAt).getTime() -
        new Date(lastBlock.messages[lastBlock.messages.length - 1].createdAt).getTime() <
        SAME_BLOCK_WINDOW_MS;
    // Anchored and decision messages always start a block: they carry their own header.
    const standalone = Boolean(message.anchor || message.decision);
    const lastStandalone = Boolean(
      lastBlock?.messages?.some((item) => item.anchor || item.decision)
    );

    if (lastBlock && sameSender && withinWindow && !standalone && !lastStandalone) {
      lastBlock.messages.push(message);
    } else {
      day.blocks.push({
        key: message.id,
        senderId: message.sender?.userId,
        sender: message.sender,
        isOwn: message.isOwn,
        messages: [message]
      });
    }
  });

  return days;
};

/**
 * Splits message text into plain and mention segments for rendering. Mentions are
 * matched against the resolved mention list so arbitrary "@word" text is not styled.
 */
export const splitMentions = (content = '', mentions = []) => {
  if (!content || mentions.length === 0) {
    return [{ type: 'text', value: content }];
  }

  const names = [...new Set(mentions.map((mention) => mention.name).filter(Boolean))].sort(
    (a, b) => b.length - a.length
  );
  if (names.length === 0) {
    return [{ type: 'text', value: content }];
  }

  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`@(${escaped.join('|')})`, 'g');
  const segments = [];
  let cursor = 0;
  let match = pattern.exec(content);

  while (match) {
    if (match.index > cursor) {
      segments.push({ type: 'text', value: content.slice(cursor, match.index) });
    }
    segments.push({ type: 'mention', value: match[0] });
    cursor = match.index + match[0].length;
    match = pattern.exec(content);
  }

  if (cursor < content.length) {
    segments.push({ type: 'text', value: content.slice(cursor) });
  }
  return segments;
};

/** Derives the mention list from composer text by matching participant names. */
export const detectMentions = (content = '', participants = []) =>
  participants.filter((participant) => {
    if (!participant?.name) return false;
    const escaped = participant.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`@${escaped}(\\b|$)`, 'i').test(content);
  });

export const typingLabel = (typingUsers = []) => {
  const names = typingUsers.map((entry) => entry.name?.split(' ')[0] || 'Someone');
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  return `${names[0]} and ${names.length - 1} others are typing`;
};

export const readReceiptState = (message, group, currentUserId) => {
  if (!message?.isOwn || message.pending || message.failed) return null;
  const others = (group?.participants || []).filter(
    (participant) => participant.userId !== currentUserId
  );
  if (others.length === 0) return 'sent';
  const sentAt = new Date(message.createdAt).getTime();
  const seenBy = others.filter(
    (participant) =>
      participant.lastReadAt && new Date(participant.lastReadAt).getTime() >= sentAt
  );
  if (seenBy.length === 0) return 'sent';
  return seenBy.length === others.length ? 'seen-all' : 'seen-some';
};
