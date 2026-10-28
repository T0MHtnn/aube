import { useState } from 'react';
import { getCardDefinition } from '../cards/registry';
import { SIZE_LABELS, type CardRow, type CardSize } from '../lib/types';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import styles from './Sheet.module.css';

interface Props {
    card: CardRow;
    isFirst: boolean;
    isLast: boolean;
    onClose: () => void;
    onEdit: () => void;
    onMove: (direction: -1 | 1) => void;
    onResize: (size: CardSize) => void;
    onRemove: () => void;
}

/** Menu propre à une carte : réglages, taille, position, suppression */
export function CardMenuSheet({ card, isFirst, isLast, onClose, onEdit, onMove, onResize, onRemove }: Props) {
    const def = getCardDefinition(card.type);
    const [confirming, setConfirming] = useState(false);
    const editable = Boolean(def?.ConfigForm) && def?.editable !== false;
    const name = def?.name ?? 'Carte';

    return (
        <Sheet label={`Options de la carte ${name}`} onClose={onClose}>
            <div className={styles.head}>
                <h2>{name}</h2>
                <button type="button" className={styles.iconButton} aria-label="Fermer" onClick={onClose}>
                    <Icon name="close" size={18} strokeWidth={2.4} />
                </button>
            </div>

            {confirming ? (
                <div className={styles.stack}>
                    <p className={styles.fieldTitle}>Supprimer la carte {name} ?</p>
                    <button type="button" className={styles.danger} onClick={onRemove}>
                        Supprimer
                    </button>
                    <button type="button" className={styles.secondary} onClick={() => setConfirming(false)}>
                        Annuler
                    </button>
                </div>
            ) : (
                <>
                    {editable && (
                        <button type="button" className={styles.menuItem} onClick={onEdit}>
                            <Icon name="sliders" size={20} />
                            Modifier les réglages
                        </button>
                    )}

                    {def && def.sizes.length > 1 && (
                        <div className={styles.stack}>
                            <h3 className={styles.fieldTitle}>Taille</h3>
                            <div className={styles.segmented}>
                                {def.sizes.map((s) => (
                                    <button key={s} type="button" aria-pressed={card.size === s} onClick={() => onResize(s)}>
                                        {SIZE_LABELS[s].name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.stack}>
                        <h3 className={styles.fieldTitle}>Position</h3>
                        <div className={styles.segmented}>
                            <button type="button" disabled={isFirst} onClick={() => onMove(-1)}>
                                <Icon name="up" size={18} /> Monter
                            </button>
                            <button type="button" disabled={isLast} onClick={() => onMove(1)}>
                                <Icon name="down" size={18} /> Descendre
                            </button>
                        </div>
                    </div>

                    <button type="button" className={`${styles.menuItem} ${styles.menuDanger}`} onClick={() => setConfirming(true)}>
                        <Icon name="trash" size={20} />
                        Supprimer la carte
                    </button>
                </>
            )}
        </Sheet>
    );
}