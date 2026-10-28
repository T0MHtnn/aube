import { useState } from 'react';
import { getCardDefinition } from '../cards/registry';
import type { CardRow } from '../lib/types';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import styles from './Sheet.module.css';

interface Props {
    card: CardRow;
    onClose: () => void;
    onSave: (config: Record<string, unknown>) => Promise<void>;
}

/** Modifier les réglages d'une carte existante (arrêts, ville…) */
export function EditCardSheet({ card, onClose, onSave }: Props) {
    const def = getCardDefinition(card.type);
    const [error, setError] = useState<string | null>(null);
    const Form = def?.ConfigForm;

    return (
        <Sheet label={`Modifier ${def?.name ?? 'la carte'}`} onClose={onClose}>
            <div className={styles.head}>
                <h2>Modifier {def?.name ?? 'la carte'}</h2>
                <button type="button" className={styles.iconButton} aria-label="Fermer" onClick={onClose}>
                    <Icon name="close" size={18} strokeWidth={2.4} />
                </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            {Form ? (
                <Form
                    initial={card.config}
                    onSubmit={async (config: Record<string, unknown>) => {
                        setError(null);
                        try {
                            await onSave(config);
                            onClose();
                        } catch (e) {
                            setError(e instanceof Error ? e.message : 'Les modifications n’ont pas pu être enregistrées.');
                        }
                    }}
                />
            ) : (
                <p className={styles.message}>Cette carte n’a pas de réglages à modifier.</p>
            )}
        </Sheet>
    );
}