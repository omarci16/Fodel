import type { APIRoute } from 'astro';
import { handleForm } from '~/lib/form-handler';

export const prerender = false;

/**
 * Seller ad submission — FODEL's revenue page.
 *
 * Deliberately no payment gateway. FODEL's published process is: form →
 * díjbekérő (payment request) by email → bank transfer → upload rights →
 * translation → publication. This endpoint is step one of that flow, so the
 * site matches how the business already works.
 */
export const POST: APIRoute = (context) =>
  handleForm(context, {
    id: 'listing-order',
    subject: 'ÚJ HIRDETÉSFELADÁS / Nieuwe advertentie-aanvraag',
    fields: [
      { name: 'name', label: 'Név', required: true, maxLength: 120 },
      { name: 'email', label: 'E-mail', type: 'email', required: true, maxLength: 160 },
      { name: 'phone', label: 'Telefon', type: 'tel', required: true, maxLength: 40 },
      { name: 'package', label: 'Csomag', required: true, maxLength: 60 },
      { name: 'propertyType', label: 'Ingatlan típusa', required: true, maxLength: 60 },
      { name: 'settlement', label: 'Település', required: true, maxLength: 120 },
      { name: 'county', label: 'Megye', required: true, maxLength: 60 },
      { name: 'priceHuf', label: 'Irányár (Ft)', type: 'number', required: true, maxLength: 20 },
      { name: 'floorM2', label: 'Alapterület (m²)', type: 'number', maxLength: 12 },
      { name: 'plotM2', label: 'Telek (m²)', type: 'number', maxLength: 12 },
      { name: 'translations', label: 'Kért fordítások', maxLength: 200 },
      { name: 'highlight', label: 'Kiemelés', maxLength: 120 },
      { name: 'ownerVisible', label: 'Elérhetőség megjelenítése', maxLength: 20 },
      { name: 'speaks', label: 'Beszélt nyelvek', maxLength: 200 },
      { name: 'description', label: 'Leírás', maxLength: 6000 },
      { name: 'billingName', label: 'Számlázási név', maxLength: 160 },
      { name: 'billingAddress', label: 'Számlázási cím', maxLength: 300 },
    ],
  });
