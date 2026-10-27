import { useEffect, useState } from 'react';
import type { CardViewProps } from '../registry';
import { relativeDayLabel } from '../../lib/date';
import { mealsupAppUrl, openMealsupApp } from '../../lib/mealsup';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { MEAL_LABELS, type PlannedMeal } from './api';
import { MealsupLogin, type MealsupConfig } from './MealsupLogin';
import { useNextMeals } from './useNextMeals';
import sheet from '../../components/Sheet.module.css';
import styles from './Mealsup.module.css';

/** Photo du plat, masquée si elle ne se charge pas */
function MealImage({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return null;
  return <img className={styles.image} src={src} alt="" onError={() => setFailed(true)} />;
}

function when(meal: PlannedMeal) {
  return `${MEAL_LABELS[meal.type]}, ${relativeDayLabel(meal.date).toLowerCase()}`;
}

function missingText(missing: string[]) {
  if (missing.length === 0) return 'Tout est dans ton frigo';
  const shown = missing.slice(0, 3).join(', ');
  return missing.length > 3 ? `Il manque : ${shown} et ${missing.length - 3} autre(s)` : `Il manque : ${shown}`;
}

export function NextMealCard({ size }: CardViewProps<MealsupConfig>) {
  const { state, reload } = useNextMeals();
  const [reconnecting, setReconnecting] = useState(false);

  if (state.status === 'loading') return <p className={styles.message}>Chargement de tes repas…</p>;

  if (state.status === 'signedOut') {
    return (
      <div className={styles.center}>
        <p className={styles.message}>Ton compte MealsUp n’est pas connecté sur cet appareil.</p>
        <button type="button" className={styles.button} onClick={() => setReconnecting(true)}>
          Connecter MealsUp
        </button>
        {reconnecting && (
          <Sheet label="Connexion à MealsUp" onClose={() => setReconnecting(false)}>
            <div className={sheet.head}>
              <h2>MealsUp</h2>
            </div>
            <MealsupLogin
              resumeCardType=""
              onSubmit={() => {
                setReconnecting(false);
                reload();
              }}
            />
          </Sheet>
        )}
      </div>
    );
  }

  if (state.status === 'error') {
    return <p className={styles.message}>MealsUp ne répond pas pour le moment. La carte se mettra à jour toute seule.</p>;
  }

  const [next, ...later] = state.meals;

  if (!next) {
    return (
      <div className={styles.center}>
        <p className={styles.message}>Aucun repas planifié cette semaine.</p>
        {mealsupAppUrl && (
          <a className={styles.button} href={mealsupAppUrl} target="_blank" rel="noreferrer">
            Planifier dans MealsUp
          </a>
        )}
      </div>
    );
  }

  const openButton = mealsupAppUrl && (
    <button type="button" className={styles.open} aria-label="Ouvrir MealsUp" onClick={openMealsupApp}>
      <Icon name="external" size={18} />
    </button>
  );

  if (size === 'small') {
    return (
      <div className={styles.small}>
        {openButton}
        <span className={`${styles.label} ${styles.first}`}>{when(next)}</span>
        <strong className={styles.title}>{next.title}</strong>
        <span className={styles.meta}>{missingText(state.missing)}</span>
      </div>
    );
  }

  const main = (
    <div className={size === 'large' ? styles.mainLarge : styles.mainWide}>
      {openButton}
      <MealImage src={next.imageUrl} />
      <div className={styles.text}>
        <span className={`${styles.label} ${styles.first}`}>{when(next)}</span>
        <strong className={styles.title}>{next.title}</strong>
        <span className={styles.meta}>{missingText(state.missing)}</span>
      </div>
    </div>
  );

  if (size === 'wide') return main;

  return (
    <div className={styles.large}>
      {main}
      {later.length > 0 && (
        <div className={styles.later}>
          <span className={styles.label}>Ensuite</span>
          <ul>
            {later.slice(0, 3).map((m) => (
              <li key={m.id}>
                <span>{when(m)}</span>
                <strong>{m.title}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
