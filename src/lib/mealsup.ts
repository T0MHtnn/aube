import { createClient } from '@supabase/supabase-js';
import { rememberOAuthTarget } from './oauthTarget';

/**
 * Client vers la base de MealsUp (un autre projet Supabase que celui d'Aube).
 * Les comptes restent séparés : on se connecte à MealsUp uniquement quand on
 * ajoute une carte MealsUp. La session est gardée sur cet appareil, à part
 * de la session Aube (clé de stockage différente).
 */
const url = import.meta.env.VITE_MEALSUP_SUPABASE_URL;
const anonKey = import.meta.env.VITE_MEALSUP_SUPABASE_ANON_KEY;

export const mealsupConfigured = Boolean(url && anonKey);

/** Adresse de l'appli MealsUp (facultative), pour le lien « Planifier dans MealsUp » */
export const mealsupAppUrl = import.meta.env.VITE_MEALSUP_APP_URL;

export const mealsup = createClient(url ?? 'http://localhost', anonKey ?? 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'aube-mealsup-auth',
    flowType: 'pkce',
    detectSessionInUrl: false,
  },
});

/*
 * Connexion Google : on quitte Aube le temps de passer par Google, puis on revient.
 * On note la carte en cours d'ajout pour reprendre là où on en était au retour.
 */
const PENDING_KEY = 'aube-pending-card';

export async function signInMealsupWithGoogle(pendingCardType?: string) {
  try {
    if (pendingCardType) localStorage.setItem(PENDING_KEY, pendingCardType);
  } catch {
    /* sans stockage, on revient simplement sur le tableau */
  }
  rememberOAuthTarget('mealsup');
  return mealsup.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/?auth=mealsup` },
  });
}

/** Renvoie (et efface) le type de carte qui attendait une connexion Google */
export function takePendingCard(): string | null {
  try {
    const type = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    return type;
  } catch {
    return null;
  }
}

/**
 * Ouvre MealsUp dans un nouvel onglet, connecté au compte lié.
 * La session est transmise dans l'adresse (#access_token=…), que MealsUp
 * lit au chargement puis efface. Sans session, MealsUp s'ouvre normalement.
 */
export async function openMealsupApp() {
  if (!mealsupAppUrl) return;
  // L'onglet est ouvert tout de suite (sinon Safari le bloque), puis on y charge l'adresse.
  const tab = window.open('', '_blank');
  const { data } = await mealsup.auth.getSession();
  const s = data.session;
  const base = mealsupAppUrl.replace(/\/+$/, '');
  const url = s
    ? `${base}/#${new URLSearchParams({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_in: String(s.expires_in),
      expires_at: String(s.expires_at ?? ''),
      token_type: 'bearer',
    }).toString()}`
    : `${base}/`;
  if (tab) {
    tab.opener = null;
    tab.location.href = url;
  } else {
    window.location.href = url;
  }
}