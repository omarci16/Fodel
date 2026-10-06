import type { APIRoute } from 'astro';
import { handleForm } from '~/lib/form-handler';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { deliver, localeOf, templates } from '~/lib/email/send';
import { pushEnquiryToCrm } from '~/lib/crm';

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
      { name: 'contact_pref', label: 'Kapcsolatfelvétel (callback = visszahívás)', maxLength: 12 },
      { name: 'message', label: 'Üzenet / Bericht', maxLength: 4000 },
    ],
    // A callback is useless without a number; an e-mail reply needs none.
    refine: (values): Record<string, string> =>
      values.contact_pref !== 'email' && !values.phone ? { phone: 'required' } : {},
    onSuccess: async (values, extras) => {
      const ref = extras.propertyRef;
      if (!ref) return; // enquiry sent without property context — nothing to persist against

      const admin = createSupabaseAdminClient();
      const { data: property, error: lookupError } = await admin
        .from('properties')
        .select('id, owner_id')
        .eq('ref', ref)
        .maybeSingle();
      // Thrown (not swallowed): runHook's own catch logs it, same as every
      // other onSuccess failure — a lookup error looked identical to
      // "no such property" here, so a real failure (a network blip, an RLS
      // change) went completely unlogged instead of just losing one enquiry.
      if (lookupError) throw new Error(`property lookup failed: ${lookupError.message}`);
      if (!property) return;

      const contactPref = values.contact_pref === 'email' ? 'email' : 'callback';
      const row = {
        property_id: property.id,
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        message: values.message || null,
        locale: extras.Locale === 'nl' ? 'nl' : 'hu',
      };
      // contact_pref arrives with migration 0016; until it runs, save without it.
      let { data: saved, error: insertError } = await admin
        .from('enquiries')
        .insert({ ...row, contact_pref: contactPref })
        .select('id, created_at')
        .single();
      if (insertError && /contact_pref/.test(insertError.message)) {
        ({ data: saved, error: insertError } = await admin.from('enquiries').insert(row).select('id, created_at').single());
      }
      if (insertError || !saved) throw new Error(`enquiry insert failed: ${insertError?.message}`);

      // Straight on to the CRM. Best effort: the enquiry is already safe in
      // our own database, and the portal shows whether the hand-off worked.
      const crm = await pushEnquiryToCrm({
        id: saved.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        message: row.message,
        locale: row.locale,
        contactPref,
        property: { ref, title: extras.propertyTitle ?? `#${ref}` },
        createdAt: saved.created_at,
      });
      if (crm.error !== 'not-configured') {
        await admin
          .from('enquiries')
          .update(crm.ok ? { crm_synced_at: new Date().toISOString(), crm_error: null } : { crm_error: crm.error })
          .eq('id', saved.id);
      }

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
