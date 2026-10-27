import { useEffect, useState } from 'react';
import type { CardRow, CardSize } from '../lib/types';
import { getCardDefinition } from '../cards/registry';
import { Icon } from './Icon';
import styles from './Card.module.css';

interface Props {
  card: Pick<CardRow, 'type' | 'size' | 'config'>;
  editing?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMove?: (direction: -1 | 1) => void;
  onResize?: (size: CardSize) => void;
  onRemove?: () => void;
}

export function CardFrame({ card, editing, isFirst, isLast, onMove, onResize, onRemove }: Props) {
  const def = getCardDefinition(card.type);
  const View = def?.View;
  const [confirming, setConfirming] = useState(false);

  // On annule la demande de suppression si on quitte le mode édition
  useEffect(() => {
    if (!editing) setConfirming(false);
  }, [editing]);

  const nextSize = () => {
    if (!def) return;
    const i = def.sizes.indexOf(card.size);
    onResize?.(def.sizes[(i + 1) % def.sizes.length]);
  };

  return (
    <section
      className={`${styles.card} ${styles[card.size]} ${editing ? styles.editing : ''}`}
      aria-label={def?.name ?? 'Carte'}
    >
      {View ? (
        <View config={card.config} size={card.size} />
      ) : (
        <p className={styles.unknown}>Cette carte n’est plus disponible. Tu peux la supprimer.</p>
      )}

      {editing && confirming && (
        <div className={styles.confirm} role="alertdialog" aria-label="Confirmer la suppression">
          <p>Supprimer la carte {def?.name ?? ''} ?</p>
          <div>
            <button type="button" className={styles.cancel} onClick={() => setConfirming(false)}>
              Annuler
            </button>
            <button type="button" className={styles.delete} onClick={onRemove}>
              Supprimer
            </button>
          </div>
        </div>
      )}

      {editing && !confirming && (
        <div className={styles.actions}>
          <button type="button" aria-label="Monter" disabled={isFirst} onClick={() => onMove?.(-1)}>
            <Icon name="up" size={18} />
          </button>
          <button type="button" aria-label="Descendre" disabled={isLast} onClick={() => onMove?.(1)}>
            <Icon name="down" size={18} />
          </button>
          <button
            type="button"
            aria-label="Changer la taille"
            disabled={!def || def.sizes.length < 2}
            onClick={nextSize}
          >
            <Icon name="resize" size={18} />
          </button>
          <button type="button" aria-label="Supprimer la carte" className={styles.remove} onClick={() => setConfirming(true)}>
            <Icon name="trash" size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
