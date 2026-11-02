import { useMemo } from 'react';
import { Link } from 'react-router';
import { FileText } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { extractPreviewText, getAccess, getInitials } from '@/lib/document-display';

const AVATAR_TONES = [
  'bg-primary/10 text-primary',
  'bg-info-soft text-info',
  'bg-success-soft text-success',
  'bg-warning-soft text-warning'
];

/**
 * Library card: access pill, title, a two-line excerpt of the real content, and
 * who is on the document. The whole card opens the document; owner actions sit
 * beside the pill.
 */
const DocumentPreviewCard = ({ document, userId, relativeDate, actions }) => {
  const excerpt = useMemo(() => extractPreviewText(document, 220, { skipTitle: true }), [document]);
  const access = getAccess(document, userId);
  const people = [document.owner, ...(document.collaborators || [])].filter(Boolean);
  const title = document.title || 'Untitled document';

  return (
    <article className="interactive-card group relative flex min-w-0 flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="icon-chip size-8">
          <FileText className="size-4" strokeWidth={1.8} />
        </span>
        <div className="relative z-10 flex items-center gap-1.5">
          <span className={`status-pill status-pill--${access.tone}`}>{access.label}</span>
          {actions}
        </div>
      </div>

      <Link
        to={`/document/${document._id}`}
        className="mt-3 truncate text-body-lg font-semibold text-foreground after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
      >
        {title}
      </Link>
      <p className="mt-1 line-clamp-2 min-h-10 text-body text-muted-foreground">
        {excerpt || 'Empty document — open it to start writing.'}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
        <span className="truncate text-caption text-muted-foreground">Edited {relativeDate}</span>
        <div className="flex -space-x-1.5" aria-label={`${people.length} people`}>
          {people.slice(0, 3).map((person, index) => (
            <Avatar key={person.userId || index} className="size-7 border-2 border-card" title={person.name || person.email}>
              <AvatarFallback className={`text-meta font-semibold ${AVATAR_TONES[index % AVATAR_TONES.length]}`}>
                {getInitials(person.name, person.email)}
              </AvatarFallback>
            </Avatar>
          ))}
          {people.length > 3 && (
            <span className="grid size-7 place-items-center rounded-full border-2 border-card bg-secondary text-meta font-semibold text-muted-foreground">
              +{people.length - 3}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default DocumentPreviewCard;
