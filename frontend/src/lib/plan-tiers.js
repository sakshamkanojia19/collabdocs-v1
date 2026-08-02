/**
 * The three plan tiers with demo pricing — single source of truth for the
 * Settings comparison and the landing page pricing section. Free is framed as
 * complete-with-a-ceiling, not crippled: the paid difference is reasoning
 * (provider AI) and team scale, never the core product.
 */
export const PLAN_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    seats: '3 seats',
    tagline: 'AI that works out of the box — nothing leaves your workspace.',
    features: [
      'Unlimited documents, chat & decisions',
      'Instant summaries & mind maps, with citations',
      'Action items extracted from documents',
      'Onboard 2 teammates into your organization',
      'Keyword search across your workspace'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹799',
    period: 'per month · demo pricing',
    seats: '10 seats',
    highlight: true,
    tagline: 'Deeper answers, smarter search, and Q&A on any document.',
    features: [
      'Everything in Free',
      'Advanced AI answers with citations',
      'Ask any document directly',
      'Search by meaning, not just keywords',
      'Onboard 9 teammates — all with full AI'
    ]
  },
  {
    id: 'team',
    name: 'Team',
    price: '₹2,499',
    period: 'per month · demo pricing',
    seats: '20 seats',
    tagline: 'Your organization’s knowledge base, shared by default.',
    features: [
      'Everything in Pro',
      'Workspace-visible documents — no per-person invites',
      '20 seats for one organization',
      'Org-wide decision log & knowledge graph',
      'Priority onboarding support'
    ]
  }
];
