// The five tracker cards on Today, as a reorderable/hideable registry. The app
// renders cards in `settings.pillarOrder`, skipping any in `settings.hiddenPillars`.
export const PILLARS = [
  { id: 'water',   label: 'Hydration', emoji: '💧' },
  { id: 'workout', label: 'Movement',  emoji: '🔥' },
  { id: 'meal',    label: 'Nutrition', emoji: '🥗' },
  { id: 'sleep',   label: 'Sleep',     emoji: '🌙' },
  { id: 'mood',    label: 'Mood',      emoji: '🌤️' },
];

export const DEFAULT_PILLAR_ORDER = PILLARS.map((p) => p.id);

// Normalise a saved order: keep known ids in their saved position, then append
// any pillar that's missing (e.g. one added in a later version).
export function resolveOrder(savedOrder) {
  const known = new Set(DEFAULT_PILLAR_ORDER);
  const clean = (savedOrder || []).filter((id) => known.has(id));
  const seen = new Set(clean);
  return [...clean, ...DEFAULT_PILLAR_ORDER.filter((id) => !seen.has(id))];
}
