import { useCallback, useEffect, useState } from 'react';
import { mealsup } from '../../lib/mealsup';
import { addDays, localDateKey } from '../../lib/date';
import { useRefreshOnReturn } from '../../hooks/useRefreshOnReturn';

export interface FridgeItem {
    id: string;
    name: string;
    quantity: string | null;
    unit: string | null;
    /** Date de péremption locale, "2026-10-28" */
    expiry: string;
}

/** Produits disponibles qui périment d'ici 2 jours (ou déjà périmés), du plus urgent au moins urgent */
export async function fetchExpiringItems(now = new Date()): Promise<FridgeItem[]> {
    const limit = addDays(now, 2);
    limit.setHours(23, 59, 59, 999);
    const { data, error } = await mealsup
        .from('fridge_items')
        .select('id, food_name, quantity, unit, expiry_date')
        .eq('is_available', true)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', limit.toISOString())
        .order('expiry_date', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as { id: string; food_name: string; quantity: string | null; unit: string | null; expiry_date: string }[]).map(
        (row) => ({
            id: row.id,
            name: row.food_name,
            quantity: row.quantity,
            unit: row.unit,
            expiry: localDateKey(new Date(row.expiry_date)),
        }),
    );
}

export type Urgency = 'expired' | 'today' | 'soon';

export function urgency(expiry: string, now = new Date()): Urgency {
    const today = localDateKey(now);
    if (expiry < today) return 'expired';
    if (expiry === today) return 'today';
    return 'soon';
}

export function expiryLabel(expiry: string, now = new Date()): string {
    const u = urgency(expiry, now);
    if (u === 'expired') return 'Périmé';
    if (u === 'today') return 'Aujourd’hui';
    return expiry === localDateKey(addDays(now, 1)) ? 'Demain' : 'Dans 2 jours';
}

type State =
    | { status: 'loading' }
    | { status: 'signedOut' }
    | { status: 'error' }
    | { status: 'ready'; items: FridgeItem[] };

export function useExpiringItems() {
    const [state, setState] = useState<State>({ status: 'loading' });

    const load = useCallback(async () => {
        const { data } = await mealsup.auth.getSession();
        if (!data.session) {
            setState({ status: 'signedOut' });
            return;
        }
        try {
            setState({ status: 'ready', items: await fetchExpiringItems() });
        } catch {
            setState({ status: 'error' });
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const { data } = mealsup.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') window.setTimeout(load, 0);
        });
        return () => data.subscription.unsubscribe();
    }, [load]);

    useRefreshOnReturn(load, 30 * 60 * 1000);

    return { state, reload: load };
}