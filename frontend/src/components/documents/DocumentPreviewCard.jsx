import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, FileText, UsersRound } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const getInitials = (name, email) =>
  (name || email || 'CD')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/**
 * Real text for the page thumbnail, like Google Docs previews. Handles the
 * HTML-string content shape and falls back to contentText when present.
 */
const extractPreviewText = (document) => {
  const raw =
    typeof document.content === 'string'
      ? document.content
      : typeof document.content?.html === 'string'
        ? document.content.html
        : document.contentText || '';
  return raw
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
};

const DocumentPreviewCard = ({ document, isOwner, relativeDate, actions, selected = false, onSelect }) => {
  const previewText = useMemo(() => extractPreviewText(document), [document]);
  const collaboratorCount = (document.collaborators?.length || 0) + 1;

  return (
    <article className="group min-w-0">
      <div className="relative">
        <Link
          to={`/document/${document._id}`}
          onClick={(event) => {
            if (!onSelect) return;
            event.preventDefault();
            onSelect(document);
          }}
          className={cn(
            'interactive-card relative block aspect-[0.76] overflow-hidden p-[11%]',
            selected && 'border-primary ring-2 ring-primary/15 hover:border-primary'
          )}
        >
          {previewText ? (
            <>
              <span className="mb-2.5 line-clamp-2 text-caption font-bold leading-snug text-foreground">
                {document.title || 'Untitled document'}
              </span>
              <span className="block text-meta leading-[1.75] text-muted-foreground">
                {previewText}
              </span>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[26%] bg-gradient-to-t from-card via-card/80 to-transparent" />
            </>
          ) : (
            <span className="absolute inset-0 grid place-items-center">
              <span className="flex flex-col items-center gap-2 text-muted-foreground/60">
                <span className="grid size-9 place-items-center rounded-full bg-secondary">
                  <FileText className="size-4" strokeWidth={1.6} />
                </span>
                <span className="text-meta font-medium">Empty document</span>
              </span>
            </span>
          )}
          {document.tags?.[0] && (
            <span className="absolute bottom-[8%] left-[11%] truncate rounded-md bg-secondary px-2 py-0.5 text-meta font-medium text-muted-foreground">
              {document.tags[0]}
            </span>
          )}
        </Link>
        <div className="absolute right-2.5 top-2.5 z-10 opacity-100 transition-opacity duration-control md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          {actions}
        </div>
      </div>

      <div className="px-1 pb-1 pt-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to={`/document/${document._id}`}
              className="block truncate text-body font-semibold text-foreground transition-colors duration-control hover:text-primary"
            >
              {document.title || 'Untitled document'}
            </Link>
            <span className="mt-0.5 flex items-center gap-1.5 text-meta text-muted-foreground">
              <Clock3 className="size-3" strokeWidth={1.8} /> Edited {relativeDate}
            </span>
          </div>
          <div className="flex -space-x-1.5 pt-0.5" aria-label={`${collaboratorCount} collaborators`}>
            <Avatar className="size-6 border-2 border-[hsl(var(--workspace))]">
              <AvatarFallback className="bg-primary/10 text-meta font-semibold text-primary">
                {getInitials(document.owner?.name, document.owner?.email)}
              </AvatarFallback>
            </Avatar>
            {collaboratorCount > 1 && (
              <span className="grid size-6 place-items-center rounded-full border-2 border-[hsl(var(--workspace))] bg-primary text-meta font-semibold text-primary-foreground">
                +{collaboratorCount - 1}
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="truncate text-meta text-muted-foreground">
            {isOwner ? 'Owned by you' : `Shared by ${document.owner?.name || document.owner?.email || 'a teammate'}`}
          </span>
          <Badge variant="secondary" className="h-5 shrink-0 gap-1 rounded-full px-2 text-meta font-medium">
            <UsersRound className="size-3" strokeWidth={1.8} /> {collaboratorCount}
          </Badge>
        </div>
      </div>
    </article>
  );
};

export default DocumentPreviewCard;
