/**
 * Admin invites: which language one can be written in, and with what words.
 *
 * Hungarian and Dutch have reviewed built-in wording (src/lib/email/copy) that
 * has been in use since 1.0, so they can always be sent; an approved template
 * replaces it once Gábor and Éva supply their final text. English and German
 * have no reviewed wording at all, so they can only be sent once an approved
 * template exists — never with placeholder text (brief §7).
 *
 * The language is always the admin's explicit choice. Nothing is guessed from
 * an email address or the admin's own location.
 *
 * Approved templates are the *owner* letter ("Kedves Tulajdonos!"). An admin
 * invite always uses the built-in admin wording, so approving the owner text
 * can never turn a colleague's invite into a letter to a property owner
 * (brief 3 §B.1). English and German therefore have no admin invite at all.
 */
import { templates, type BuiltEmail, type InviteTemplate } from '~/lib/email/templates';

export const INVITE_LOCALES = ['hu', 'nl', 'en', 'de'] as const;
export type InviteLocale = (typeof INVITE_LOCALES)[number];

const BUILT_IN: ReadonlySet<InviteLocale> = new Set(['hu', 'nl']);

export function isInviteLocale(value: unknown): value is InviteLocale {
  return (INVITE_LOCALES as readonly unknown[]).includes(value);
}

export type TemplateRow = InviteTemplate & { locale: InviteLocale; approved: boolean };

/** Every stored invite template, approved or not — for the editor. */
export async function inviteTemplates(client: any): Promise<Map<InviteLocale, TemplateRow>> {
  const { data, error } = await client
    .from('email_templates')
    .select('locale, subject, heading, body, cta, approved')
    .eq('key', 'invite');
  if (error) return new Map();
  return new Map((data ?? []).map((row: TemplateRow) => [row.locale, row]));
}

export type InviteRole = 'admin' | 'owner';
export type InviteSource = 'approved' | 'built-in' | 'missing';

/** Which wording an invite in `locale` for `role` would use. Pure, so it is testable. */
export function inviteSource(locale: InviteLocale, role: InviteRole, approved: boolean): InviteSource {
  if (role === 'owner' && approved) return 'approved';
  return BUILT_IN.has(locale) ? 'built-in' : 'missing';
}

/** Per language and role: can an invite be sent, and with which wording. */
export async function inviteAvailability(client: any) {
  const rows = await inviteTemplates(client);
  return INVITE_LOCALES.map((locale) => {
    const approved = Boolean(rows.get(locale)?.approved);
    const owner = inviteSource(locale, 'owner', approved);
    const admin = inviteSource(locale, 'admin', approved);
    return { locale, owner, admin };
  });
}

/**
 * The invite email in `locale`, or null when that language has no approved
 * wording yet. The caller must refuse to send on null.
 */
export async function buildInvite(
  client: any,
  locale: InviteLocale,
  role: InviteRole,
  acceptUrl: string
): Promise<BuiltEmail | null> {
  const row = role === 'owner' ? (await inviteTemplates(client)).get(locale) : undefined;
  const source = inviteSource(locale, role, Boolean(row?.approved));
  if (source === 'approved' && row) return templates.inviteFromTemplate(locale, row, acceptUrl);
  if (source === 'built-in' && (locale === 'hu' || locale === 'nl')) {
    return templates.invite(locale, { role, acceptUrl });
  }
  return null;
}
