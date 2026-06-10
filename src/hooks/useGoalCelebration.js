import { useEffect, useRef } from 'react';
import { celebrate } from '../lib/celebrate.js';

// Fires confetti + a glow on the card the moment `reached` flips false -> true.
// Switching days only re-baselines, so browsing to an already-completed day
// never celebrates retroactively.
export function useGoalCelebration(reached, dayKey, cardRef, onCelebrate) {
  const prev = useRef({ dayKey, reached });

  useEffect(() => {
    const last = prev.current;
    prev.current = { dayKey, reached };
    if (last.dayKey !== dayKey) return;

    if (reached && !last.reached) {
      const el = cardRef.current;
      celebrate(el);
      el?.classList.add('goal-glow');
      const t = setTimeout(() => el?.classList.remove('goal-glow'), 1300);
      onCelebrate?.();
      return () => clearTimeout(t);
    }
  }, [reached, dayKey]);
}
