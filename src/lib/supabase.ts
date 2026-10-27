import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** false tant que le fichier .env (ou les variables Vercel) n'est pas rempli */
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Retour de Google géré à la main (src/lib/oauthReturn.ts), pour ne pas confondre une connexion Aube et une connexion MealsUp.
    flowType: 'pkce',
    detectSessionInUrl: false,
  },
});
