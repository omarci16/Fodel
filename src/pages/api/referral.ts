import type { APIRoute } from 'astro';
import { handleForm } from '~/lib/form-handler';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { deliver, localeOf, templates, adminRecipients } from '~/lib/email/send';

export const prerender = false;

/**
 * The homepage referral band's "nominate a friend" form — for a visitor who
 * wants to send FODEL a lead without (yet) having their own account or
 * personal link. Writes a `referrals` row and tells both sides: the referrer
 * that it landed, FODEL's office that there's someone to call.
 *
 * The 10% referrer credit is applied by hand on the referrer's own next
 * listing (see the review screen) — this endpoint only registers the lead.
 */
export const POST: APIRoute = (context) =>
  handleForm(context, {
    id: 'referral',
    subject: 'ÚJ AJÁNLÁS / Nieuwe aanbeveling',
    fields: [
      { name: 'referrerName', label: 'Ajánló neve', required: true, maxLength: 120 },
      { name: 'referrerEmail', label: 'Ajánló e-mail', type: 'email', required: true, maxLength: 160 },
      { name: 'referredName', label: 'Ajánlott neve', required: true, maxLength: 120 },
      { name: 'referredEmail', label: 'Ajánlott e-mail', type: 'email', required: true, maxLength: 160 },
    ],
    onSuccess: async (values, extras) => {
      const locale = extras.Locale === 'nl' ? 'nl' : 'hu';
      const referrerEmail = values.referrerEmail.toLowerCase();
      const admin = createSupabaseAdminClient();

      const { data: referrerProfile } = await admin
        .from('profiles')
        .select('id, locale')
        .eq('email', referrerEmail)
        .maybeSingle();

      await admin.from('referrals').insert({
        referrer_id: referrerProfile?.id ?? null,
        referrer_name: values.referrerName,
        referrer_email: referrerEmail,
        referred_name: values.referredName,
        referred_email: values.referredEmail.toLowerCase(),
        status: 'pending',
      });

      const referrerLocale = referrerProfile ? localeOf(referrerProfile) : locale;
      await deliver(
        referrerEmail,
        templates.referralRegistered(referrerLocale, { referredName: values.referredName })
      );

      const recipients = await adminRecipients(admin);
      const notice = templates.referralAdminNotice('hu', {
        referrerName: values.referrerName,
        referrerEmail,
        referredName: values.referredName,
        referredEmail: values.referredEmail,
      });
      for (const recipient of recipients) {
        await deliver(recipient, notice, referrerEmail);
      }
    },
  });
