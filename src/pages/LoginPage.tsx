import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { rememberOAuthTarget } from '../lib/oauthTarget';
import { Icon } from '../components/Icon';
import styles from './Login.module.css';

type Mode = 'signin' | 'signup';

const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'Email not confirmed': 'Ton email n’est pas encore confirmé. Clique sur le lien reçu par mail, puis reconnecte-toi.',
  'User already registered': 'Un compte existe déjà avec cet email. Passe sur « Connexion ».',
  'Password should be at least 6 characters.': 'Le mot de passe doit faire au moins 6 caractères.',
};

const TEXT: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  signin: {
    title: 'Content de te revoir',
    subtitle: 'Connecte-toi pour retrouver ton tableau.',
    submit: 'Se connecter',
  },
  signup: {
    title: 'Crée ton compte Aube',
    subtitle: 'Un compte rien que pour Aube, séparé de MealsUp.',
    submit: 'Créer mon compte',
  },
};

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setConfirm('');
  };

  const withGoogle = async () => {
    setError(null);
    rememberOAuthTarget('aube');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/?auth=aube` },
    });
    if (err) setError('La connexion Google n’a pas pu démarrer. Réessaie.');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (mode === 'signup' && password !== confirm) {
      setError('Les deux mots de passe ne sont pas identiques.');
      return;
    }
    setBusy(true);
    const { data, error: err } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (err) {
      setError(ERRORS[err.message] ?? err.message);
      return;
    }
    // Email déjà utilisé : Supabase renvoie un compte sans identité, sans erreur.
    if (mode === 'signup' && data.user && data.user.identities?.length === 0) {
      setError('Un compte existe déjà avec cet email. Passe sur l’onglet « Connexion ».');
      return;
    }
    // Si la confirmation par email est désactivée, on est connecté directement.
    if (mode === 'signup' && !data.session) {
      setSuccess(
        `Compte créé ! Un email de confirmation a été envoyé à ${email}. Clique sur le lien qu’il contient, puis reviens te connecter ici. Pense à regarder dans tes spams.`,
      );
      switchTo('signin');
    }
  };

  const t = TEXT[mode];

  return (
    <main className={styles.page}>
      <div className={styles.brand}>
        <Icon name="logo" size={40} strokeWidth={2} />
        <span className={styles.wordmark}>aube</span>
        <p>Ton matin en un coup d’œil : météo, transports, agenda et prochain repas.</p>
      </div>

      {success && (
        <div className={styles.success} role="status">
          <Icon name="check" size={20} strokeWidth={2.6} />
          <p>{success}</p>
        </div>
      )}

      <form className={`${styles.form} ${mode === 'signup' ? styles.signup : ''}`} onSubmit={submit}>
        <div className={styles.tabs}>
          <button type="button" aria-pressed={mode === 'signin'} onClick={() => switchTo('signin')}>
            Connexion
          </button>
          <button type="button" aria-pressed={mode === 'signup'} onClick={() => switchTo('signup')}>
            Inscription
          </button>
        </div>

        <div className={styles.heading}>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>

        <button type="button" className={styles.google} onClick={withGoogle}>
          Continuer avec Google
        </button>
        <p className={styles.divider}>ou avec ton email</p>

        <label className={styles.field}>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className={styles.field}>
          Mot de passe
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'signup' && <span className={styles.hint}>6 caractères minimum</span>}
        </label>
        {mode === 'signup' && (
          <label className={styles.field}>
            Confirme le mot de passe
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        )}

        {error && (
          <div className={styles.error} role="alert">
            <Icon name="close" size={18} strokeWidth={2.6} />
            <p>{error}</p>
          </div>
        )}

        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? 'Un instant…' : t.submit}
        </button>
      </form>
    </main>
  );
}

/** Affiché tant que les variables Supabase ne sont pas renseignées */
export function SetupMissing() {
  return (
    <main className={`${styles.page} ${styles.setup}`}>
      <div className={styles.brand}>
        <Icon name="logo" size={40} strokeWidth={2} />
        <span className={styles.wordmark}>aube</span>
        <p>
          Il manque la configuration Supabase. Copie <code>.env.example</code> en <code>.env</code>, remplis{' '}
          <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code>, puis relance <code>npm run dev</code>.
          Sur Vercel, ajoute ces deux variables dans Settings, puis Environment Variables.
        </p>
      </div>
    </main>
  );
}
