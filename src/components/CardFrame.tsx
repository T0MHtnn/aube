import type { CardRow } from '../lib/types';
import { getCardDefinition } from '../cards/registry';
import { Icon } from './Icon';
import styles from './Card.module.css';

interface Props {
  card: Pick<CardRow, 'type' | 'size' | 'config'>;
  /** Ouvre le menu de la carte (absent dans les aperçus) */
  onMenu?: () => void;
}

export function CardFrame({ card, onMenu }: Props) {
  const def = getCardDefinition(card.type);
  const View = def?.View;

  return (
    <section className={`${styles.card} ${styles[card.size]}`} aria-label={def?.name ?? 'Carte'}>
      {View ? (
        <View config={card.config} size={card.size} />
      ) : (
        <p className={styles.unknown}>Cette carte n’est plus disponible. Tu peux la supprimer avec le bouton ⋯.</p>
      )}
      {onMenu && (
        <button type="button" className={styles.menuButton} aria-label={`Options de la carte ${def?.name ?? ''}`} onClick={onMenu}>
          <Icon name="more" size={20} strokeWidth={3} />
        </button>
      )}
    </section>
  );
}