// MIRROR OF WealthAllocationControl/utils/allocationLogic.ts
// Refactor to a shared module if/when a third consumer needs this logic.
// Until then, fixes must be applied in both files. See:
// docs/superpowers/specs/2026-05-05-kycfulltakeover-design.md (resolved Q1)

export function headroomFor(idx: number, vals: number[]): number {
  const sumOthers = vals.reduce((s, v, i) => (i === idx ? s : s + v), 0);
  return Math.max(0, 100 - sumOthers);
}

export function applySlider(idx: number, raw: number, vals: number[]): number[] {
  const hr = headroomFor(idx, vals);
  const next = [...vals];
  next[idx] = Math.min(Math.max(0, raw), hr);
  return next;
}

export function applyFieldBlur(idx: number, raw: number, vals: number[]): number[] {
  const hr = headroomFor(idx, vals);
  const next = [...vals];
  next[idx] = Math.round(Math.min(Math.max(0, raw), hr) * 100) / 100;
  return next;
}

export function formatCHF(value: number): string {
  const rounded = Math.round(value);
  const str = rounded.toString();
  const parts: string[] = [];
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i));
  }
  return parts.join("'");
}

export function parseCHFInput(raw: string): number {
  const cleaned = raw.replace(/['\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.max(0, num);
}

export function totalAllocated(vals: number[]): number {
  return vals.reduce((s, v) => s + v, 0);
}
