import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { mealsup, mealsupConfigured } from '../lib/mealsup';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import styles from './Sheet.module.css';

interface Props {
    email: string;
    onClose: () => void;
}

export function AccountSheet({ email, onClose }: Props) {
    const [mealsupEmail, setMealsupEmail] = useState<string | null>(null);

    useEffect(() => {
        if (!mealsupConfigured) return;
        mealsup.auth.getSession().then(({ data }) => setMealsupEmail(data.session?.user.email ?? null));
    }, []);

    const disconnectMealsup = async () => {
        await mealsup.auth.signOut();
        setMealsupEmail(null);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <Sheet label="Mon compte" onClose={onClose}>
            <div className={styles.head}>
                <h2>Mon compte</h2>
                <button type="button" className={styles.iconButton} aria-label="Fermer" onClick={onClose}>
                    <Icon name="close" size={18} strokeWidth={2.4} />
                </button>
            </div>

            <div className={styles.stack}>
                <h3 className={styles.fieldTitle}>Compte Aube</h3>
                <p className={styles.message}>Connecté avec {email}</p>
            </div>

            <div className={styles.stack}>
                <h3 className={styles.fieldTitle}>MealsUp</h3>
                <p className={styles.message}>
                    {mealsupEmail ? `Connecté avec ${mealsupEmail} sur cet appareil` : 'Non connecté sur cet appareil'}
                </p>
                {mealsupEmail && (
                    <button type="button" className={styles.secondary} onClick={disconnectMealsup}>
                        Déconnecter MealsUp
                    </button>
                )}
            </div>

            <button type="button" className={styles.danger} onClick={signOut}>
                Se déconnecter d’Aube
            </button>
        </Sheet>
    );
}