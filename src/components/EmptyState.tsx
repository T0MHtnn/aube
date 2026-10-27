import styles from './Card.module.css';

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyArt} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2>Compose ton matin</h2>
      <p>Météo, transports, agenda, repas du soir… ajoute seulement ce qui t’est utile.</p>
      <button type="button" className={styles.primary} onClick={onAdd}>
        + Ajouter une carte
      </button>
    </div>
  );
}
