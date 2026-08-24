import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { supabase, user } = locals;
  const form = await request.formData();
  const full_name = String(form.get('full_name') ?? '').trim() || null;
  const phone = String(form.get('phone') ?? '').trim() || null;

  const { error } = await supabase.from('profiles').update({ full_name, phone }).eq('id', user!.id);
  if (error) return redirect(`/portal/settings?error=${encodeURIComponent(error.message)}`);
  return redirect('/portal/settings?saved=profile');
};
