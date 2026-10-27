import { useNotes } from '../hooks/useNotes';
import styles from './Card.module.css';

const STATUS_TEXT = { idle: '', saving: 'Enregistrement…', saved: 'Enregistré', error: 'Non enregistré' };

/** La carte Notes est toujours présente, en haut du tableau. */
export function NotesCard() {
  const { content, update, status } = useNotes();

  return (
    <section className={`${styles.card} ${styles.wide} ${styles.notes}`}>
      <div className={styles.notesHead}>
        <h2 className={styles.title}>Notes</h2>
        <span className={styles.saveState} aria-live="polite">
          {STATUS_TEXT[status]}
        </span>
      </div>
      <label style={{ display: 'flex', flexGrow: 1 }}>
        <span className="visually-hidden">Tes notes du jour</span>
        <textarea
          value={content}
          onChange={(e) => update(e.target.value)}
          placeholder="Ce que tu veux garder en tête aujourd’hui…"
        />
      </label>
    </section>
  );
}
