// Swiss number formatting: 1'000'000.50 (apostrophe thousands, dot decimal).
// Swiss-German date: dd.MM.yyyy via toLocaleDateString('de-CH').

export function formatSwissNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return '';
  // Use a regex to inject apostrophes; Intl.NumberFormat de-CH varies by runtime.
  const [whole, frac] = String(n).split('.');
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return frac !== undefined ? `${groupedWhole}.${frac}` : groupedWhole;
}

export function parseSwissNumber(s: string): number | null {
  if (typeof s !== 'string' || s.trim() === '') return null;
  const cleaned = s.replace(/'/g, '').trim();
  const n = Number(cleaned);
  return isFinite(n) ? n : null;
}

export function formatSwissDate(iso: string | null | undefined): string {
  if (typeof iso !== 'string' || iso === '') return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
