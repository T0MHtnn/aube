/**
 * Avant de partir chez Google, on note pour quel projet est la connexion (Aube ou MealsUp).
 * Au retour, on relit cette note : ça marche même si Supabase renvoie vers une adresse
 * sans le marqueur ?auth=…
 */
const KEY = 'aube-oauth-target';

export type OAuthTarget = 'aube' | 'mealsup';

export function rememberOAuthTarget(target: OAuthTarget) {
    try {
        localStorage.setItem(KEY, target);
    } catch {
        /* sans stockage, on se rabat sur le marqueur dans l'adresse */
    }
}

export function takeOAuthTarget(): OAuthTarget | null {
    try {
        const value = localStorage.getItem(KEY);
        localStorage.removeItem(KEY);
        return value === 'aube' || value === 'mealsup' ? value : null;
    } catch {
        return null;
    }
}