import { useState, type FormEvent } from 'react';
import { mealsup, mealsupConfigured, signInMealsupWithGoogle } from '../../lib/mealsup';
import type { CardConfigProps } from '../registry';
import sheet from '../../components/Sheet.module.css';

export interface MealsupConfig {
  email: string;
}

const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe MealsUp incorrect.',
  'Email not confirmed': 'Ce compte MealsUp n’est pas encore confirmé.',
};

/** Connexion au compte MealsUp, demandée à l'ajout d'une carte MealsUp. */
interface Props extends CardConfigProps<MealsupConfig> {
  /** Carte à rouvrir au retour de Google (absent quand on se reconnecte depuis une carte existante) */
  resumeCardType?: string;
}

export function MealsupLogin({ onSubmit, resumeCardType = 'mealsup-next' }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mealsupConfigured) {
    return (
      <p className={sheet.error}>
        La connexion à MealsUp n’est pas configurée. Ajoute VITE_MEALSUP_SUPABASE_URL et
        VITE_MEALSUP_SUPABASE_ANON_KEY dans le fichier .env (et sur Vercel), puis relance l’appli.
      </p>
    );
  }

  const withGoogle = async () => {
    setError(null);
    const { error: err } = await signInMealsupWithGoogle(resumeCardType || undefined);
    if (err) setError('La connexion Google n’a pas pu démarrer. Réessaie.');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: err } = await mealsup.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err || !data.user) {
      setError(ERRORS[err?.message ?? ''] ?? err?.message ?? 'Connexion impossible.');
      return;
    }
    onSubmit({ email: data.user.email ?? email });
  };

  return (
    <form className={sheet.stack} onSubmit={submit}>
      <h3 className={sheet.fieldTitle}>Connecte ton compte MealsUp</h3>
      <p className={sheet.message}>
        Aube lira uniquement tes repas planifiés et ton frigo. Ton mot de passe n’est pas enregistré : seule la
        connexion est gardée sur cet appareil.
      </p>
      <button type="button" className={sheet.secondary} onClick={withGoogle}>
        Continuer avec Google
      </button>
      <p className={sheet.divider}>ou avec ton email</p>
      <label className={sheet.field}>
        Email MealsUp
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className={sheet.field}>
        Mot de passe MealsUp
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className={sheet.error}>{error}</p>}
      <button type="submit" className={sheet.submit} disabled={busy}>
        {busy ? 'Connexion…' : 'Se connecter à MealsUp'}
      </button>
    </form>
  );
}

/** Même connexion, pour la carte « À consommer vite » (reprise au retour de Google) */
export function FridgeLogin(props: CardConfigProps<MealsupConfig>) {
  return <MealsupLogin {...props} resumeCardType="mealsup-fridge" />;
}