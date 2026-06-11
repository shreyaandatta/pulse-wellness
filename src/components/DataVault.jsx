import { useRef, useState } from 'react';
import HistoryHeatmap from './HistoryHeatmap.jsx';
import { usePWA } from '../hooks/usePWA.js';
import { exportJSON, exportCSV, parseBackup, dataStats, formatBytes } from '../lib/backup.js';
import { exportFoods, parseFoods, mergeFoods, allFoods } from '../lib/foods.js';
import { prettyDate, todayKey } from '../lib/dates.js';
import { IconDownload, IconUpload, IconShield, IconCheck, IconLeaf } from './Icons.jsx';

function lastBackupLabel(ts) {
  if (!ts) return 'Never';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function DataVault({ state, replaceAll, markBackup, setFoods, notify }) {
  const stats = dataStats(state);
  const pwa = usePWA();
  const fileRef = useRef(null);
  const foodFileRef = useRef(null);
  const foodCount = allFoods(state.foods).length;
  const customCount = (state.foods || []).length;
  const [pending, setPending] = useState(null); // parsed backup awaiting confirm
  const lastTs = state.settings.lastBackupAt;
  const stale = stats.dayCount > 0 && (!lastTs || Date.now() - lastTs > 7 * 86400000);

  const saveBackup = () => { exportJSON(state); markBackup(); notify('Backup saved to your downloads', '💾'); };
  const saveCSV = () => {
    if (!stats.dayCount) return notify('Nothing logged yet to export', '📄');
    exportCSV(state); notify('Spreadsheet exported', '📊');
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    try {
      const parsed = parseBackup(await file.text());
      setPending({ data: parsed, count: Object.keys(parsed.days).length, name: file.name });
    } catch (err) {
      notify(err.message, '⚠️');
    }
  };

  const confirmRestore = () => {
    replaceAll(pending.data);
    notify(`Restored ${pending.count} ${pending.count === 1 ? 'day' : 'days'}`, '✅');
    setPending(null);
  };

  const saveFoods = () => { exportFoods(state.foods); notify('Food library saved to downloads', '🥗'); };
  const onFoodFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const incoming = parseFoods(await file.text());
      const merged = mergeFoods(state.foods, incoming);
      setFoods(merged);
      notify(`Imported foods — ${merged.length} in your library`, '✅');
    } catch (err) {
      notify(err.message, '⚠️');
    }
  };

  return (
    <div className="vault stagger">
      {/* Hero: the data made visible */}
      <div className="card vault-hero">
        <div className="vh-head">
          <div>
            <div className="card-title" style={{ marginBottom: 6 }}>
              <span className="dot" style={{ background: 'var(--amber-500)' }} /> Your history
            </div>
            <p className="faint vh-sub">Every day you log becomes a point of light. It all lives on this device — yours to keep, back up, and carry anywhere.</p>
          </div>
          <div className="vh-count">
            <span className="vh-big">{stats.dayCount}</span>
            <span className="faint">{stats.dayCount === 1 ? 'day logged' : 'days logged'}</span>
          </div>
        </div>
        <HistoryHeatmap state={state} />
      </div>

      {/* At-a-glance stats */}
      <div className="vault-stats">
        <Stat label="Tracking since" value={stats.firstDay ? prettyDate(stats.firstDay) : '—'} />
        <Stat label="On this device" value={formatBytes(stats.bytes)} />
        <Stat label="Last backup" value={lastBackupLabel(lastTs)} warn={stale} />
      </div>

      {stale && (
        <div className="vault-nudge pop">
          You haven't backed up{lastTs ? ' in a while' : ' yet'}. One tap saves a copy you can restore anytime.
        </div>
      )}

      {/* Backup & restore */}
      <div className="card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--water)' }} /> Backup &amp; restore</div>
        <p className="faint" style={{ marginBottom: 16 }}>Save a file you can stash in cloud storage or move to another device. Restoring replaces what's currently here.</p>
        <div className="vault-actions">
          <button className="btn btn-primary" onClick={saveBackup}><IconDownload size={18} /> Save a backup</button>
          <button className="btn" onClick={saveCSV}><IconDownload size={18} /> Export spreadsheet</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><IconUpload size={18} /> Restore from a backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} hidden />
        </div>
      </div>

      {/* Food library */}
      <div className="card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--sage)' }} /><IconLeaf size={15} /> Food library</div>
        <p className="faint" style={{ marginBottom: 16 }}>
          <b>{foodCount}</b> foods to pick from when logging meals{customCount > 0 ? <> — including <b>{customCount}</b> you added</> : ''}.
          Save the whole database as a file, or import one to carry your foods to another device.
        </p>
        <div className="vault-actions">
          <button className="btn btn-primary" onClick={saveFoods}><IconDownload size={18} /> Save food database</button>
          <button className="btn" onClick={() => foodFileRef.current?.click()}><IconUpload size={18} /> Import foods</button>
          <input ref={foodFileRef} type="file" accept="application/json,.json" onChange={onFoodFile} hidden />
        </div>
      </div>

      {/* Install / offline */}
      <div className="card install-card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--sage)' }} /> Install Pulse</div>
        {pwa.installed ? (
          <p className="faint"><IconCheck size={15} /> Installed — Pulse runs from your home screen and works fully offline.</p>
        ) : (
          <>
            <p className="faint" style={{ marginBottom: 14 }}>Add Pulse to your home screen for a full-screen app that opens instantly and works with no connection.</p>
            {pwa.canInstall ? (
              <button className="btn btn-primary" onClick={async () => { (await pwa.install()) && notify('Pulse installed', '🎉'); }}>
                <IconDownload size={18} /> Install on this device
              </button>
            ) : (
              <p className="faint install-hint">
                <IconShield size={15} /> {pwa.online ? 'Ready to work offline.' : "You're offline — and Pulse still works."} On iPhone, tap Share → <b>Add to Home Screen</b>.
              </p>
            )}
          </>
        )}
      </div>

      {/* Restore confirmation */}
      {pending && (
        <div className="vault-modal" onClick={() => setPending(null)}>
          <div className="vault-dialog pop" onClick={(e) => e.stopPropagation()}>
            <div className="vd-icon"><IconUpload size={22} /></div>
            <h3>Restore this backup?</h3>
            <p className="faint">
              <b>{pending.name}</b> holds <b>{pending.count} {pending.count === 1 ? 'day' : 'days'}</b>.
              This replaces everything currently in Pulse — consider saving a backup of today first.
            </p>
            <div className="vd-actions">
              <button className="btn" onClick={() => setPending(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmRestore}>Replace &amp; restore</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .vault { display: flex; flex-direction: column; gap: var(--s-5); }
        .vault-hero { background: linear-gradient(165deg, var(--surface), color-mix(in srgb, var(--amber-100) 30%, var(--surface))); }
        .vh-head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--s-5); margin-bottom: var(--s-5); }
        .vh-sub { max-width: 46ch; line-height: 1.5; }
        .vh-count { text-align: right; display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
        .vh-big { font-family: var(--font-display); font-weight: 600; font-size: 2.6rem; line-height: 1; letter-spacing: -0.02em;
          background: linear-gradient(135deg, var(--amber-500), var(--clay)); -webkit-background-clip: text; background-clip: text; color: transparent; }

        .vault-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-4); }
        .v-stat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); padding: 14px 16px; box-shadow: var(--shadow-xs); }
        .v-stat .vs-val { font-family: var(--font-display); font-weight: 600; font-size: 1.05rem; line-height: 1.2; }
        .v-stat .vs-val.warn { color: var(--warn); }
        .v-stat .vs-lbl { font-size: var(--t-xs); color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; margin-top: 4px; }

        .vault-nudge { background: color-mix(in srgb, var(--warn) 12%, var(--surface)); border: 1px solid color-mix(in srgb, var(--warn) 35%, var(--border));
          color: var(--text); border-radius: var(--r-md); padding: 12px 16px; font-size: var(--t-sm); font-weight: 500; }

        .vault-actions { display: flex; flex-wrap: wrap; gap: 10px; }
        .install-hint { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .install-hint b { color: var(--text); }

        .vault-modal { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 20px;
          background: color-mix(in srgb, var(--ink-900) 45%, transparent); backdrop-filter: blur(4px); animation: fadeDown .2s var(--ease-out); }
        .vault-dialog { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
          padding: var(--s-6); max-width: 380px; width: 100%; box-shadow: var(--shadow-lg); text-align: center; }
        .vd-icon { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; margin: 0 auto 14px;
          background: linear-gradient(135deg, var(--amber-400), var(--amber-600)); color: #fff; box-shadow: var(--shadow-glow); }
        .vault-dialog h3 { font-family: var(--font-display); font-weight: 600; font-size: var(--t-md); margin-bottom: 8px; }
        .vault-dialog p { line-height: 1.5; margin-bottom: var(--s-5); }
        .vd-actions { display: flex; gap: 10px; justify-content: center; }
        .vd-actions .btn { flex: 1; }

        @media (max-width: 560px) {
          .vault-stats { grid-template-columns: 1fr; }
          .vh-head { flex-direction: column; }
          .vh-count { text-align: left; align-items: flex-start; flex-direction: row; gap: 8px; align-items: baseline; }
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className="v-stat">
      <div className={`vs-val ${warn ? 'warn' : ''}`}>{value}</div>
      <div className="vs-lbl">{label}</div>
    </div>
  );
}
