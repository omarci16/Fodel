/**
 * Portal-side property data access.
 *
 * Deliberately separate from src/lib/properties.ts, which is the public
 * site's read-only, locale-resolved, RLS-anon view of *published* listings
 * only. This module is the portal's view: every status, every locale as its
 * own editable row, queried through the signed-in user's own session client
 * so Row-Level Security — not this code — decides whether they can see or
 * touch a given property.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type PortalTranslation = {
  locale: string;
  title: string;
  subtitle: string | null;
  description: string;
  body: string;
  condition: string | null;
  heating: string | null;
  tag: string | null;
};

export type PortalMedia = {
  id: string;
  storage_path: string;
  alt: Record<string, string>;
  label: Record<string, string> | null;
  sort_order: number;
  is_hero: boolean;
  width: number | null;
  height: number | null;
};

export type PortalProperty = {
  id: string;
  ref: string;
  owner_id: string | null;
  status: string;
  reserved: boolean;
  category: string;
  settlement: string;
  county: string;
  region: string;
  lat: number;
  lng: number;
  precision: string;
  price_eur: number;
  price_huf: number;
  price_asof: string;
  price_negotiable: boolean;
  floor_m2: number | null;
  plot_m2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  year_built: number | null;
  renovated_in: number | null;
  epc_class: string;
  features: string[];
  video_url: string | null;
  seller_contact_visible: boolean;
  seller_name: string | null;
  seller_phone: string | null;
  seller_speaks: string[];
  package: string;
  featured: boolean;
  homepage_featured: boolean;
  homepage_order: number;
  published_at: string | null;
  expires_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  translations: PortalTranslation[];
  media: PortalMedia[];
};

const SELECT = '*, property_translations(*), property_media(*)';

export async function getProperty(
  supabase: SupabaseClient,
  id: string
): Promise<PortalProperty | null> {
  const { data, error } = await supabase.from('properties').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...(data as any),
    translations: (data as any).property_translations ?? [],
    media: ((data as any).property_media ?? []).sort(
      (a: PortalMedia, b: PortalMedia) => a.sort_order - b.sort_order
    ),
  };
}

export async function listProperties(
  supabase: SupabaseClient,
  opts: { status?: string } = {}
): Promise<PortalProperty[]> {
  let query = supabase.from('properties').select(SELECT).order('created_at', { ascending: false });
  if (opts.status) query = query.eq('status', opts.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    ...row,
    translations: row.property_translations ?? [],
    media: (row.property_media ?? []).sort((a: PortalMedia, b: PortalMedia) => a.sort_order - b.sort_order),
  }));
}

/** A new, empty draft owned by the caller. RLS's `properties_owner_write` policy is what actually enforces ownership. */
export async function createDraft(supabase: SupabaseClient, ownerId: string): Promise<string> {
  const { data: refRow, error: refError } = await supabase.rpc('next_property_ref');
  if (refError) throw new Error(refError.message);

  const { data, error } = await supabase
    .from('properties')
    .insert({
      ref: refRow as string,
      owner_id: ownerId,
      status: 'draft',
      category: 'house',
      settlement: '',
      county: '',
      region: '',
      lat: 47.1625, // Hungary's rough geographic centre — a sensible default pin
      lng: 19.5033,
      price_eur: 0,
      price_huf: 0,
      price_asof: new Date().toISOString().slice(0, 10),
      plot_m2: 0,
      package: 'cheap-6m',
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const { error: trError } = await supabase.from('property_translations').insert({
    property_id: data.id,
    locale: 'hu',
    title: 'Új hirdetés',
    description: '',
  });
  if (trError) throw new Error(trError.message);

  return data.id as string;
}

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Piszkozat',
  submitted: 'Elbírálásra vár',
  changes_requested: 'Javítás szükséges',
  published: 'Élő hirdetés',
  sold: 'Eladva',
  archived: 'Archiválva',
};

export const CATEGORY_LABEL: Record<string, string> = {
  house: 'Ház',
  holiday: 'Nyaraló',
  farm: 'Tanya',
  land: 'Telek',
  commercial: 'Üzleti ingatlan',
  agricultural: 'Agráringatlan',
  mansion: 'Kúria, kastély',
  apartment: 'Lakás',
};

export const EPC_OPTIONS = [
  'AA++', 'AA+', 'AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'II', 'JJ', 'pending', 'exempt',
];

export const LOCALE_OPTIONS = [
  { value: 'hu', label: 'Magyar (kötelező)' },
  { value: 'nl', label: 'Holland' },
  { value: 'de', label: 'Német' },
  { value: 'en', label: 'Angol' },
  { value: 'fr', label: 'Francia' },
];
