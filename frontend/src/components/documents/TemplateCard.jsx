import { createElement } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';

/**
 * Template gallery tile. `outline` lists the real sections the template
 * creates; without one (blank document) the preview reads as a clean page.
 */
const TemplateCard = ({ icon: Icon, label, description, outline, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="group min-w-0 text-left disabled:pointer-events-none disabled:opacity-60"
  >
    <span className="interactive-card relative block aspect-[4/3] overflow-hidden p-4">
      <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full border bg-background text-muted-foreground opacity-0 shadow-raised transition-opacity duration-control group-hover:opacity-100 group-focus-visible:opacity-100">
        <ArrowUpRight className="size-4" strokeWidth={1.8} />
      </span>
      {outline?.length ? (
        <>
          <span className="icon-chip">
            {createElement(Icon, { className: 'size-4', strokeWidth: 1.8 })}
          </span>
          <span className="mt-4 block text-caption font-bold text-foreground">{label}</span>
          <span className="mt-2.5 block space-y-1.5">
            {outline.map((section) => (
              <span key={section} className="flex items-center gap-1.5 text-meta text-muted-foreground">
                <span className="size-1 shrink-0 rounded-full bg-primary/50" />
                <span className="truncate">{section}</span>
              </span>
            ))}
          </span>
        </>
      ) : (
        <span className="absolute inset-0 grid place-items-center">
          <span className="flex flex-col items-center gap-2 text-muted-foreground/60">
            <span className="grid size-9 place-items-center rounded-full border border-dashed border-input">
              <Plus className="size-4" strokeWidth={1.8} />
            </span>
            <span className="text-meta font-medium">A clean page</span>
          </span>
        </span>
      )}
    </span>
    <span className="mt-3 block text-body font-semibold text-foreground">{label}</span>
    <span className="mt-0.5 block text-caption text-muted-foreground">{description}</span>
  </button>
);

export default TemplateCard;
