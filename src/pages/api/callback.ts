import type { APIRoute } from 'astro';
import { handleForm } from '~/lib/form-handler';

export const prerender = false;

/** Contact page — general enquiry and the free callback request. */
export const POST: APIRoute = (context) =>
  handleForm(context, {
    id: 'callback',
    subject: 'Kapcsolatfelvétel / Contactverzoek',
    fields: [
      { name: 'name', label: 'Név / Naam', required: true, maxLength: 120 },
      { name: 'email', label: 'E-mail', type: 'email', required: true, maxLength: 160 },
      { name: 'phone', label: 'Telefon', type: 'tel', maxLength: 40 },
      { name: 'subject', label: 'Tárgy / Onderwerp', maxLength: 120 },
      { name: 'callTime', label: 'Mikor hívhatjuk / Wanneer bellen', maxLength: 120 },
      { name: 'message', label: 'Üzenet / Bericht', maxLength: 4000 },
    ],
  });
