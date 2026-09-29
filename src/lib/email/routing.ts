/**
 * Who FODEL's email comes from, where replies go, and which inbox receives
 * the website's forms — the one place these addresses are decided.
 *
 * Deployment configuration (environment variables), not an admin setting, on
 * purpose: a sender address only delivers once its domain is verified at the
 * mail provider, so changing it is a DNS task, not a form field. Whether FODEL
 * ends up with one shared address or shared plus personal ones is still an
 * open business decision (brief §9) — whichever it is, it changes here and in
 * the environment, nowhere else.
 *
 *   FODEL_FROM      sender, e.g. "FODEL <website@fodel.eu>" (verified domain)
 *   FODEL_INBOX     where form submissions and admin fallbacks are delivered
 *   FODEL_REPLY_TO  where a customer's reply lands; defaults to FODEL_INBOX
 */
import { COMPANY } from '~/config/company';

/** `portal` is lifecycle mail (accounts, listings); `website` is a form's own notification. */
export function senderAddress(kind: 'portal' | 'website' = 'portal'): string {
  const configured = import.meta.env.FODEL_FROM;
  if (configured) return configured;
  return kind === 'portal' ? 'FODEL Portál <portal@fodel.eu>' : 'FODEL Website <website@fodel.eu>';
}

export function officeInbox(): string {
  return import.meta.env.FODEL_INBOX || COMPANY.email.primary;
}

/**
 * Every customer email says "just reply to this email". Without an explicit
 * reply-to that reply goes to the sender address, which is often not a
 * mailbox anyone reads — so it defaults to the office inbox.
 */
export function replyToAddress(): string {
  return import.meta.env.FODEL_REPLY_TO || officeInbox();
}
