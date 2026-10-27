import { useEffect, useRef } from 'react';

/**
 * Relance `callback` quand on revient sur l'appli (retour au premier plan)
 * et, si `intervalMs` est donné, à intervalle régulier tant qu'elle est ouverte.
 */
export function useRefreshOnReturn(callback: () => void, intervalMs?: number) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') saved.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = intervalMs ? window.setInterval(() => saved.current(), intervalMs) : undefined;
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) window.clearInterval(timer);
    };
  }, [intervalMs]);
}
