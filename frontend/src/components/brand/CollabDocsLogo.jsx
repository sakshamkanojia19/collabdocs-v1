import { Link } from 'react-router';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const CollabDocsLogo = ({ to = '/', compact = false, inverted = false, className }) => (
  <Link
    to={to}
    className={cn(
      'inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
      className
    )}
    aria-label="CollabDocs home"
  >
    <span
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-xl shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.8)]',
        inverted ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
      )}
    >
      <FileText className="size-[18px]" strokeWidth={2.2} />
    </span>
    {!compact && (
      <span
        className={cn(
          'text-title-sm font-semibold tracking-tight text-foreground',
          inverted && 'text-primary-foreground'
        )}
      >
        CollabDocs
      </span>
    )}
  </Link>
);

export default CollabDocsLogo;
