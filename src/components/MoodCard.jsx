import { useState, useEffect } from 'react';
import { IconHeart } from './Icons.jsx';
import { promptForDay } from '../lib/prompts.js';

const MOODS = [
  { v: 1, e: '😔', label: 'Low' },
  { v: 2, e: '😕', label: 'Meh' },
  { v: 3, e: '😊', label: 'Okay' },
  { v: 4, e: '😄', label: 'Good' },
  { v: 5, e: '🤩', label: 'Great' },
];

export default function MoodCard({ day, dayKey, onSet, notify }) {
  const [note, setNote] = useState(day.moodNote || '');
  useEffect(() => { setNote(day.moodNote || ''); }, [day.moodNote]);
  const placeholder = promptForDay(dayKey);

  const pick = (v) => {
    onSet(v, note);
    notify(`Mood: ${MOODS[v-1].label}`, MOODS[v-1].e);
  };

  return (
    <div className="card">
      <div className="card-title"><span className="dot" style={{ background: 'var(--rose)' }} /><IconHeart size={15} /> Mood</div>

      <div className="mood-row">
        {MOODS.map((m) => (
          <button key={m.v} className={`mood-btn ${day.mood === m.v ? 'on' : ''}`} onClick={() => pick(m.v)}>
            <span className="mood-emoji">{m.e}</span>
            <span className="mood-label">{m.label}</span>
          </button>
        ))}
      </div>

      <textarea
        className="input mood-note"
        rows="2"
        placeholder={placeholder}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => onSet(day.mood, note)}
      />

      <style>{`
        .mood-row { display: flex; gap: 6px; justify-content: space-between; }
        .mood-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 12px 2px; border-radius: var(--r-md); background: var(--surface-soft);
          border: 1px solid transparent; transition: all var(--dur) var(--ease-spring); }
        .mood-emoji { font-size: 1.5rem; filter: grayscale(0.4); transition: all var(--dur) var(--ease-spring); }
        .mood-label { font-size: 0.62rem; font-weight: 600; color: var(--text-faint); }
        .mood-btn:hover { transform: translateY(-3px); }
        .mood-btn:hover .mood-emoji { filter: none; transform: scale(1.1); }
        .mood-btn.on { background: linear-gradient(135deg, #FBE3EA, #F6D0DB); border-color: var(--rose); }
        .mood-btn.on .mood-emoji { filter: none; transform: scale(1.25); }
        .mood-btn.on .mood-label { color: var(--rose); }
        .mood-note { margin-top: 14px; resize: none; }
      `}</style>
    </div>
  );
}
