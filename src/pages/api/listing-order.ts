import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { handleForm } from '~/lib/form-handler';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { deliver, templates } from '~/lib/email/send';

export const prerender = false;

const INVITE_DAYS = 7;

/**
 * Seller ad submission — FODEL's revenue page, and since 1.1 the front door to
 * the portal.
 *
 * In 1.0 this endpoint emailed the office and stopped there. Someone who
 * wanted to advertise filled in a detailed form, FODEL read it, and then
 * invited them by hand — which meant every single seller cost staff time
 * before they had done anything, and the portal itself was unreachable from
 * the public site.
 *
 * Now the same submission also opens an account. Deliberately as an *invite*
 * rather than by creating the user outright: the token in the email proves the
 * person actually controls that mailbox. An unauthenticated endpoint that
 * creates accounts directly lets anyone register under someone else's address,
 * and the invite mechanism (hashed token, single use, expiring) already exists
 * and is already exercised by the admin flow.
 *
 * What has NOT changed: nothing publishes without FODEL approving it. This
 * removes the manual invite, not the editorial gate.
 */
export const POST: APIRoute = (context) =>
  handleForm(context, {
    id: 'listing-order',
    activityKind: 'listing.intake',
    subject: 'ÚJ HIRDETÉSFELADÁS / Nieuwe advertentie-aanvraag',
    // The registration email below is the acknowledgement, and a better one.
    skipAck: true,
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
      { name: 'video', label: 'Videós bemutató', maxLength: 10 },
      { name: 'ownerVisible', label: 'Elérhetőség megjelenítése', maxLength: 20 },
      { name: 'speaks', label: 'Beszélt nyelvek', maxLength: 200 },
      { name: 'description', label: 'Leírás', maxLength: 6000 },
      { name: 'billingName', label: 'Számlázási név', maxLength: 160 },
      { name: 'billingAddress', label: 'Számlázási cím', maxLength: 300 },
      { name: 'referralCode', label: 'Ajánló kód', maxLength: 20 },
    ],
    onSuccess: async (values, extras) => {
      const email = values.email.toLowerCase();
      const locale = extras.Locale === 'nl' ? 'nl' : 'hu';
      const admin = createSupabaseAdminClient();

      // Already has an account: they should sign in, not be invited again.
      // FODEL still received the submission by email, so nothing is lost — an
      // admin can attach it to their existing account.
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (existingProfile) return;

      // Already invited and not yet accepted: don't mint a second token, which
      // would invalidate nothing but would leave two live links in their inbox
      // and two rows for an admin to interpret.
      const { data: openInvite } = await admin
        .from('invites')
        .select('id')
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (openInvite) return;

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

      // A code from ?ref= on the submit page, carried here as a hidden field.
      // Resolved against a real seller's code — never trusted as-is — so a
      // typo'd or made-up code simply mints no referral, silently.
      let referralId: string | null = null;
      const referralCode = values.referralCode?.trim().toUpperCase();
      if (referralCode) {
        const { data: referrer } = await admin
          .from('profiles')
          .select('id, full_name, email')
          .eq('referral_code', referralCode)
          .maybeSingle();
        if (referrer) {
          const { data: referral } = await admin
            .from('referrals')
            .insert({
              referrer_id: referrer.id,
              referrer_name: referrer.full_name,
              referrer_email: referrer.email,
              referred_name: values.name,
              referred_email: email,
              status: 'pending',
            })
            .select('id')
            .single();
          referralId = referral?.id ?? null;
        }
      }

      // The form answers ride along on the invite and become a pre-filled
      // draft when it is accepted — see api/portal/invite/accept.ts. Asking
      // someone to retype what they just submitted is how you lose them
      // between the website and the portal.
      const { error } = await admin.from('invites').insert({
        email,
        token_hash: tokenHash,
        role: 'owner',
        expires_at: expiresAt.toISOString(),
        payload: {
          locale,
          phone: values.phone,
          propertyType: values.propertyType,
          settlement: values.settlement,
          county: values.county,
          priceHuf: values.priceHuf,
          floorM2: values.floorM2,
          plotM2: values.plotM2,
          description: values.description,
          package: values.package,
          speaks: values.speaks,
          ownerVisible: values.ownerVisible,
          billingName: values.billingName,
          billingAddress: values.billingAddress,
          referralId,
        },
      });
      if (error) throw new Error(error.message);

      const origin = new URL(context.request.url).origin;
      await deliver(
        email,
        templates.registrationConfirm(locale, {
          name: values.name,
          acceptUrl: `${origin}/portal/invite/${token}`,
          settlement: values.settlement,
        })
      );
    },
  });
