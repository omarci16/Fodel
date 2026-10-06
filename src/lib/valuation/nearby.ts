/**
 * What is around a property, from OpenStreetMap: Nominatim finds the place,
 * Overpass lists shops, schools, health care and public transport near it.
 * Server-side and admin-triggered only — both are free community services with
 * usage policies, so there is one geocode and one Overpass call per request,
 * with a User-Agent that says who is asking.
 *
 * It is context for the person reviewing a valuation (and an input the AI
 * summary may cite); it never moves the price band by itself.
 */

const USER_AGENT = 'FODEL-valuation/1.0 (+https://fodel.eu; info@fodel.eu)';
const NEAR_M = 2000;
const FAR_M = 15000;

export type NearbyGroup = {
  key: string;
  labelHu: string;
  radiusM: number;
  count: number;
  nearestM: number | null;
  nearestName: string | null;
};

export type Nearby = {
  center: { lat: number; lon: number; label: string; precise: boolean };
  groups: NearbyGroup[];
  source: string;
  retrievedAt: string;
};

type Tags = Record<string, string>;
const GROUPS: { key: string; labelHu: string; radiusM: number; match: (tags: Tags) => boolean }[] = [
  { key: 'groceries', labelHu: 'Élelmiszerbolt', radiusM: NEAR_M, match: (t) => t.shop === 'supermarket' || t.shop === 'convenience' },
  { key: 'schools', labelHu: 'Iskola, óvoda', radiusM: NEAR_M, match: (t) => t.amenity === 'school' || t.amenity === 'kindergarten' },
  { key: 'health', labelHu: 'Gyógyszertár, orvos', radiusM: NEAR_M, match: (t) => t.amenity === 'pharmacy' || t.amenity === 'doctors' || t.amenity === 'clinic' },
  { key: 'food', labelHu: 'Étterem, kávézó', radiusM: NEAR_M, match: (t) => t.amenity === 'restaurant' || t.amenity === 'cafe' },
  { key: 'services', labelHu: 'Bank, posta', radiusM: NEAR_M, match: (t) => t.amenity === 'bank' || t.amenity === 'post_office' },
  { key: 'bus', labelHu: 'Buszmegálló', radiusM: NEAR_M, match: (t) => t.highway === 'bus_stop' },
  { key: 'rail', labelHu: 'Vasútállomás', radiusM: FAR_M, match: (t) => t.railway === 'station' || t.railway === 'halt' },
  { key: 'hospital', labelHu: 'Kórház', radiusM: FAR_M, match: (t) => t.amenity === 'hospital' },
];

const distanceM = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return Math.round(12_742_000 * Math.asin(Math.sqrt(h)));
};

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, headers: { 'user-agent': USER_AGENT, ...(init.headers ?? {}) } });
    if (!res.ok) throw new Error(`${new URL(url).hostname}-${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** `precise` is true when the exact address was used; otherwise the centre of the settlement. */
export async function geocode(query: { settlement: string; county: string; address?: string | null }) {
  const county = query.county && query.county !== 'Ismeretlen' ? `${query.county} vármegye` : '';
  const place = [query.settlement, county, 'Magyarország'].filter(Boolean).join(', ');
  const q = query.address ? `${query.address}, ${place}` : place;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=hu&q=${encodeURIComponent(q)}`;
  const rows = (await fetchJson(url, {}, 10_000)) as { lat: string; lon: string; display_name: string }[];
  const hit = rows[0];
  if (!hit) return null;
  return { lat: Number(hit.lat), lon: Number(hit.lon), label: hit.display_name, precise: Boolean(query.address) };
}

export async function nearbyPlaces(center: Nearby['center']): Promise<Nearby> {
  const { lat, lon } = center;
  const query = `[out:json][timeout:20];(
    nwr(around:${NEAR_M},${lat},${lon})[shop~"^(supermarket|convenience)$"];
    nwr(around:${NEAR_M},${lat},${lon})[amenity~"^(school|kindergarten|pharmacy|doctors|clinic|restaurant|cafe|bank|post_office)$"];
    nwr(around:${NEAR_M},${lat},${lon})[highway=bus_stop];
    nwr(around:${FAR_M},${lat},${lon})[railway~"^(station|halt)$"];
    nwr(around:${FAR_M},${lat},${lon})[amenity=hospital];
  );out center tags 600;`;
  const data = await fetchJson('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  }, 25_000);

  const elements = (data.elements ?? []) as { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Tags }[];
  const groups: NearbyGroup[] = GROUPS.map((group) => {
    const found = elements
      .map((element) => ({ tags: element.tags ?? {}, point: element.center ?? (element.lat != null && element.lon != null ? { lat: element.lat, lon: element.lon } : null) }))
      .filter((entry) => entry.point && group.match(entry.tags))
      .map((entry) => ({ name: entry.tags.name ?? null, meters: distanceM(center, entry.point!) }))
      .filter((entry) => entry.meters <= group.radiusM)
      .sort((a, b) => a.meters - b.meters);
    return { key: group.key, labelHu: group.labelHu, radiusM: group.radiusM, count: found.length, nearestM: found[0]?.meters ?? null, nearestName: found[0]?.name ?? null };
  });

  return { center, groups, source: '© OpenStreetMap contributors (ODbL)', retrievedAt: new Date().toISOString().slice(0, 10) };
}
