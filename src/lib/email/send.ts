/**
 * Thin Resend wrapper for the portal's lifecycle emails, same pattern as
 * src/lib/form-handler.ts uses for the public forms: log instead of failing
 * when RESEND_API_KEY isn't set, so the portal is still testable offline.
 */
import { Resend } from 'resend';

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const from = import.meta.env.FODEL_FROM ?? 'FODEL Portál <portal@fodel.nl>';

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY unset — would send "${opts.subject}" to ${opts.to}`);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
  } catch (error) {
    // Lifecycle emails are a courtesy, not the source of truth — the status
    // change itself already happened in the database. Log and move on
    // rather than failing the request that triggered it.
    console.error(`[email] failed to send "${opts.subject}" to ${opts.to}`, error);
  }
}

function layout(title: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;color:#102A43">
  <h2 style="font-size:18px;margin:0 0 20px">${title}</h2>
  ${bodyHtml}
  <p style="font-size:12px;color:#5E6E72;margin-top:32px">FODEL Ingatlan · fodel.nl</p>
</div>`;
}

export const templates = {
  invite(opts: { role: 'admin' | 'owner'; acceptUrl: string }) {
    return {
      subject: 'Meghívó a FODEL portálra',
      html: layout(
        'Meghívást kapott a FODEL portálra',
        `<p>A FODEL meghívta Önt, hogy ${
          opts.role === 'admin' ? 'adminisztrátorként' : 'hirdetőként'
        } csatlakozzon a portálhoz, ahol ingatlanhirdetéseit kezelheti.</p>
         <p><a href="${opts.acceptUrl}" style="background:#102A43;color:#F4F4F2;padding:12px 24px;text-decoration:none;display:inline-block">Meghívó elfogadása</a></p>
         <p style="font-size:13px;color:#5E6E72">A link 7 napig érvényes.</p>`
      ),
    };
  },

  welcome(opts: { name: string }) {
    return {
      subject: 'Üdvözöljük a FODEL portálon',
      html: layout(
        `Üdvözöljük, ${opts.name}!`,
        `<p>Fiókja aktiválva. Innentől kezelheti ingatlanhirdetéseit, tölthet fel fotókat, és követheti azok elbírálását.</p>
         <p><a href="https://fodel.nl/portal/dashboard">Ugrás a portálra</a></p>`
      ),
    };
  },

  submissionReceived(opts: { ref: string; title: string }) {
    return {
      subject: `Hirdetését megkaptuk — #${opts.ref}`,
      html: layout(
        'Hirdetését elbírálásra megkaptuk',
        `<p><strong>${opts.title}</strong> (#${opts.ref}) hirdetését megkaptuk, munkatársunk hamarosan átnézi.</p>
         <p>Amint elbírálásra kerül, e-mailben értesítjük.</p>`
      ),
    };
  },

  approved(opts: { ref: string; title: string; url: string }) {
    return {
      subject: `Hirdetése élesedett — #${opts.ref}`,
      html: layout(
        'Hirdetése mostantól élő',
        `<p><strong>${opts.title}</strong> (#${opts.ref}) hirdetése jóváhagyásra került és mostantól látható a fodel.nl oldalon.</p>
         <p><a href="${opts.url}">Hirdetés megtekintése</a></p>`
      ),
    };
  },

  changesRequested(opts: { ref: string; title: string; note: string }) {
    return {
      subject: `Javítás szükséges — #${opts.ref}`,
      html: layout(
        'Kérjük, javítsa hirdetését',
        `<p><strong>${opts.title}</strong> (#${opts.ref}) hirdetésével kapcsolatban munkatársunk megjegyzést fűzött:</p>
         <blockquote style="border-left:2px solid #102A43;padding-left:16px;margin:16px 0;color:#5E6E72">${opts.note.replace(/\n/g, '<br>')}</blockquote>
         <p>Kérjük, végezze el a javításokat a portálon, majd küldje be ismét.</p>
         <p><a href="https://fodel.nl/portal/properties">Ugrás a hirdetéshez</a></p>`
      ),
    };
  },

  newEnquiry(opts: { ref: string; title: string; name: string; email: string; phone?: string; message?: string }) {
    return {
      subject: `Új érdeklődő — #${opts.ref}`,
      html: layout(
        'Új érdeklődő a hirdetésére',
        `<p><strong>${opts.title}</strong> (#${opts.ref}) hirdetésére új érdeklődő jelentkezett:</p>
         <table style="font-size:14px"><tr><td style="color:#5E6E72;padding-right:12px">Név</td><td>${opts.name}</td></tr>
         <tr><td style="color:#5E6E72;padding-right:12px">E-mail</td><td>${opts.email}</td></tr>
         ${opts.phone ? `<tr><td style="color:#5E6E72;padding-right:12px">Telefon</td><td>${opts.phone}</td></tr>` : ''}
         </table>
         ${opts.message ? `<p>${opts.message.replace(/\n/g, '<br>')}</p>` : ''}`
      ),
    };
  },
};
