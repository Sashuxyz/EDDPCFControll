import { ColorMapInput } from '../types';

const NEUTRAL = '#605E5C';
const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function isValidHex(s: string): boolean {
  return HEX_RE.test(s);
}

export function buildColorMap(input: ColorMapInput): Map<number, string> {
  const map = new Map<number, string>();
  for (let i = 0; i < 5; i++) {
    const c = input.colors[i];
    if (!c || !isValidHex(c)) continue;
    const v = input.values[i];
    const key = typeof v === 'number' && isFinite(v) ? v : input.options[i]?.Value;
    if (typeof key !== 'number') continue;
    map.set(key, c);
  }
  return map;
}

export function colorFor(value: number, map: Map<number, string>): string {
  return map.get(value) ?? NEUTRAL;
}
