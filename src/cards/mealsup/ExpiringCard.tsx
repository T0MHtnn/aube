import type { CardViewProps } from '../registry';
import { mealsupAppUrl, openMealsupApp } from '../../lib/mealsup';
import { Icon } from '../../components/Icon';
import { expiryLabel, urgency, useExpiringItems, type FridgeItem } from './fridge';
import { MealsupConnect } from './MealsupConnect';
import type { MealsupConfig } from './MealsupLogin';
import styles from './Mealsup.module.css';

const TAG_CLASS = { expired: styles.tagExpired, today: styles.tagToday, soon: styles.tagSoon };

function quantity(item: FridgeItem) {
    return [item.quantity, item.unit].filter(Boolean).join(' ');
}

export function ExpiringCard({ size }: CardViewProps<MealsupConfig>) {
    const { state, reload } = useExpiringItems();

    if (state.status === 'loading') return <p className={styles.message}>Chargement de ton frigo…</p>;
    if (state.status === 'signedOut') return <MealsupConnect onConnected={reload} />;
    if (state.status === 'error') {
        return <p className={styles.message}>MealsUp ne répond pas pour le moment. La carte se mettra à jour toute seule.</p>;
    }

    const { items } = state;
    const openButton = mealsupAppUrl && (
        <button type="button" className={styles.open} aria-label="Ouvrir MealsUp" onClick={openMealsupApp}>
            <Icon name="external" size={18} />
        </button>
    );

    if (items.length === 0) {
        return (
            <div className={styles.small}>
                {openButton}
                <span className={`${styles.label} ${styles.first}`}>À consommer vite</span>
                <p className={styles.message}>Rien ne périme dans les 2 prochains jours.</p>
            </div>
        );
    }

    if (size === 'small') {
        const first = items[0];
        return (
            <div className={styles.small}>
                {openButton}
                <span className={`${styles.label} ${styles.first}`}>À consommer vite</span>
                <span className={styles.count}>{items.length}</span>
                <span className={styles.meta}>
                    {first.name}, {expiryLabel(first.expiry).toLowerCase()}
                    {items.length > 1 && ` et ${items.length - 1} autre${items.length > 2 ? 's' : ''}`}
                </span>
            </div>
        );
    }

    const shown = items.slice(0, size === 'large' ? 8 : 3);
    const hidden = items.length - shown.length;

    return (
        <div className={styles.fridge}>
            {openButton}
            <span className={`${styles.label} ${styles.first}`}>À consommer vite</span>
            <ul className={styles.items}>
                {shown.map((item) => (
                    <li key={item.id}>
                        <span className={styles.itemName}>
                            {item.name}
                            {quantity(item) && <span className={styles.itemQty}> · {quantity(item)}</span>}
                        </span>
                        <span className={`${styles.tag} ${TAG_CLASS[urgency(item.expiry)]}`}>{expiryLabel(item.expiry)}</span>
                    </li>
                ))}
            </ul>
            {hidden > 0 && <span className={styles.meta}>et {hidden} autre{hidden > 1 ? 's' : ''}</span>}
        </div>
    );
}