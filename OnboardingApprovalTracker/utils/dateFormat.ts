/**
 * Convert a UTC Date to the user's D365 timezone by adding the
 * D365 user-timezone offset (which getTimeZoneOffsetMinutes returns
 * in minutes east of UTC). The resulting Date object can then be
 * formatted using getUTC* accessors to display the user-local time
 * regardless of the browser's local timezone.
 */
function toUserTimezone(d: Date, offsetMinutes: number): Date {
  return new Date(d.getTime() + offsetMinutes * 60_000);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDate(d: Date | null | undefined, offsetMinutes = 0): string {
  if (!d) return '';
  const local = toUserTimezone(d, offsetMinutes);
  return `${pad(local.getUTCDate())}.${pad(local.getUTCMonth() + 1)}.${local.getUTCFullYear()}`;
}

export function formatDateTime(d: Date | null | undefined, offsetMinutes = 0): string {
  if (!d) return '';
  const local = toUserTimezone(d, offsetMinutes);
  const dd = pad(local.getUTCDate());
  const mm = pad(local.getUTCMonth() + 1);
  const yyyy = local.getUTCFullYear();
  const hh = pad(local.getUTCHours());
  const mi = pad(local.getUTCMinutes());
  return `${dd}.${mm}.${yyyy}, ${hh}:${mi}`;
}

export function getUserTimezoneOffsetMinutes(
  context: ComponentFramework.Context<unknown>,
  forDate?: Date | null
): number {
  try {
    const userSettings = (context as unknown as {
      userSettings?: { getTimeZoneOffsetMinutes?: (d?: Date) => number };
    }).userSettings;
    if (userSettings?.getTimeZoneOffsetMinutes) {
      return userSettings.getTimeZoneOffsetMinutes(forDate ?? undefined);
    }
  } catch {
    // fall through
  }
  return 0;
}
