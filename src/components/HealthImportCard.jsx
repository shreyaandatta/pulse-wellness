import { useRef, useState } from 'react';
import { IconHeart, IconUpload, IconCheck, IconChevronR } from './Icons.jsx';
import { parseHealthFile } from '../lib/healthImport.js';
import { prettyDate, todayKey } from '../lib/dates.js';
import HealthExportGuide from './HealthExportGuide.jsx';

// Homepage "sync" card. Apple Health / Google Fit have no live web API, so the
// flow is: the user exports a file once (the card shows how), then one tap here
// reads it and fills in steps, sleep, workouts and weight across every day.
export default function HealthImportCard({ onImport, lastSync, skipGuide, onSkipGuide, notify }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showHow, setShowHow] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const openPicker = () => fileRef.current?.click();

  // First time (or until they tick "don't show again") the button opens the
  // animated walkthrough; after that it goes straight to the file picker.
  const onImportClick = () => {
    if (skipGuide) openPicker();
    else setGuideOpen(true);
  };

  const proceedFromGuide = (dontShow) => {
    if (dontShow) onSkipGuide(true);
    setGuideOpen(false);
    openPicker();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const parsed = await parseHealthFile(file);
      onImport(parsed);
      setResult(parsed.summary);
      const where = parsed.source === 'apple' ? 'Apple Health' : 'Google Fit';
      notify(`Synced ${parsed.summary.days} days from ${where}`, '❤️');
    } catch (err) {
      setError(err?.message || 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  };

  const syncedToday = lastSync === todayKey();
  const n = (x) => (x || 0).toLocaleString();
  const plural = (x, word) => `${n(x)} ${word}${x === 1 ? '' : 's'}`;

  return (
    <div className="card health-import">
      <div className="card-title">
        <span className="dot" style={{ background: 'var(--rose, #e1607e)' }} />
        <IconHeart size={15} /> Sync health data
      </div>

      <p className="hi-lead">
        Pull your <b>steps, sleep, workouts &amp; weight</b> straight from Apple Health
        or Google Fit. Export once on your phone, then it&apos;s one tap here.
      </p>

      <button className="btn btn-primary hi-cta" onClick={onImportClick} disabled={busy}>
        <IconUpload size={18} /> {busy ? 'Reading your file…' : 'Import health file'}
      </button>

      {guideOpen && (
        <HealthExportGuide onClose={() => setGuideOpen(false)} onProceed={proceedFromGuide} />
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".zip,.xml,.csv,.json,application/zip,text/xml,text/csv,application/json"
        onChange={onFile}
        hidden
      />

      {result && (
        <div className="hi-result">
          <div className="hi-result-head"><IconCheck size={16} /> Imported</div>
          <div className="hi-chips">
            <span className="hi-chip">📅 {plural(result.days, 'day')}</span>
            <span className="hi-chip">👟 {plural(result.steps, 'step')}</span>
            {result.workouts > 0 && <span className="hi-chip">🔥 {plural(result.workouts, 'workout')}</span>}
            {result.sleepNights > 0 && <span className="hi-chip">😴 {plural(result.sleepNights, 'night')}</span>}
            {result.weights > 0 && <span className="hi-chip">⚖️ {plural(result.weights, 'weigh-in')}</span>}
          </div>
          {result.from && (
            <div className="faint" style={{ marginTop: 8 }}>
              {result.from === result.to ? prettyDate(result.from) : `${prettyDate(result.from)} → ${prettyDate(result.to)}`}
            </div>
          )}
        </div>
      )}

      {error && <div className="hi-error">{error}</div>}

      {!result && !error && syncedToday && (
        <div className="faint hi-last">Last synced today — re-import any time to top up.</div>
      )}
      {!result && !error && !syncedToday && lastSync && (
        <div className="faint hi-last">Last synced {prettyDate(lastSync)}.</div>
      )}

      <button className="hi-how" onClick={() => setShowHow((v) => !v)}>
        <IconChevronR size={15} style={{ transform: showHow ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
        How to export from my phone
      </button>

      {showHow && (
        <div className="hi-guide">
          <div className="hi-guide-block">
            <h4>🍎 iPhone — Apple Health</h4>
            <ol>
              <li>Open the <b>Health</b> app, tap your <b>profile photo</b> (top-right).</li>
              <li>Scroll down → <b>Export All Health Data</b> → wait, then <b>Save to Files</b>.</li>
              <li>Come back here, tap <b>Import health file</b>, and pick that <b>export.zip</b>.</li>
            </ol>
          </div>
          <div className="hi-guide-block">
            <h4>🤖 Android — Google Fit</h4>
            <ol>
              <li>Go to <b>takeout.google.com</b>, tap <b>Deselect all</b>, then tick <b>Fit</b>.</li>
              <li>Tap <b>Export</b> and download the zip Google prepares for you.</li>
              <li>Come back here, tap <b>Import health file</b>, and pick that zip.</li>
            </ol>
          </div>
          <p className="faint hi-note">
            Your file is read entirely on your device — nothing is uploaded. We only keep
            steps, sleep, workouts and weight; the rest of the export is ignored.
          </p>
        </div>
      )}

      <style>{`
        .health-import .hi-lead { color: var(--ink-2); font-size: var(--t-sm); line-height: 1.5; margin: 4px 0 14px; }
        .health-import .hi-cta { width: 100%; justify-content: center; gap: 8px; }
        .health-import .hi-result {
          margin-top: 14px; padding: 12px 14px; border-radius: var(--r-md);
          background: var(--surface-2, rgba(0,0,0,.03)); border: 1px solid var(--line);
        }
        .health-import .hi-result-head {
          display: flex; align-items: center; gap: 6px; font-weight: 600;
          color: var(--green-600, #2e8b57); font-size: var(--t-sm); margin-bottom: 8px;
        }
        .health-import .hi-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .health-import .hi-chip {
          font-size: var(--t-xs); padding: 4px 9px; border-radius: 999px;
          background: var(--surface, #fff); border: 1px solid var(--line); white-space: nowrap;
        }
        .health-import .hi-error {
          margin-top: 12px; padding: 10px 12px; border-radius: var(--r-md);
          background: rgba(220,80,80,.08); border: 1px solid rgba(220,80,80,.25);
          color: var(--rose-700, #b3445e); font-size: var(--t-sm); line-height: 1.45;
        }
        .health-import .hi-last { margin-top: 10px; font-size: var(--t-xs); }
        .health-import .hi-how {
          display: flex; align-items: center; gap: 6px; margin-top: 14px;
          background: none; border: none; padding: 0; cursor: pointer;
          color: var(--ink-2); font-size: var(--t-sm); font-weight: 500;
        }
        .health-import .hi-guide { margin-top: 12px; display: grid; gap: 14px; }
        .health-import .hi-guide-block h4 { margin: 0 0 6px; font-size: var(--t-sm); }
        .health-import .hi-guide-block ol { margin: 0; padding-left: 18px; display: grid; gap: 5px; }
        .health-import .hi-guide-block li { font-size: var(--t-sm); color: var(--ink-2); line-height: 1.5; }
        .health-import .hi-note { font-size: var(--t-xs); line-height: 1.5; margin: 0; }
      `}</style>
    </div>
  );
}
