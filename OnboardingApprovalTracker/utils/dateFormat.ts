export function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return '';
  const date = d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}
