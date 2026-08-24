import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { supabase } = locals;
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const password2 = String(form.get('password2') ?? '');

  if (password.length < 8) {
    return redirect(`/portal/settings?error=${encodeURIComponent('a jelszó legalább 8 karakter legyen')}`);
  }
  if (password !== password2) {
    return redirect(`/portal/settings?error=${encodeURIComponent('a két jelszó nem egyezik')}`);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return redirect(`/portal/settings?error=${encodeURIComponent(error.message)}`);
  return redirect('/portal/settings?saved=password');
};
