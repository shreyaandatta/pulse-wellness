// Gentle reflection prompts for the mood note. They rotate automatically — a
// different one each day — so the journal field stays inviting instead of
// always asking the same thing. Deterministic per date, so it doesn't flicker
// as the screen re-renders.
export const NOTE_PROMPTS = [
  'A line about today…',
  'What made you smile today?',
  'One small win from today?',
  'What are you grateful for right now?',
  'How does your body feel today?',
  'What gave you energy today?',
  'What drained you today?',
  'A moment you want to remember?',
  'What would make tomorrow a little better?',
  "What's on your mind tonight?",
  'A thought you want to let go of?',
  'What did you do just for you today?',
  'How kind were you to yourself today?',
  'What surprised you today?',
  'One word for today?',
  'What are you looking forward to?',
  'Where did you feel most at ease?',
  'What challenged you today?',
  'A tiny joy from today?',
  'What did today teach you?',
  'How are you, really?',
  'What deserves a little celebration?',
  'What felt meaningful today?',
  'Something you noticed today?',
  'How do you want to feel tomorrow?',
];

// Pick a prompt for a given day key — stable through the day, changes daily.
export function promptForDay(key = '') {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return NOTE_PROMPTS[h % NOTE_PROMPTS.length];
}
