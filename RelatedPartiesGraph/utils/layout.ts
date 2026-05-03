export function getGraphLayout(): Record<string, unknown> {
  return {
    name: 'cose',
    idealEdgeLength: 180,
    nodeOverlap: 40,
    nodeRepulsion: 8000,
    edgeElasticity: 100,
    gravity: 0.25,
    numIter: 1000,
    animate: 'end',
    animationDuration: 400,
    fit: true,
    padding: 50,
    randomize: false,
  };
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
