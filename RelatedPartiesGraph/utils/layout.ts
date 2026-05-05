export function getGraphLayout(): Record<string, unknown> {
  return {
    name: 'preset',
    fit: true,
    padding: 40,
    animate: false,
  };
}

// Computes deterministic ring positions for every node from a centre + edge
// list. Level 0 = centre. Each subsequent level distributes its nodes evenly
// around its parent's angular sector.
export function computePositions(
  centreId: string,
  nodeLevels: Map<string, number>,
  edges: Array<{ source: string; target: string }>
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  positions.set(centreId, { x: 0, y: 0 });

  // Build parent map: for each node, its closest-to-centre parent
  const parents = new Map<string, string>();
  for (const e of edges) {
    const sLvl = e.source === centreId ? 0 : (nodeLevels.get(e.source) ?? 99);
    const tLvl = e.target === centreId ? 0 : (nodeLevels.get(e.target) ?? 99);
    if (sLvl < tLvl && !parents.has(e.target)) {
      parents.set(e.target, e.source);
    } else if (tLvl < sLvl && !parents.has(e.source)) {
      parents.set(e.source, e.target);
    }
  }

  const RADIUS_PER_LEVEL = 220;

  // Group level-1 nodes — they all surround the centre
  const level1: string[] = [];
  nodeLevels.forEach((lvl, id) => { if (lvl === 1) level1.push(id); });
  level1.sort();

  level1.forEach((id, idx) => {
    const angle = (idx / Math.max(1, level1.length)) * Math.PI * 2 - Math.PI / 2;
    positions.set(id, {
      x: Math.cos(angle) * RADIUS_PER_LEVEL,
      y: Math.sin(angle) * RADIUS_PER_LEVEL,
    });
  });

  // For deeper levels, place children fanned out from their parent
  // (in the direction away from the centre).
  const placeChildren = (level: number) => {
    const childrenByParent = new Map<string, string[]>();
    nodeLevels.forEach((lvl, id) => {
      if (lvl !== level) return;
      const parent = parents.get(id);
      if (!parent) return;
      if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
      childrenByParent.get(parent)!.push(id);
    });

    childrenByParent.forEach((children, parent) => {
      const parentPos = positions.get(parent);
      if (!parentPos) return;
      // Direction from centre to parent
      const dx = parentPos.x;
      const dy = parentPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const baseAngle = Math.atan2(dy, dx);
      const fan = Math.PI / 3; // 60° fan
      children.sort();
      children.forEach((id, idx) => {
        const t = children.length === 1 ? 0 : (idx / (children.length - 1)) * 2 - 1;
        const angle = baseAngle + t * fan / 2;
        const r = dist + RADIUS_PER_LEVEL;
        positions.set(id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      });
    });
  };

  placeChildren(2);
  placeChildren(3);

  // Any node still without a position (orphan): scatter at outer ring
  let orphanIdx = 0;
  nodeLevels.forEach((lvl, id) => {
    if (positions.has(id)) return;
    const angle = (orphanIdx++) * 0.7;
    const r = RADIUS_PER_LEVEL * (lvl + 1);
    positions.set(id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  });

  return positions;
}

export function getNodeDimensions(level: number): { width: number; height: number } {
  switch (level) {
    case 0: return { width: 160, height: 44 };
    case 1: return { width: 150, height: 40 };
    case 2: return { width: 140, height: 36 };
    case 3: return { width: 130, height: 34 };
    default: return { width: 130, height: 34 };
  }
}
