import { useCallback, useEffect, useState } from 'react';
import { bindMealsupToUser, mealsup, takePendingCard } from '../lib/mealsup';
import { oauthReturn } from '../lib/oauthReturn';
import { formatToday, greeting } from '../lib/date';
import { useCards } from '../hooks/useCards';
import { useLegacyNotes } from '../cards/notes/legacy';
import type { Theme } from '../hooks/useTheme';
import { AccountSheet } from '../components/AccountSheet';
import { AddCardSheet } from '../components/AddCardSheet';
import { CardFrame } from '../components/CardFrame';
import { CardMenuSheet } from '../components/CardMenuSheet';
import { EditCardSheet } from '../components/EditCardSheet';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import styles from './Dashboard.module.css';

interface Props {
  userId: string;
  email: string;
  theme: Theme;
  onToggleTheme: () => void;
}

export function DashboardPage({ userId, email, theme, onToggleTheme }: Props) {
  const { cards, loading, error, addCard, removeCard, resizeCard, moveCard, updateConfig } = useCards();
  const [adding, setAdding] = useState(false);
  const [account, setAccount] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const editingCard = cards.find((c) => c.id === editingCardId) ?? null;
  const [menuCardId, setMenuCardId] = useState<string | null>(null);
  const menuIndex = cards.findIndex((c) => c.id === menuCardId);
  const menuCard = menuIndex >= 0 ? cards[menuIndex] : null;
  const [resume, setResume] = useState<{ type: string; config: Record<string, unknown> } | null>(null);

  // Ancienne carte Notes fixe : son contenu devient une carte Notes classique
  useLegacyNotes(cards, loading, addCard);

  // La connexion MealsUp de cet appareil appartient au compte Aube connecté
  useEffect(() => {
    bindMealsupToUser(userId);
  }, [userId]);

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
        {cards.map((card) => (
          <CardFrame
            key={card.id}
            card={card}
            onMenu={() => setMenuCardId(card.id)}
            onConfigChange={(config) => updateConfig(card.id, config)}
          />
        ))}
        {!loading && cards.length === 0 && <EmptyState onAdd={openAdd} />}
      </div>

      {menuCard && (
        <CardMenuSheet
          card={menuCard}
          isFirst={menuIndex === 0}
          isLast={menuIndex === cards.length - 1}
          onClose={() => setMenuCardId(null)}
          onEdit={() => {
            setMenuCardId(null);
            setEditingCardId(menuCard.id);
          }}
          onMove={(d) => moveCard(menuCard.id, d)}
          onResize={(s) => resizeCard(menuCard.id, s)}
          onRemove={() => {
            setMenuCardId(null);
            removeCard(menuCard.id);
          }}
        />
      )}

      {editingCard && (
        <EditCardSheet
          card={editingCard}
          onClose={() => setEditingCardId(null)}
          onSave={(config) => updateConfig(editingCard.id, config)}
        />
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