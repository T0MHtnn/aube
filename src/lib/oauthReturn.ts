import { supabase } from './supabase';
import { mealsup } from './mealsup';
import { takeOAuthTarget, type OAuthTarget } from './oauthTarget';

/**
 * Au retour de Google, l'adresse contient ?code=…
 * On échange ce code auprès du bon projet Supabase (Aube ou MealsUp), puis on nettoie l'adresse.
 * Lancé une seule fois au démarrage ; le reste de l'appli attend `oauthReturn`.
 */
async function handleOAuthReturn(): Promise<OAuthTarget | null> {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const fromUrl = url.searchParams.get('auth');
    const remembered = takeOAuthTarget();
    const target: OAuthTarget | null =
        fromUrl === 'aube' || fromUrl === 'mealsup' ? fromUrl : remembered;

    const errorText = url.searchParams.get('error_description');
    if (errorText) console.error('Connexion Google refusée :', errorText);

    if (!code && !errorText && !fromUrl) return null;

    if (code && target) {
        const client = target === 'aube' ? supabase : mealsup;
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) console.error('Connexion Google impossible :', error.message);
    }

    for (const key of ['auth', 'code', 'error', 'error_code', 'error_description']) url.searchParams.delete(key);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    return target;
}

export const oauthReturn = handleOAuthReturn();