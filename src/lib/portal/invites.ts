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

/** Per language: can an invite be sent, and with which wording. */
export async function inviteAvailability(client: any) {
  const rows = await inviteTemplates(client);
  return INVITE_LOCALES.map((locale) => {
    const row = rows.get(locale);
    const approved = Boolean(row?.approved);
    return {
      locale,
      sendable: approved || BUILT_IN.has(locale),
      source: approved ? ('approved' as const) : BUILT_IN.has(locale) ? ('built-in' as const) : ('missing' as const),
    };
  });
}

/**
 * The invite email in `locale`, or null when that language has no approved
 * wording yet. The caller must refuse to send on null.
 */
export async function buildInvite(
  client: any,
  locale: InviteLocale,
  role: 'admin' | 'owner',
  acceptUrl: string
): Promise<BuiltEmail | null> {
  const row = (await inviteTemplates(client)).get(locale);
  if (row?.approved) return templates.inviteFromTemplate(locale, row, acceptUrl);
  if (locale === 'hu' || locale === 'nl') return templates.invite(locale, { role, acceptUrl });
  return null;
}
