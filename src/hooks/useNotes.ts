import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Lit et enregistre automatiquement la carte Notes (une seule par compte). */
export function useNotes() {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<number>();

  useEffect(() => {
    supabase
      .from('notes')
      .select('content')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setContent(data.content);
      });
  }, []);

  const update = (value: string) => {
    setContent(value);
    setStatus('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { error } = await supabase
        .from('notes')
        .upsert({ user_id: auth.user.id, content: value, updated_at: new Date().toISOString() });
      setStatus(error ? 'error' : 'saved');
    }, 700);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { content, update, status };
}
