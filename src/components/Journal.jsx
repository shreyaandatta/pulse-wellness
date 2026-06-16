import { useMemo, useState } from 'react';
import { IconJournal } from './Icons.jsx';
import { promptForDay } from '../lib/prompts.js';
import { todayKey, prettyDate } from '../lib/dates.js';

// Mood 1..5 → a face, so an entry carries the feeling it was written with.
const MOOD_EMOJI = { 1: '😔', 2: '😕', 3: '😊', 4: '😄', 5: '🤩' };

// The Journal: a calm place to write a line about today and read back the days
// before. Entries ARE the day's reflection note (day.moodNote) — the same text
// the Mood card captures — so there's one journal, reachable from either place.
export default function Journal({ state, setNote, notify }) {
  const tKey = todayKey();
  const todayNote = state.days[tKey]?.moodNote || '';

  // Local draft for today's box; persists live so nothing is lost mid-thought.
  const [draft, setDraft] = useState(todayNote);
  const writeToday = (v) => { setDraft(v); setNote(tKey, v); };

  // Past entries — every earlier day that has a written note, newest first.
  const past = useMemo(() => {
    return Object.entries(state.days)
      .filter(([k, d]) => k !== tKey && (d.moodNote || '').trim())
      .map(([k, d]) => ({ key: k, note: d.moodNote, mood: d.mood }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [state.days, tKey]);

  const total = past.length + (draft.trim() ? 1 : 0);

  return (
    <div className="journal">
      <div className="card jr-today">
        <div className="card-title"><span className="dot" style={{ background: 'var(--rose)' }} /><IconJournal size={15} /> Today's entry</div>
        <p className="jr-prompt">{promptForDay(tKey)}</p>
        <textarea
          className="input jr-area"
          value={draft}
          onChange={(e) => writeToday(e.target.value)}
          onBlur={() => draft.trim() && notify?.('Saved to your journal', '📖')}
          placeholder="Write as much or as little as you like…"
          rows={4}
        />
        <div className="jr-meta">{prettyDate(tKey)}{total > 0 && <span className="faint"> · {total} {total === 1 ? 'entry' : 'entries'} so far</span>}</div>
      </div>

      {past.length > 0 ? (
        <div className="jr-list">
          <div className="section-head" style={{ margin: '8px 0 4px' }}><h2>Earlier days</h2></div>
          {past.map((e) => (
            <PastEntry key={e.key} entry={e} onSave={(v) => setNote(e.key, v)} />
          ))}
        </div>
      ) : (
        !draft.trim() && (
          <div className="jr-empty">
            <div className="jr-empty-mark">📖</div>
            <p>Your journal is empty.</p>
            <p className="faint">Write a line above — tomorrow it'll be here to look back on.</p>
          </div>
        )
      )}

      <style>{`
        .journal { display: flex; flex-direction: column; gap: var(--s-5); }
        .jr-prompt { font-family: var(--font-display); font-style: italic; font-size: var(--t-md);
          color: var(--text-soft); margin: 4px 0 10px; }
        .jr-area { width: 100%; resize: vertical; min-height: 96px; line-height: 1.55; font-family: var(--font-sans); }
        .jr-meta { margin-top: 8px; font-size: var(--t-xs); font-weight: 600; color: var(--text-soft); }
        .jr-list { display: flex; flex-direction: column; gap: var(--s-3); }
        .jr-empty { text-align: center; padding: var(--s-10) var(--s-4); color: var(--text-soft); }
        .jr-empty-mark { font-size: 2.4rem; margin-bottom: 8px; }
        .jr-empty p { margin: 2px 0; }
      `}</style>
    </div>
  );
}

// One earlier day. Reads collapsed; tap "Edit" to revise the note in place.
function PastEntry({ entry, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.note);

  const change = (v) => { setDraft(v); onSave(v); };

  return (
    <div className="card jr-entry">
      <div className="jr-entry-head">
        <span className="jr-entry-date">
          {entry.mood ? <span className="jr-entry-mood">{MOOD_EMOJI[entry.mood]}</span> : null}
          {prettyDate(entry.key)}
        </span>
        <span className="jr-entry-prompt faint">{promptForDay(entry.key)}</span>
        <button className="jr-edit" onClick={() => setEditing((v) => !v)}>{editing ? 'Done' : 'Edit'}</button>
      </div>

      {editing ? (
        <textarea className="input jr-area" value={draft} onChange={(e) => change(e.target.value)} rows={4} autoFocus />
      ) : (
        <p className="jr-entry-text">{draft}</p>
      )}

      <style>{`
        .jr-entry-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
        .jr-entry-date { font-weight: 700; font-size: var(--t-sm); color: var(--text); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
        .jr-entry-mood { font-size: 1.05rem; }
        .jr-entry-prompt { flex: 1; font-size: var(--t-xs); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .jr-edit { font-size: var(--t-xs); font-weight: 700; color: var(--amber-600); padding: 2px 4px; flex-shrink: 0; }
        .jr-edit:hover { color: var(--amber-700); }
        .jr-entry-text { white-space: pre-wrap; line-height: 1.6; color: var(--text); }
      `}</style>
    </div>
  );
}
