import { useCallback, useEffect, useState } from 'react';
import { mealsup, takePendingCard } from '../lib/mealsup';
import { oauthReturn } from '../lib/oauthReturn';
import { formatToday, greeting } from '../lib/date';
import { useCards } from '../hooks/useCards';
import type { Theme } from '../hooks/useTheme';
import { AccountSheet } from '../components/AccountSheet';
import { AddCardSheet } from '../components/AddCardSheet';
import { CardFrame } from '../components/CardFrame';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { NotesCard } from '../components/NotesCard';
import styles from './Dashboard.module.css';

interface Props {
  email: string;
  theme: Theme;
  onToggleTheme: () => void;
}

export function DashboardPage({ email, theme, onToggleTheme }: Props) {
  const { cards, loading, error, addCard, removeCard, resizeCard, moveCard } = useCards();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [account, setAccount] = useState(false);
  const [resume, setResume] = useState<{ type: string; config: Record<string, unknown> } | null>(null);

  // Retour de la connexion Google à MealsUp : on rouvre l'ajout là où on l'avait laissé
  useEffect(() => {
    const type = takePendingCard();
    if (!type) return;
    oauthReturn.then(() => mealsup.auth.getSession()).then(({ data }) => {
      if (!data.session) return;
      setResume({ type, config: { email: data.session.user.email ?? '' } });
      setAdding(true);
    });
  }, []);

  const openAdd = () => {
    setEditing(false);
    setResume(null);
    setAdding(true);
  };
  const closeAdd = useCallback(() => {
    setAdding(false);
    setResume(null);
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Icon name="logo" size={26} strokeWidth={2.2} />
          <span>aube</span>
        </div>
        <div className={styles.tools}>
          <button type="button" className={styles.round} aria-label="Mon compte" onClick={() => setAccount(true)}>
            <Icon name="user" />
          </button>
          <button
            type="button"
            className={styles.round}
            aria-label={theme === 'dark' ? 'Passer en mode jour' : 'Passer en mode nuit'}
            onClick={onToggleTheme}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button
            type="button"
            className={`${styles.round} ${editing ? styles.active : ''}`}
            aria-label={editing ? 'Terminer la modification' : 'Modifier le tableau'}
            aria-pressed={editing}
            onClick={() => setEditing((v) => !v)}
          >
            <Icon name={editing ? 'check' : 'edit'} />
          </button>
          <button type="button" className={`${styles.round} ${styles.add}`} aria-label="Ajouter une carte" onClick={openAdd}>
            <Icon name="plus" strokeWidth={2.4} />
          </button>
        </div>
      </header>

      <div className={styles.hello}>
        <p>{formatToday()}</p>
        <h1>{greeting()}</h1>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        <NotesCard />
        {cards.map((card, i) => (
          <CardFrame
            key={card.id}
            card={card}
            editing={editing}
            isFirst={i === 0}
            isLast={i === cards.length - 1}
            onMove={(d) => moveCard(card.id, d)}
            onResize={(s) => resizeCard(card.id, s)}
            onRemove={() => removeCard(card.id)}
          />
        ))}
        {!loading && cards.length === 0 && <EmptyState onAdd={openAdd} />}
      </div>

      {editing && (
        <div className={styles.editBar}>
          <p>Déplace, redimensionne ou supprime tes cartes. La carte Notes reste toujours en haut.</p>
        </div>
      )}

      {account && <AccountSheet email={email} onClose={() => setAccount(false)} />}

      {adding && (
        <AddCardSheet
          resume={resume}
          onClose={closeAdd}
          onAdd={async (type, size, config) => {
            await addCard(type, size, config);
            closeAdd();
          }}
        />
      )}
    </main>
  );
}
