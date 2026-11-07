import { useEffect } from 'react';

export default function useEnterToAdvance(enabled: boolean, advance: () => void) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter' || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable || target.closest('button, a, select, textarea, input:not(:disabled)')
      )) return;

      event.preventDefault();
      advance();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, advance]);
}
