/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly RESEND_API_KEY: string;
  readonly FODEL_INBOX: string;
  readonly FODEL_FROM: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly STRIPE_ENABLED: string;
  readonly PMTILES_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type PortalRole = 'admin' | 'owner';

type PortalProfile = {
  id: string;
  role: PortalRole;
  full_name: string | null;
  phone: string | null;
  email: string;
  locale: string;
  referral_code: string | null;
};

declare namespace App {
  interface Locals {
    /** The signed-in user's own session-scoped Supabase client. Queries through it obey RLS. */
    supabase: import('@supabase/supabase-js').SupabaseClient<any, any, any>;
    /** Set by src/middleware.ts once a session is confirmed valid. Null when signed out. */
    user: import('@supabase/supabase-js').User | null;
    profile: PortalProfile | null;
  }
}
