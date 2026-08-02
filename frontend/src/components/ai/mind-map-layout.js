export const NODE_WIDTH = 232;
export const NODE_HEIGHT = 88;
const COLUMN_GAP = 108;
const SIBLING_GAP = 22;
const BRANCH_GAP = 40;
const MARGIN = 80;

/**
 * Tidy hierarchical layout.
 *
 * The previous layout placed every node of a depth in one vertically centred
 * column, which let unrelated branches collide and dragged edges across the whole
 * canvas. This walks the tree instead: each leaf claims its own row, and each
 * parent centres on the rows its children occupy, so subtrees can never overlap.
 */
const buildForest = (nodes) => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const childrenOf = new Map(nodes.map((node) => [node.id, []]));
  const roots = [];

  nodes.forEach((node) => {
    const parentId = node.parentId;
    // A parent that does not exist (or a self/cycle reference) is treated as a root
    // so a malformed graph still renders every node exactly once.
    if (parentId && parentId !== node.id && byId.has(parentId)) {
      childrenOf.get(parentId).push(node);
    } else {
      roots.push(node);
    }
  });

  // Guard against cycles introduced by manual editing: anything unreachable from a
  // root is promoted to a root.
  const reachable = new Set();
  const walk = (node, guard = new Set()) => {
    if (guard.has(node.id)) return;
    guard.add(node.id);
    reachable.add(node.id);
    childrenOf.get(node.id).forEach((child) => walk(child, guard));
  };
  roots.forEach((root) => walk(root));
  nodes.forEach((node) => {
    if (!reachable.has(node.id)) {
      roots.push(node);
      reachable.add(node.id);
    }
  });

  return { childrenOf, roots };
};

export const computeLayout = (mindMap) => {
  const nodes = mindMap?.nodes || [];
  if (nodes.length === 0) return null;

  const { childrenOf, roots } = buildForest(nodes);
  const positions = new Map();
  const rowStep = NODE_HEIGHT + SIBLING_GAP;
  let cursor = 0;

  const place = (node, depth, seen) => {
    if (seen.has(node.id)) return null;
    seen.add(node.id);

    const children = childrenOf.get(node.id) || [];
    const x = MARGIN + depth * (NODE_WIDTH + COLUMN_GAP);

    if (children.length === 0) {
      const y = MARGIN + cursor * rowStep;
      cursor += 1;
      positions.set(node.id, { x, y, depth });
      return y;
    }

    const childCentres = children
      .map((child) => place(child, depth + 1, seen))
      .filter((value) => value !== null);

    const y = childCentres.length
      ? (Math.min(...childCentres) + Math.max(...childCentres)) / 2
      : MARGIN + (cursor += 1) * rowStep;

    positions.set(node.id, { x, y, depth });
    return y;
  };

  const seen = new Set();
  roots.forEach((root, index) => {
    if (index > 0) cursor += BRANCH_GAP / rowStep;
    place(root, 0, seen);
  });

  // Manual positions win, so a node stays exactly where the user dropped it.
  nodes.forEach((node) => {
    if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
      const auto = positions.get(node.id);
      positions.set(node.id, { x: node.x, y: node.y, depth: auto?.depth ?? 0 });
    }
  });

  const values = [...positions.values()];
  const width = Math.max(...values.map((p) => p.x)) + NODE_WIDTH + MARGIN;
  const height = Math.max(...values.map((p) => p.y)) + NODE_HEIGHT + MARGIN;

  const edges = (
    mindMap.edges?.length
      ? mindMap.edges
      : nodes
          .filter((node) => node.parentId)
          .map((node) => ({ source: node.parentId, target: node.id }))
  ).filter((edge) => positions.has(edge.source) && positions.has(edge.target));

  return { nodes, positions, edges, width, height };
};

/** Cubic path between two node boxes, drawn edge-to-edge rather than centre-to-centre. */
export const edgePath = (source, target) => {
  const startsLeft = source.x <= target.x;
  const x1 = startsLeft ? source.x + NODE_WIDTH : source.x;
  const x2 = startsLeft ? target.x : target.x + NODE_WIDTH;
  const y1 = source.y + NODE_HEIGHT / 2;
  const y2 = target.y + NODE_HEIGHT / 2;
  const midpoint = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midpoint} ${y1}, ${midpoint} ${y2}, ${x2} ${y2}`;
};
