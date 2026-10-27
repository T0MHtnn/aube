import { mealsup, mealsupAppUrl } from '../../lib/mealsup';
import { addDays, localDateKey } from '../../lib/date';

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Collation',
  dinner: 'Dîner',
};

const ORDER: Record<MealType, number> = { breakfast: 0, lunch: 1, snack: 2, dinner: 3 };

/** Heure à partir de laquelle un repas du jour est considéré comme passé */
const ENDS_AT: Record<MealType, number> = { breakfast: 10, lunch: 14, snack: 18, dinner: 21 };

/**
 * Les photos de MealsUp peuvent être des adresses complètes (https://…)
 * ou des chemins relatifs au site MealsUp (/images/…) : on complète ces derniers.
 */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (!mealsupAppUrl) return null;
  try {
    return new URL(url, mealsupAppUrl).toString();
  } catch {
    return null;
  }
}

export interface PlannedMeal {
  id: string;
  date: string;
  type: MealType;
  recipeId: string;
  title: string;
  imageUrl: string | null;
}

interface Row {
  id: string;
  meal_date: string;
  meal_type: string;
  recipe_id: string;
  recipes: { title: string; image_url: string | null } | { title: string; image_url: string | null }[] | null;
}

/** Repas planifiés à venir (7 jours), du plus proche au plus lointain. */
export async function fetchUpcomingMeals(now = new Date()): Promise<PlannedMeal[]> {
  const today = localDateKey(now);
  const { data, error } = await mealsup
    .from('planned_meals')
    .select('id, meal_date, meal_type, recipe_id, recipes(title, image_url)')
    .gte('meal_date', today)
    .lte('meal_date', localDateKey(addDays(now, 7)))
    .in('meal_type', ['breakfast', 'lunch', 'snack', 'dinner']);
  if (error) throw error;

  const hour = now.getHours();
  return ((data ?? []) as unknown as Row[])
    .map((row) => {
      const recipe = Array.isArray(row.recipes) ? row.recipes[0] : row.recipes;
      return {
        id: row.id,
        date: row.meal_date,
        type: row.meal_type as MealType,
        recipeId: row.recipe_id,
        title: recipe?.title ?? 'Recette sans titre',
        imageUrl: resolveImageUrl(recipe?.image_url),
      };
    })
    .filter((m) => !(m.date === today && hour >= ENDS_AT[m.type]))
    .sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.type] - ORDER[b.type]);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[sx]$/, '');
}

/**
 * Ingrédients (non facultatifs) de la recette absents du frigo.
 * La correspondance se fait par nom, donc elle peut parfois se tromper
 * (ex. le sel ou l'huile, rarement saisis dans le frigo).
 */
export async function fetchMissingIngredients(recipeId: string): Promise<string[]> {
  const [ingredients, fridge] = await Promise.all([
    mealsup.from('recipe_ingredients').select('ingredient_name, optional').eq('recipe_id', recipeId),
    mealsup.from('fridge_items').select('food_name').eq('is_available', true),
  ]);
  if (ingredients.error) throw ingredients.error;

  const have = ((fridge.data ?? []) as { food_name: string }[]).map((f) => normalize(f.food_name)).filter(Boolean);
  return ((ingredients.data ?? []) as { ingredient_name: string; optional: boolean | null }[])
    .filter((i) => !i.optional)
    .map((i) => i.ingredient_name)
    .filter((name) => {
      const n = normalize(name);
      return !have.some((h) => h.includes(n) || n.includes(h));
    });
}
