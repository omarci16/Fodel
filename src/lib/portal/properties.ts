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
import { CATEGORIES, type CategoryKey } from '~/i18n/ui';

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
      price_eur: 1,
      price_huf: 1,
      price_asof: new Date().toISOString().slice(0, 10),
      plot_m2: 1,
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

/**
 * What someone typed on the public ad-submission form.
 *
 * Stored on the invite as `payload` and replayed into their first draft when
 * they accept it — see src/pages/api/portal/invite/accept.ts. Every field is
 * optional: this is a marketing form, not a validated listing, and it is only
 * ever a head start on the real editor.
 */
export type ListingIntake = {
  phone?: string;
  propertyType?: string;
  settlement?: string;
  county?: string;
  priceHuf?: string;
  floorM2?: string;
  plotM2?: string;
  description?: string;
  package?: string;
  speaks?: string;
  ownerVisible?: string;
  locale?: string;
};

/**
 * The ad-submission form's type dropdown is built from CATEGORIES, so it
 * submits a category key ('house', 'mansion', …) directly — not a label and
 * not free text. Validating against the same source that built the dropdown
 * means the two can never drift, and an unrecognised value is simply ignored
 * rather than silently filed as a house.
 */
function intakeCategory(value: string | undefined): CategoryKey | null {
  const key = (value ?? '').trim();
  return key in CATEGORIES ? (key as CategoryKey) : null;
}

/**
 * Parses a number a person typed into a free-text field.
 *
 * Hungarian and Dutch both group thousands with a dot or a space and use a
 * comma for decimals — "64.000.000" is sixty-four million, not sixty-four.
 * So: peel off a genuine decimal tail first (a comma or dot followed by one or
 * two digits at the very end), then treat every remaining separator as
 * grouping and discard it.
 *
 * Getting this backwards is not a rounding error. Reading "64.000.000 Ft" as
 * 64 would put a mansion on the site at the price of a bicycle.
 */
function toNumber(value: string | undefined): number | null {
  if (!value) return null;

  const raw = String(value).trim();
  const decimal = raw.match(/[.,](\d{1,2})\s*$/);
  const wholePart = decimal ? raw.slice(0, decimal.index) : raw;

  const digits = wholePart.replace(/\D/g, '');
  if (!digits) return null;

  const n = Number(decimal ? `${digits}.${decimal[1]}` : digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Replays a public-form submission into an existing draft.
 *
 * Deliberately conservative: it only writes fields the form actually captured
 * and that survive as valid values. Anything missing keeps `createDraft`'s
 * placeholder, so the draft always satisfies the table's CHECK constraints and
 * the owner sees an editor with real content in it rather than a validation
 * error on first save.
 */
export async function applyIntake(
  supabase: SupabaseClient,
  propertyId: string,
  intake: ListingIntake
): Promise<void> {
  const patch: Record<string, unknown> = {};

  const category = intakeCategory(intake.propertyType);
  if (category) patch.category = category;

  if (intake.settlement) patch.settlement = intake.settlement.slice(0, 120);
  if (intake.county) patch.county = intake.county.slice(0, 60);

  const priceHuf = toNumber(intake.priceHuf);
  if (priceHuf) {
    patch.price_huf = Math.round(priceHuf);
    // A working placeholder so the listing is coherent before an admin sets a
    // real rate. The editor requires both figures anyway before submission.
    patch.price_eur = Math.max(1, Math.round(priceHuf / 400));
  }

  const floor = toNumber(intake.floorM2);
  if (floor) patch.floor_m2 = floor;

  const plot = toNumber(intake.plotM2);
  if (plot) patch.plot_m2 = plot;

  if (intake.package === 'normal-12m' || intake.package === 'cheap-6m') {
    patch.package = intake.package;
  }

  if (intake.ownerVisible) {
    patch.seller_contact_visible = /^(igen|ja|yes|true)$/i.test(intake.ownerVisible.trim());
  }
  if (intake.phone) patch.seller_phone = intake.phone.slice(0, 40);

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('properties').update(patch).eq('id', propertyId);
    if (error) throw new Error(error.message);
  }

  if (intake.description) {
    const description = intake.description.slice(0, 600);
    const { error } = await supabase
      .from('property_translations')
      .update({
        description,
        body: intake.description,
        // The Hungarian label, not the raw key — otherwise a kúria arrives in
        // the editor titled "Csemő — mansion".
        title: intake.settlement
          ? `${intake.settlement} — ${category ? CATEGORIES[category].hu.label : 'ingatlan'}`
          : 'Új hirdetés',
      })
      .eq('property_id', propertyId)
      .eq('locale', 'hu');
    if (error) throw new Error(error.message);
  }
}

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Piszkozat',
  submitted: 'Elbírálásra vár',
  awaiting_payment: 'Fizetésre vár',
  changes_requested: 'Javítás szükséges',
  published: 'Élő hirdetés',
  sold: 'Eladva',
  archived: 'Archiválva',
};

/** Statuses whose fields an owner may still change. Mirrors the RLS policy exactly. */
export const OWNER_EDITABLE = ['draft', 'changes_requested'];

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
