/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PAYMENT_GATES_PUBLISHING?: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly RESEND_API_KEY: string;
  readonly FODEL_INBOX: string;
  readonly FODEL_FROM: string;
  readonly FODEL_REPLY_TO?: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly STRIPE_ENABLED: string;
  readonly PMTILES_URL: string;
  readonly OPENAI_API_KEY: string;
  readonly AI_ENABLED: string;
  /** Optional: where new enquiries are POSTed as JSON (the CRM's incoming webhook). */
  readonly CRM_WEBHOOK_URL?: string;
  readonly CRM_WEBHOOK_TOKEN?: string;
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

/** The portal's own dialogs and toasts (src/layouts/Portal.astro). */
interface Window {
  pf?: {
    toast: (message: string, tone?: 'ok' | 'error' | 'warn') => void;
    prompt: (o: { title: string; body: string; label: string; confirmLabel?: string; value?: string; placeholder?: string; required?: boolean; multiline?: boolean }) => Promise<string | null>;
    alert: (o: { title: string; body: string }) => Promise<void>;
    confirm: (o: { title: string; body: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
    confirmType: (o: { title: string; body: string; expected: string; confirmLabel?: string }) => Promise<boolean>;
    askNote: (o: { title: string; body: string; label: string; confirmLabel?: string; multiline?: boolean }) => Promise<string | null>;
  };
}
