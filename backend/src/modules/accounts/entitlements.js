/**
 * Plan definitions and the pure entitlement resolver.
 *
 * Rules:
 * - Local AI (deterministic summaries/mind maps/extractive answers) is free for
 *   everyone — it costs nothing to serve and is the product's demo surface.
 * - Provider AI (OpenAI-backed grounded Q&A, synthesized summaries/mind maps,
 *   semantic search) requires a paid plan or super-admin status.
 * - Team plans are seat-based: every member occupying a seat inherits the
 *   account's entitlements.
 */
const PLAN_RANK = Object.freeze({ free: 0, pro: 1, team: 2 });

const PLANS = Object.freeze({
  free: Object.freeze({
    label: 'Free',
    providerAI: false,
    defaultSeats: 3,
    maxSeats: 3
  }),
  pro: Object.freeze({
    label: 'Pro',
    providerAI: true,
    defaultSeats: 10,
    maxSeats: 10
  }),
  team: Object.freeze({
    label: 'Team',
    providerAI: true,
    defaultSeats: 20,
    maxSeats: 500
  })
});

const isKnownPlan = (plan) => Object.prototype.hasOwnProperty.call(PLANS, plan);

const clampSeats = (plan, seats) => {
  const definition = PLANS[plan] || PLANS.free;
  const requested = Number.isInteger(seats) && seats > 0 ? seats : definition.defaultSeats;
  return Math.min(definition.maxSeats, requested);
};

/**
 * The seat capacity an account actually gets. Accounts created before a
 * plan's default grew still receive at least the current default, so no
 * migration is needed when seat allowances change.
 */
const resolveSeatCapacity = (plan, seats) => {
  const definition = PLANS[plan] || PLANS.free;
  const stored = Number.isInteger(seats) && seats > 0 ? seats : 0;
  return Math.min(definition.maxSeats, Math.max(stored, definition.defaultSeats));
};

const resolveEntitlements = ({ plan = 'free', isSuperAdmin = false } = {}) => {
  const effectivePlan = isKnownPlan(plan) ? plan : 'free';
  const definition = PLANS[effectivePlan];
  return {
    plan: effectivePlan,
    planLabel: isSuperAdmin ? 'Super admin' : definition.label,
    isSuperAdmin,
    features: {
      localAI: true,
      providerAI: isSuperAdmin || definition.providerAI
    }
  };
};

module.exports = {
  PLANS,
  PLAN_RANK,
  isKnownPlan,
  clampSeats,
  resolveSeatCapacity,
  resolveEntitlements
};
