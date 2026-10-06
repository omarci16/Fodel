/**
 * The hand-off to FODEL's CRM.
 *
 * Every enquiry is sent on, automatically, once it is saved: FODEL decided
 * nothing needs to be filtered by hand first. Which CRM it is can change, so
 * this speaks the one thing they all accept — an HTTPS POST of JSON — to
 * whatever CRM_WEBHOOK_URL points at (a Zapier/Make hook, or the CRM's own
 * incoming-webhook). With no URL set it does nothing and the portal says
 * "CRM nincs bekötve"; the enquiry is never lost either way.
 */
export type CrmEnquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  locale: string;
  contactPref: 'callback' | 'email';
  property: { ref: string; title: string } | null;
  createdAt: string;
};

export function crmConfigured(): boolean {
  return Boolean(import.meta.env.CRM_WEBHOOK_URL);
}

export async function pushEnquiryToCrm(enquiry: CrmEnquiry): Promise<{ ok: boolean; error?: string }> {
  const url = import.meta.env.CRM_WEBHOOK_URL;
  if (!url) return { ok: false, error: 'not-configured' };
  try {
    const token = import.meta.env.CRM_WEBHOOK_TOKEN;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ source: 'fodel-website', type: 'property_enquiry', ...enquiry }),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok ? { ok: true } : { ok: false, error: `http-${response.status}` };
  } catch (error) {
    return { ok: false, error: (error as Error).message.slice(0, 120) };
  }
}
