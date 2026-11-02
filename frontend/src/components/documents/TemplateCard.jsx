import { createElement } from 'react';

/**
 * Compact template tile: icon chip beside the template name. The title
 * attribute lists the sections the template creates.
 */
const TemplateCard = ({ icon: Icon, label, outline, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={outline?.length ? `Creates: ${outline.join(', ')}` : undefined}
    className="interactive-card flex min-w-0 items-center gap-3 p-3 text-left disabled:pointer-events-none disabled:opacity-60"
  >
    <span className="icon-chip">{createElement(Icon, { className: 'size-4', strokeWidth: 1.8 })}</span>
    <span className="min-w-0 text-body font-semibold text-foreground">{label}</span>
  </button>
);

export default TemplateCard;
