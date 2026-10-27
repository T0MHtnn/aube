import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CardRow, CardSize } from '../lib/types';

export function useCards() {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('cards')
      .select('id, type, size, position, config')
      .order('position', { ascending: true });
    if (err) setError('Impossible de charger tes cartes. Vérifie ta connexion.');
    else {
      setError(null);
      setCards((data ?? []) as CardRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addCard = async (type: string, size: CardSize, config: Record<string, unknown>) => {
    const position = cards.length ? Math.max(...cards.map((c) => c.position)) + 1 : 0;
    const { data, error: err } = await supabase
      .from('cards')
      .insert({ type, size, position, config })
      .select('id, type, size, position, config')
      .single();
    if (err || !data) throw new Error('La carte n’a pas pu être ajoutée. Réessaie.');
    setCards((prev) => [...prev, data as CardRow]);
  };

  const removeCard = async (id: string) => {
    const before = cards;
    setCards((prev) => prev.filter((c) => c.id !== id));
    const { error: err } = await supabase.from('cards').delete().eq('id', id);
    if (err) {
      setCards(before);
      setError('La carte n’a pas pu être supprimée.');
    }
  };

  const resizeCard = async (id: string, size: CardSize) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, size } : c)));
    const { error: err } = await supabase.from('cards').update({ size }).eq('id', id);
    if (err) load();
  };

  /** Échange la carte avec sa voisine (direction -1 = vers le haut, 1 = vers le bas) */
  const moveCard = async (id: string, direction: -1 | 1) => {
    const index = cards.findIndex((c) => c.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= cards.length) return;
    const a = cards[index];
    const b = cards[target];
    const next = [...cards];
    next[index] = { ...b, position: a.position };
    next[target] = { ...a, position: b.position };
    setCards(next);
    const results = await Promise.all([
      supabase.from('cards').update({ position: b.position }).eq('id', a.id),
      supabase.from('cards').update({ position: a.position }).eq('id', b.id),
    ]);
    if (results.some((r) => r.error)) load();
  };

  return { cards, loading, error, addCard, removeCard, resizeCard, moveCard };
}
