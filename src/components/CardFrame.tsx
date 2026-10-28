import type { CardRow } from '../lib/types';
import { getCardDefinition } from '../cards/registry';
import { Icon } from './Icon';
import styles from './Card.module.css';

interface Props {
  card: Pick<CardRow, 'type' | 'size' | 'config'>;
  /** Ouvre le menu de la carte (absent dans les aperçus) */
  onMenu?: () => void;
  /** Enregistre les réglages modifiés depuis la carte (absent dans les aperçus) */
  onConfigChange?: (config: Record<string, unknown>) => Promise<void>;
}

export function CardFrame({ card, onMenu, onConfigChange }: Props) {
  const def = getCardDefinition(card.type);
  const View = def?.View;

  return (
    <section className={`${styles.card} ${styles[card.size]}`} aria-label={def?.name ?? 'Carte'}>
      {View ? (
        <View config={card.config} size={card.size} onChange={onConfigChange} />
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