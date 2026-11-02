import { cn } from '@/lib/utils';

// Fictional team used across every mockup so the story reads consistently.
export const people = {
  riya: { initials: 'RS', tone: 'primary' },
  arjun: { initials: 'AM', tone: 'info' },
  maya: { initials: 'MK', tone: 'success' },
  dev: { initials: 'DP', tone: 'warning' }
};

export const Pill = ({ tone = 'neutral', children }) => (
  <span className={cn('status-pill', `status-pill--${tone}`)}>{children}</span>
);

