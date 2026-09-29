/**
 * Hungarian wording for everything the portal would otherwise show as a code.
 *
 * The database keeps its stable English keys (`listing.approve`, `refunded`,
 * `duplicate key value…`) — those are identifiers, and renaming them would be
 * a data migration. What an admin reads is decided here, once, so the
 * activity log, the payment timeline and the people view can never disagree
 * about what an event is called.
 */

export const EVENT_LABEL: Record<string, string> = {
  'enquiry.created': 'Érdeklődés érkezett',
  'search_request.created': 'Kerestetési megbízás',
  'listing.intake': 'Hirdetésfeladás (regisztráció indult)',
  'callback.requested': 'Visszahívást kértek',
  'referral.created': 'Ajánlás érkezett',
  'valuation.requested': 'Értékbecslést kértek',
  'valuation.approved': 'Értékbecslés kiadva',
  'valuation.rejected': 'Értékbecslés elvetve',
  'valuation.info_requested': 'Értékbecsléshez hiánypótlás kérve',
  'listing.submit': 'Hirdetés beküldve elbírálásra',
  'listing.approve': 'Hirdetés jóváhagyva',
  'listing.request_changes': 'Javítás kérve',
  'listing.reject': 'Hirdetés elutasítva',
  'listing.mark_sold': 'Eladottnak jelölve',
  'listing.archive': 'Archiválva',
  'listing.delete': 'Hirdetés törölve',
  'listing.edited': 'Hirdetés szerkesztve',
  'listing.published': 'Hirdetés élesítve',
  'listing.curation': 'Top 10 válogatás módosítva',
  'media.uploaded': 'Fénykép feltöltve',
  'ai_suggestion.accepted': 'AI szövegjavaslat elfogadva',
  'payment.manual': 'Átutalás rögzítve',
  'payment.refunded': 'Visszatérítés rögzítve',
  'invoice.issued': 'Számla kiállítva',
  'invoice.credit_note_issued': 'Jóváíró számla kiállítva',
  'blog.published': 'Cikk publikálva',
  'blog.unpublished': 'Cikk visszavonva',
  'auth.login': 'Bejelentkezés',
  'auth.registered': 'Regisztráció befejezve',
  'invite.sent': 'Meghívó elküldve',
  'activity.exported': 'Napló exportálva',
  'payments.exported': 'Pénzügyi lista exportálva',
  'service.requested': 'Helyszíni szolgáltatást kértek',
  'service.cancelled': 'Helyszíni szolgáltatás visszavonva',
  'service.updated': 'Helyszíni szolgáltatás módosítva',
  'valuation.judicial_requested': 'Hivatalos értékbecslést kértek',
  'valuation.instant_shown': 'Azonnali becslés megjelenítve',
  'estimate.settings': 'Becslési beállítások módosítva',
};

/** Unknown kinds (a future call site, an old row) still read as Hungarian, with the key kept for support. */
export function eventLabel(kind: string): string {
  return EVENT_LABEL[kind] ?? `Egyéb esemény (${kind})`;
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Fizetésre vár',
  paid: 'Fizetve (kártya)',
  manual: 'Fizetve (átutalás)',
  cancelled: 'Visszavonva',
  refunded: 'Visszatérítve',
};

/** How the money moved, as distinct from where the order stands. */
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  pending: '—',
  paid: 'Bankkártya (Stripe)',
  manual: 'Banki átutalás',
  cancelled: '—',
  refunded: '—',
};

export const VALUATION_STATUS_LABEL: Record<string, string> = {
  queued: 'Beküldve',
  insufficient_data: 'Kevés összehasonlító adat',
  needs_review: 'Ellenőrzés alatt',
  needs_info: 'Hiánypótlás szükséges',
  approved: 'Jóváhagyva, kiadva',
  rejected: 'Elvetve',
};

export const LOCALE_LABEL: Record<string, string> = {
  hu: 'Magyar',
  nl: 'Holland',
  en: 'Angol',
  de: 'Német',
  fr: 'Francia',
};

/**
 * A database or auth error, in words an admin can act on.
 *
 * Supabase and GoTrue answer in English. The handful of failures a person can
 * actually cause and fix get a real sentence; anything else gets a
 * Hungarian lead-in with the original kept in brackets, because a support
 * request with the technical text in it is far easier to answer than
 * "valami hiba történt".
 */
export function friendlyError(raw: string | null | undefined): string {
  const message = String(raw ?? '').trim();
  if (!message) return 'Váratlan hiba történt.';
  const rules: [RegExp, string][] = [
    [/duplicate key.*\(locale, slug\)|blog_posts_locale_slug/i, 'Ezen a nyelven már van cikk ezzel az URL-lel (slug). Válasszon másikat.'],
    [/duplicate key|already exists|unique constraint/i, 'Ilyen elem már létezik.'],
    [/already (been )?registered|user already/i, 'Ezzel az e-mail címmel már van fiók.'],
    [/password.*(at least|characters|short)/i, 'A jelszó túl rövid — legalább 8 karakter legyen.'],
    [/invalid email|email.*invalid/i, 'Az e-mail cím formátuma nem megfelelő.'],
    [/invalid login credentials/i, 'Hibás e-mail cím vagy jelszó.'],
    [/row-level security|permission denied|not allowed/i, 'Ehhez a művelethez nincs jogosultsága.'],
    [/violates check constraint.*whatsapp/i, 'A WhatsApp-számot nemzetközi formátumban adja meg, szóközök nélkül (pl. +36301234567).'],
    [/violates check constraint/i, 'Az egyik megadott érték nem megengedett.'],
    [/violates foreign key/i, 'Az elem máshol használatban van, ezért nem módosítható így.'],
    [/column .* does not exist|could not find the .* column|relation .* does not exist/i, 'Az adatbázis még nincs frissítve — futtassa le a legújabb migrációt (0015).'],
    [/fetch failed|network|timeout|ECONN/i, 'Az adatbázis most nem érhető el. Próbálja újra néhány perc múlva.'],
  ];
  for (const [pattern, text] of rules) if (pattern.test(message)) return text;
  return `Váratlan hiba történt (technikai részlet: ${message})`;
}
