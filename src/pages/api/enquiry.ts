import type { APIRoute } from 'astro';
import { handleForm } from '~/lib/form-handler';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { deliver, localeOf, templates } from '~/lib/email/send';

export const prerender = false;

/**
 * Property enquiry from a listing detail page. Beyond the existing
 * notify-FODEL + acknowledge-the-visitor behaviour (handleForm), this also
 * persists the enquiry so it's visible in the portal, and — if the listing
 * has a registered owner — emails them directly, which is the point of
 * FODEL's whole model: the owner hears about interest in their own listing,
 * not just FODEL.
 */
export const POST: APIRoute = (context) =>
  handleForm(context, {
    id: 'enquiry',
    activityKind: 'enquiry.created',
    subject: 'Ingatlan iránti érdeklődés / Interesse in woning',
    fields: [
      { name: 'name', label: 'Név / Naam', required: true, maxLength: 120 },
      { name: 'email', label: 'E-mail', type: 'email', required: true, maxLength: 160 },
      { name: 'phone', label: 'Telefon', type: 'tel', maxLength: 40 },
      { name: 'message', label: 'Üzenet / Bericht', maxLength: 4000 },
    ],
    onSuccess: async (values, extras) => {
      const ref = extras.propertyRef;
      if (!ref) return; // enquiry sent without property context — nothing to persist against

      const admin = createSupabaseAdminClient();
      const { data: property } = await admin
        .from('properties')
        .select('id, owner_id')
        .eq('ref', ref)
        .maybeSingle();
      if (!property) return;

      await admin.from('enquiries').insert({
        property_id: property.id,
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        message: values.message || null,
        locale: extras.Locale === 'nl' ? 'nl' : 'hu',
      });

      if (property.owner_id) {
        const { data: owner } = await admin
          .from('profiles')
          .select('email, locale')
          .eq('id', property.owner_id)
          .maybeSingle();
        if (owner?.email) {
          const locale = localeOf(owner);
          await deliver(
            owner.email,
            templates.newEnquiry(locale, {
              ref,
              title: extras.propertyTitle ?? `#${ref}`,
              name: values.name,
              email: values.email,
              phone: values.phone,
              message: values.message,
            }),
            // The owner can reply straight to the buyer from their inbox —
            // FODEL's whole model is putting the two in direct contact.
            values.email
          );
        }
      }
    },
  });
