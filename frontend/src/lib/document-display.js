// Small presentation helpers shared by the dashboard's document surfaces.

export const getInitials = (name, email) =>
  (name || email || 'CD')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/**
 * Plain-text excerpt of a document. Handles the HTML-string content shape and
 * falls back to contentText when present.
 */
export const extractPreviewText = (document, maxLength = 600, { skipTitle = false } = {}) => {
  let raw =
    typeof document.content === 'string'
      ? document.content
      : typeof document.content?.html === 'string'
        ? document.content.html
        : document.contentText || '';
  // Documents usually open with their own title as a heading; an excerpt under
  // the title reads better without repeating it.
  if (skipTitle) raw = raw.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/i, ' ');
  return raw
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

export const formatRelativeDate = (value) => {
  if (!value) return 'recently';
  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
};

/** How the current user reaches a document: as owner, invitee, or via Team visibility. */
export const getAccess = (document, userId) => {
  if (document.owner?.userId === userId) return { label: 'Owner', tone: 'success' };
  if (document.collaborators?.some((collaborator) => collaborator.userId === userId)) {
    return { label: 'Shared', tone: 'info' };
  }
  return { label: 'Team', tone: 'neutral' };
};
