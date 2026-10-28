import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { CardViewProps } from '../registry';
import { Icon } from '../../components/Icon';
import styles from './Notes.module.css';

export interface NoteItem {
    id: string;
    /** text : ligne libre ; todo : case à cocher */
    kind: 'text' | 'todo';
    text: string;
    done?: boolean;
}

export interface NotesConfig {
    items?: NoteItem[];
}

const newId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

/** Transforme un texte (une ligne = un élément) en éléments de note */
export function textToItems(text: string): NoteItem[] {
    return text.split('\n').map((line) => ({ id: newId(), kind: 'text' as const, text: line }));
}

const STATUS_TEXT = { idle: '', saving: 'Enregistrement…', saved: 'Enregistré', error: 'Non enregistré' };

export function NotesCard({ config, onChange }: CardViewProps<NotesConfig>) {
    const [items, setItems] = useState<NoteItem[]>(() =>
        config.items?.length ? config.items : [{ id: newId(), kind: 'text', text: '' }],
    );
    const [status, setStatus] = useState<keyof typeof STATUS_TEXT>('idle');
    const [focusId, setFocusId] = useState<string | null>(null);
    const inputs = useRef(new Map<string, HTMLInputElement>());
    const timer = useRef<number>();
    const readOnly = !onChange;

    // Place le curseur sur l'élément qu'on vient de créer
    useEffect(() => {
        if (!focusId) return;
        inputs.current.get(focusId)?.focus();
        setFocusId(null);
    }, [focusId, items]);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    /** Met à jour la note et l'enregistre 0,7 s après la dernière modification */
    const commit = (next: NoteItem[]) => {
        setItems(next);
        if (!onChange) return;
        setStatus('saving');
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            onChange({ items: next })
                .then(() => setStatus('saved'))
                .catch(() => setStatus('error'));
        }, 700);
    };

    const patch = (id: string, change: Partial<NoteItem>) =>
        commit(items.map((it) => (it.id === id ? { ...it, ...change } : it)));

    const insertAfter = (id: string | null, kind: NoteItem['kind']) => {
        const item: NoteItem = { id: newId(), kind, text: '', done: false };
        const index = id ? items.findIndex((it) => it.id === id) : items.length - 1;
        commit([...items.slice(0, index + 1), item, ...items.slice(index + 1)]);
        setFocusId(item.id);
    };

    const remove = (id: string) => {
        const index = items.findIndex((it) => it.id === id);
        const next = items.filter((it) => it.id !== id);
        commit(next.length ? next : [{ id: newId(), kind: 'text', text: '' }]);
        const previous = next[Math.max(0, index - 1)];
        if (previous) setFocusId(previous.id);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, item: NoteItem) => {
        // Entrée : nouvelle ligne du même type. Effacer sur une ligne vide : on la supprime.
        if (e.key === 'Enter') {
            e.preventDefault();
            insertAfter(item.id, item.kind);
        } else if (e.key === 'Backspace' && item.text === '' && items.length > 1) {
            e.preventDefault();
            remove(item.id);
        }
    };

    const hasDone = items.some((it) => it.kind === 'todo' && it.done);

    return (
        <div className={styles.notes}>
            <div className={styles.head}>
                <h2 className={styles.title}>Notes</h2>
                <span className={styles.status} aria-live="polite">
                    {STATUS_TEXT[status]}
                </span>
            </div>

            <ul className={styles.items}>
                {items.map((item) => (
                    <li key={item.id} className={item.kind === 'todo' && item.done ? styles.done : undefined}>
                        {item.kind === 'todo' && (
                            <input
                                type="checkbox"
                                className={styles.check}
                                checked={Boolean(item.done)}
                                disabled={readOnly}
                                aria-label={item.text ? `Cocher « ${item.text} »` : 'Cocher'}
                                onChange={(e) => patch(item.id, { done: e.target.checked })}
                            />
                        )}
                        <input
                            ref={(el) => {
                                if (el) inputs.current.set(item.id, el);
                                else inputs.current.delete(item.id);
                            }}
                            type="text"
                            className={styles.line}
                            value={item.text}
                            readOnly={readOnly}
                            aria-label={item.kind === 'todo' ? 'Élément de la liste' : 'Ligne de note'}
                            placeholder={item.kind === 'todo' ? 'À faire…' : 'Écris ici…'}
                            onChange={(e) => patch(item.id, { text: e.target.value })}
                            onKeyDown={(e) => onKeyDown(e, item)}
                        />
                    </li>
                ))}
            </ul>

            {!readOnly && (
                <div className={styles.toolbar}>
                    <button type="button" onClick={() => insertAfter(null, 'todo')}>
                        <Icon name="check" size={16} /> Case
                    </button>
                    <button type="button" onClick={() => insertAfter(null, 'text')}>
                        <Icon name="plus" size={16} /> Texte
                    </button>
                    {hasDone && (
                        <button type="button" onClick={() => commit(items.filter((it) => !(it.kind === 'todo' && it.done)))}>
                            Retirer les cochés
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}