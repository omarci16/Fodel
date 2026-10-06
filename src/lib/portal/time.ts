/** Small Hungarian time helpers shared by the portal screens. */

const HOUR = 3600_000;

/** Hours since an ISO timestamp (never negative). */
export function hoursSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / HOUR);
}

/** "most", "3 órája", "2 napja", "3 hete" — what a person would say. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const hours = hoursSince(iso);
  if (hours < 1) return 'most';
  if (hours < 24) return `${Math.floor(hours)} órája`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} napja`;
  if (days < 60) return `${Math.floor(days / 7)} hete`;
  return `${Math.floor(days / 30)} hónapja`;
}

/** The greeting for the hour in Budapest. */
export function greeting(date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('hu-HU', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Budapest' }).format(date)
  );
  if (hour < 10) return 'Jó reggelt!';
  if (hour < 18) return 'Jó napot!';
  return 'Jó estét!';
}

/** "2026. október 6., kedd". */
export function longDate(date = new Date()): string {
  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Europe/Budapest',
  }).format(date);
}

/** The Hungarian title of a listing, or its reference when untitled. */
export function listingName(row: { ref?: string; property_translations?: { locale: string; title: string }[]; translations?: { locale: string; title: string }[] }): string {
  const list = row.property_translations ?? row.translations ?? [];
  const title = list.find((t) => t.locale === 'hu')?.title?.trim();
  return title || (row.ref ? `#${row.ref}` : 'Névtelen hirdetés');
}
