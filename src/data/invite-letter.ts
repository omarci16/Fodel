/**
 * The Hungarian owner invite letter Éva and Gábor supplied on 2026-09-29
 * (brief 3 §B, Appendix A). The body is theirs, word for word, with their
 * paragraph breaks. Subject and button text were not supplied — those two are
 * FODEL-dev proposals awaiting their sign-off.
 *
 * Migration 0015 seeds the same text into `email_templates` as approved; this
 * copy exists so /dev/emails can preview it without a database. If the two
 * ever differ, the database row is what is sent.
 */
import type { InviteTemplate } from '~/lib/email/templates';

export const HU_OWNER_INVITE: InviteTemplate = {
  /** Proposal — not client-supplied. */
  subject: 'Meghívó a FODEL Ingatlan online felületére',
  heading: 'Kedves Tulajdonos!',
  body: [
    'Szeretnénk meghívni Önt a FODEL Ingatlan új online felületére, ahol ingatlanát egyszerűen és gyorsan regisztrálhatja, és lehetőséget biztosíthatunk arra, hogy nemzetközi szinten is meghirdessük.',
    'Célunk, hogy a magyarországi ingatlanokat külföldi, elsősorban holland, német, osztrák és belga érdeklődők számára is láthatóvá tegyük.',
    'Ha szeretné eladni ingatlanát, regisztrálja nálunk, és mi felvesszük Önnel a kapcsolatot a további lehetőségekről.',
    'FODEL Ingatlan – magyar ingatlanok külföldi vevőknek.',
    'Várjuk szeretettel!',
  ].join('\n\n'),
  /** Proposal — not client-supplied. */
  cta: 'Ingatlanom regisztrálása',
};
