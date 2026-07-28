import type { APIRoute } from 'astro';
import { handleForm } from '~/lib/form-handler';

export const prerender = false;

/** Property enquiry from a listing detail page. */
export const POST: APIRoute = (context) =>
  handleForm(context, {
    id: 'enquiry',
    subject: 'Ingatlan iránti érdeklődés / Interesse in woning',
    fields: [
      { name: 'name', label: 'Név / Naam', required: true, maxLength: 120 },
      { name: 'email', label: 'E-mail', type: 'email', required: true, maxLength: 160 },
      { name: 'phone', label: 'Telefon', type: 'tel', maxLength: 40 },
      { name: 'message', label: 'Üzenet / Bericht', maxLength: 4000 },
    ],
  });
