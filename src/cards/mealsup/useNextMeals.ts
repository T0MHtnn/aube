import { useCallback, useEffect, useState } from 'react';
import { mealsup } from '../../lib/mealsup';
import { useRefreshOnReturn } from '../../hooks/useRefreshOnReturn';
import { fetchMissingIngredients, fetchUpcomingMeals, type PlannedMeal } from './api';

type State =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'error' }
  | { status: 'ready'; meals: PlannedMeal[]; missing: string[] };

export function useNextMeals() {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    const { data } = await mealsup.auth.getSession();
    if (!data.session) {
      setState({ status: 'signedOut' });
      return;
    }
    try {
      const meals = await fetchUpcomingMeals();
      const missing = meals[0] ? await fetchMissingIngredients(meals[0].recipeId) : [];
      setState({ status: 'ready', meals, missing });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Connexion ou déconnexion MealsUp (depuis « Mon compte » par exemple) : on recharge la carte
  useEffect(() => {
    const { data } = mealsup.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // setTimeout : Supabase déconseille d'appeler ses fonctions directement dans ce rappel
        window.setTimeout(load, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  // Au retour sur l'appli et toutes les 30 minutes (le « prochain repas » change avec l'heure)
  useRefreshOnReturn(load, 30 * 60 * 1000);

  return { state, reload: load };
}
