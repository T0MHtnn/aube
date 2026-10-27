import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { MealsupLogin } from './MealsupLogin';
import sheet from '../../components/Sheet.module.css';
import styles from './Mealsup.module.css';

/** Affiché dans une carte MealsUp quand le compte n'est pas connecté sur cet appareil */
export function MealsupConnect({ onConnected }: { onConnected: () => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={styles.center}>
            <p className={styles.message}>Ton compte MealsUp n’est pas connecté sur cet appareil.</p>
            <button type="button" className={styles.button} onClick={() => setOpen(true)}>
                Connecter MealsUp
            </button>
            {open && (
                <Sheet label="Connexion à MealsUp" onClose={() => setOpen(false)}>
                    <div className={sheet.head}>
                        <h2>MealsUp</h2>
                    </div>
                    <MealsupLogin
                        resumeCardType=""
                        onSubmit={() => {
                            setOpen(false);
                            onConnected();
                        }}
                    />
                </Sheet>
            )}
        </div>
    );
}