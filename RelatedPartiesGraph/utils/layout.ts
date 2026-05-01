export interface ConcentricLayoutOptions {
  name: 'concentric';
  concentric: (node: { data: (key: string) => unknown }) => number;
  levelWidth: () => number;
  minNodeSpacing: number;
  animate: boolean;
  animationDuration: number;
  fit: boolean;
  padding: number;
}

export function getConcentricLayout(): ConcentricLayoutOptions {
  return {
    name: 'concentric',
    concentric: (node) => {
      const level = node.data('level') as number;
      return 4 - level;
    },
    levelWidth: () => 1,
    minNodeSpacing: 40,
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 40,
  };
}

export function getNodeDimensions(level: number): { width: number; height: number } {
  switch (level) {
    case 0: return { width: 160, height: 50 };
    case 1: return { width: 140, height: 44 };
    case 2: return { width: 130, height: 40 };
    case 3: return { width: 120, height: 36 };
    default: return { width: 120, height: 36 };
  }
}
