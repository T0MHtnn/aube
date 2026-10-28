import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { CardRow, CardSize } from '../../lib/types';
import { textToItems } from './NotesCard';

/**
 * Avant, la carte Notes était fixe en haut du tableau, avec son texte dans la table `notes`.
 * Si ce texte existe encore, on le transforme une seule fois en carte Notes classique,
 * puis on vide l'ancienne note.
 */
export function useLegacyNotes(
    cards: CardRow[],
    loading: boolean,
    addCard: (type: string, size: CardSize, config: Record<string, unknown>) => Promise<void>,
) {
    const done = useRef(false);

    useEffect(() => {
        if (loading || done.current) return;
        done.current = true;
        if (cards.some((c) => c.type === 'notes')) return;

        supabase
            .from('notes')
            .select('content')
            .maybeSingle()
            .then(async ({ data }) => {
                const content = data?.content?.trim();
                if (!content) return;
                try {
                    await addCard('notes', 'wide', { items: textToItems(content) });
                    const { data: auth } = await supabase.auth.getUser();
                    if (auth.user) await supabase.from('notes').update({ content: '' }).eq('user_id', auth.user.id);
                } catch {
                    /* on réessaiera au prochain chargement */
                }
            });
    }, [loading, cards, addCard]);
}