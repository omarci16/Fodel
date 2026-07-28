import type { APIRoute } from 'astro';
import { handleForm } from '~/lib/form-handler';

export const prerender = false;

/**
 * Kerestető / Zoekdienst — FODEL's free search service.
 *
 * Their highest-intent lead capture: the visitor states what they want and
 * FODEL hunt for it, including off-market. Free to the user, and absent from
 * the prototype entirely.
 */
export const POST: APIRoute = (context) =>
  handleForm(context, {
    id: 'search-request',
    subject: 'KERESTETŐ / Nieuwe zoekopdracht',
    fields: [
      { name: 'name', label: 'Név / Naam', required: true, maxLength: 120 },
      { name: 'email', label: 'E-mail', type: 'email', required: true, maxLength: 160 },
      { name: 'phone', label: 'Telefon', type: 'tel', maxLength: 40 },
      { name: 'propertyType', label: 'Keresett típus / Gezocht type', required: true, maxLength: 60 },
      { name: 'region', label: 'Régió / Regio', maxLength: 120 },
      { name: 'budgetMin', label: 'Budget-tól (€)', type: 'number', maxLength: 20 },
      { name: 'budgetMax', label: 'Budget-ig (€)', type: 'number', maxLength: 20 },
      { name: 'requirements', label: 'Elvárások / Wensen', maxLength: 4000 },
    ],
  });
