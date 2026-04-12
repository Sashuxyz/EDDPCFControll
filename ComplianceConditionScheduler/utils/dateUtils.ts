export function formatDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function addDays(date: string | null, days: number | null): string | null {
  if (!date || days == null) return null;
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function intervalLabel(days: number): string {
  if (days === 365) return 'annually';
  if (days === 180) return 'semi-annually';
  if (days === 90) return 'quarterly';
  if (days === 30) return 'monthly';
  return `every ${days} days`;
}
