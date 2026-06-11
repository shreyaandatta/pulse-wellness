import { useState } from 'react';
import { IconUsers, IconCheck, IconTrash, IconFire, IconLock } from './Icons.jsx';
import { handleError, normHandle } from '../lib/social.js';
import { FREE_CONNECTIONS } from '../lib/plan.js';

const MOOD_E = ['😔', '😕', '😊', '😄', '🤩'];

export default function Friends({ social, user, notify, onLogout, plus, openPlus }) {
  if (!social.enabled) return <NeedsAccount user={user} onLogout={onLogout} />;
  if (social.loading && !social.profile) {
    return <div className="card"><p className="faint" style={{ textAlign: 'center', padding: 'var(--s-5)' }}>Loading your circle…</p></div>;
  }
  if (!social.profile) return <ClaimHandle social={social} notify={notify} />;
  return <FriendsHome social={social} notify={notify} plus={plus} openPlus={openPlus} />;
}

// ---- Guests / on-device: friends live in the cloud ----
function NeedsAccount({ user, onLogout }) {
  const guest = user?.guest;
  return (
    <div className="card friends-empty">
      <div className="fe-mark"><IconUsers size={30} /></div>
      <h3>Connect with people you care about</h3>
      <p className="faint">
        Friends and family let you share daily check-ins and cheer each other on.
        Because it syncs between people, it needs a free cloud account — guest mode stays
        private to this device.
      </p>
      {guest && (
        <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={onLogout}>
          Create an account or sign in
        </button>
      )}
      <FriendsStyle />
    </div>
  );
}

// ---- First run: pick a handle ----
function ClaimHandle({ social, notify }) {
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const norm = normHandle(handle);
  const liveErr = handle ? handleError(handle) : null;

  const submit = async () => {
    setErr(null);
    const bad = handleError(handle);
    if (bad) { setErr(bad); return; }
    setBusy(true);
    try {
      await social.claim(handle);
      notify(`You're @${norm}`, '👋');
    } catch (e) {
      setErr(e.message || 'Could not claim that handle.');
    } finally { setBusy(false); }
  };

  return (
    <div className="card friends-empty">
      <div className="fe-mark"><IconUsers size={30} /></div>
      <h3>Pick your handle</h3>
      <p className="faint">This is how friends find and add you. Letters, numbers and underscores — you can share it like a username.</p>
      <div className="handle-field">
        <span className="at">@</span>
        <input
          className="input" autoFocus value={handle} placeholder="yourname"
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      {(err || liveErr) && <div className="handle-err">{err || liveErr}</div>}
      <button className="btn btn-primary" disabled={busy || !norm} onClick={submit} style={{ marginTop: 12 }}>
        {busy ? 'Claiming…' : 'Claim handle'}
      </button>
      <FriendsStyle />
    </div>
  );
}

// ---- The full experience ----
function FriendsHome({ social, notify, plus, openPlus }) {
  const { profile, friends, incoming, outgoing, people } = social;
  // Free plan: up to FREE_CONNECTIONS people (accepted + requests you've sent).
  const activeCount = friends.length + outgoing.length;
  const atLimit = !plus && activeCount >= FREE_CONNECTIONS;
  const acceptBlocked = !plus && friends.length >= FREE_CONNECTIONS;

  return (
    <div className="grid cols-2 stagger friends-grid">
      <div className="card you-card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--good)' }} /> You are</div>
        <div className="you-handle">@{profile.username}</div>
        <button className="btn btn-sm" onClick={() => {
          try { navigator.clipboard?.writeText(`@${profile.username}`); notify('Handle copied', '📋'); } catch { /* ignore */ }
        }}>Copy handle to share</button>
        <p className="faint" style={{ marginTop: 12, fontSize: 'var(--t-xs)' }}>
          Share your handle and people can send you a request. They only ever see the
          summary you choose — never your journal notes.
        </p>
      </div>

      <AddFriend social={social} notify={notify} atLimit={atLimit} openPlus={openPlus} />

      {incoming.length > 0 && (
        <div className="card span-2">
          <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} /> Requests for you</div>
          <div className="req-list">
            {incoming.map((f) => {
              const p = people[social.otherId(f)];
              return (
                <div className="req-row" key={f.id}>
                  <div className="req-who">
                    <span className="avatar sm">{initial(p)}</span>
                    <div><div className="req-name">{p?.display_name || `@${p?.username || '…'}`}</div>
                      {p?.username && <div className="faint">@{p.username}</div>}</div>
                  </div>
                  <div className="req-actions">
                    <button className="btn btn-sm btn-primary" onClick={async () => {
                      if (acceptBlocked) { openPlus(); return; }
                      await social.accept(f.id); notify('Connected ✨');
                    }}>{acceptBlocked ? <IconLock size={15} /> : <IconCheck size={15} />} Accept</button>
                    <button className="btn btn-sm" onClick={() => social.decline(f.id)}>Decline</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card span-2">
        <div className="card-title"><span className="dot" style={{ background: 'var(--water)' }} /> Your people {friends.length > 0 && <span className="faint" style={{ fontWeight: 500 }}>· {friends.length}</span>}</div>
        {friends.length === 0 ? (
          <p className="faint" style={{ padding: 'var(--s-4) 0' }}>No connections yet. Add someone by their handle above — once they accept, their daily check-in shows up here.</p>
        ) : (
          <div className="friend-list">
            {friends.map((f) => (
              <FriendCard key={f.id} f={f} social={social} notify={notify} />
            ))}
          </div>
        )}
      </div>

      {outgoing.length > 0 && (
        <div className="card span-2">
          <div className="card-title"><span className="dot" style={{ background: 'var(--text-faint)' }} /> Sent · waiting</div>
          <div className="req-list">
            {outgoing.map((f) => {
              const p = people[social.otherId(f)];
              return (
                <div className="req-row" key={f.id}>
                  <div className="req-who">
                    <span className="avatar sm">{initial(p)}</span>
                    <div><div className="req-name">{p?.display_name || `@${p?.username || '…'}`}</div>
                      {p?.username && <div className="faint">@{p.username}</div>}</div>
                  </div>
                  <div className="req-actions">
                    <span className="pending-pill">Pending</span>
                    <button className="icon-mini" onClick={() => social.remove(f.id)} aria-label="Cancel request"><IconTrash size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FriendsStyle />
    </div>
  );
}

function AddFriend({ social, notify, atLimit, openPlus }) {
  const [q, setQ] = useState('');
  const [result, setResult] = useState(undefined); // undefined=idle, null=not found, obj=found
  const [busy, setBusy] = useState(false);

  if (atLimit) {
    return (
      <div className="card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} /> Add a friend</div>
        <p className="faint" style={{ marginBottom: 12 }}>
          You're connected with <b>{FREE_CONNECTIONS}</b> people — that's the free plan's circle.
          Pulse Plus removes the limit so the whole family fits.
        </p>
        <button className="btn btn-sm btn-primary" onClick={openPlus}><IconLock size={14} /> Go unlimited with Plus</button>
      </div>
    );
  }

  const run = async () => {
    if (handleError(q)) { setResult(null); return; }
    setBusy(true);
    try { setResult(await social.search(q)); }
    catch { setResult(null); }
    finally { setBusy(false); }
  };

  const add = async (id) => {
    const res = await social.addFriend(id);
    if (res === 'accepted') notify('Connected ✨');
    else if (res === 'exists') notify('Already connected', '🙂');
    else notify('Request sent', '📨');
    setQ(''); setResult(undefined);
  };

  return (
    <div className="card">
      <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} /> Add a friend</div>
      <div className="add-row">
        <div className="handle-field grow">
          <span className="at">@</span>
          <input className="input" value={q} placeholder="their handle"
            onChange={(e) => { setQ(e.target.value); setResult(undefined); }}
            onKeyDown={(e) => e.key === 'Enter' && run()} />
        </div>
        <button className="btn btn-sm" disabled={busy || !normHandle(q)} onClick={run}>{busy ? '…' : 'Find'}</button>
      </div>
      {result === null && <p className="faint" style={{ marginTop: 10 }}>No one found with that handle.</p>}
      {result && (
        <div className="found-row">
          <div className="req-who">
            <span className="avatar sm">{initial(result)}</span>
            <div><div className="req-name">{result.display_name || `@${result.username}`}</div>
              <div className="faint">@{result.username}</div></div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => add(result.id)}>Send request</button>
        </div>
      )}
    </div>
  );
}

function FriendCard({ f, social, notify }) {
  const id = social.otherId(f);
  const p = social.people[id];
  const snap = social.snaps[id];
  const s = snap?.summary;
  const detail = snap?.detail && Object.keys(snap.detail).length ? snap.detail : null;
  const myLevel = social.myShareLevel(f);
  const name = p?.display_name || s?.name || `@${p?.username || 'friend'}`;
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="friend-card">
      <div className="fc-head">
        <span className="avatar">{initial(p) || (s?.name || '?').charAt(0).toUpperCase()}</span>
        <div className="fc-id">
          <div className="fc-name">{name}</div>
          {p?.username && <div className="faint">@{p.username}</div>}
        </div>
        {s && <div className="fc-score"><span className="fc-num">{s.score}</span><span className="faint">{s.band?.emoji}</span></div>}
      </div>

      {s ? (
        <>
          <div className="fc-stats">
            <span className="fc-chip"><IconFire size={13} /> {s.streak}d</span>
            <span className="fc-chip">🎯 {s.goalsHit}/{s.goalsTotal}</span>
            <span className="fc-chip">{s.band?.label}</span>
          </div>
          {Array.isArray(s.last7) && <Spark values={s.last7} />}
          {detail && (
            <div className="fc-detail">
              <span title="Water">💧 {Math.round((detail.water?.value || 0) / 100) / 10}L</span>
              <span title="Sleep">🌙 {detail.sleep?.value != null ? `${detail.sleep.value}h` : '—'}</span>
              <span title="Active">🔥 {detail.active?.value || 0}m</span>
              <span title="Meals">🥗 {detail.meals?.value || 0}</span>
              <span title="Steps">👟 {fmtK(detail.steps?.value || 0)}</span>
              <span title="Mood">{detail.mood ? MOOD_E[detail.mood - 1] : '🌤️'}</span>
            </div>
          )}
        </>
      ) : (
        <p className="faint" style={{ fontSize: 'var(--t-xs)', padding: '8px 0' }}>No check-in shared yet.</p>
      )}

      <div className="fc-foot">
        <div className="share-seg" title="How much of your day this person can see">
          <span className="seg-label">They see</span>
          <button className={`seg ${myLevel === 'summary' ? 'on' : ''}`} onClick={() => social.setShare(f, 'summary')}>Summary</button>
          <button className={`seg ${myLevel === 'detail' ? 'on' : ''}`} onClick={() => social.setShare(f, 'detail')}>Detail</button>
        </div>
        {!confirm ? (
          <button className="icon-mini" onClick={() => setConfirm(true)} aria-label="Remove friend"><IconTrash size={15} /></button>
        ) : (
          <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={async () => { await social.remove(f.id); notify('Removed', '👋'); }}>Remove?</button>
        )}
      </div>
    </div>
  );
}

// Tiny 7-day score sparkline.
function Spark({ values }) {
  const max = Math.max(100, ...values);
  return (
    <div className="spark" aria-hidden>
      {values.map((v, i) => (
        <span key={i} className="spark-bar" style={{ height: `${Math.max(6, (v / max) * 100)}%`, opacity: i === values.length - 1 ? 1 : 0.55 }} />
      ))}
    </div>
  );
}

function initial(p) {
  const base = p?.display_name || p?.username || '';
  return base ? base.trim().charAt(0).toUpperCase() : '?';
}
function fmtK(n) { return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`; }

function FriendsStyle() {
  return (
    <style>{`
      .friends-grid { align-items: start; }
      .span-2 { grid-column: 1 / -1; }
      @media (max-width: 720px) { .span-2 { grid-column: auto; } }

      .friends-empty { text-align: center; max-width: 480px; margin: 0 auto; padding: var(--s-7) var(--s-5); }
      .fe-mark { width: 64px; height: 64px; border-radius: 20px; margin: 0 auto var(--s-4);
        display: grid; place-items: center; color: var(--amber-600);
        background: linear-gradient(140deg, var(--amber-100), var(--amber-200)); box-shadow: var(--shadow-sm); }
      .friends-empty h3 { font-family: var(--font-display); font-size: var(--t-lg); margin-bottom: 8px; }

      .you-card .you-handle { font-family: var(--font-display); font-weight: 600; font-size: var(--t-xl);
        color: var(--amber-600); margin: 4px 0 12px; }

      .handle-field { display: flex; align-items: center; gap: 4px; background: var(--surface-soft);
        border: 1px solid var(--border); border-radius: var(--r-md); padding: 0 12px; }
      .handle-field.grow { flex: 1; }
      .handle-field .at { color: var(--text-faint); font-weight: 700; }
      .handle-field .input { border: none; background: transparent; padding-left: 4px; }
      .handle-err { color: var(--bad); font-size: var(--t-xs); margin-top: 8px; }

      .add-row { display: flex; gap: 8px; align-items: stretch; }
      .found-row, .req-row { display: flex; align-items: center; justify-content: space-between; gap: 12px;
        padding: 10px 0; }
      .found-row { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 14px; }
      .req-list { display: flex; flex-direction: column; }
      .req-row { border-bottom: 1px solid var(--border); }
      .req-row:last-child { border-bottom: none; }
      .req-who { display: flex; align-items: center; gap: 11px; min-width: 0; }
      .req-name { font-weight: 600; }
      .req-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
      .pending-pill { font-size: var(--t-xs); font-weight: 600; color: var(--text-faint);
        background: var(--surface-soft); border: 1px solid var(--border); padding: 4px 10px; border-radius: var(--r-pill); }

      .avatar { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
        font-family: var(--font-display); font-weight: 600; font-size: 1.15rem; color: #fff;
        background: linear-gradient(135deg, var(--amber-400), var(--amber-600)); box-shadow: var(--shadow-xs); }
      .avatar.sm { width: 36px; height: 36px; font-size: 1rem; }

      .friend-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; margin-top: 6px; }
      .friend-card { background: var(--surface-soft); border: 1px solid var(--border); border-radius: var(--r-lg);
        padding: 14px; display: flex; flex-direction: column; gap: 10px; }
      .fc-head { display: flex; align-items: center; gap: 11px; }
      .fc-id { min-width: 0; flex: 1; }
      .fc-name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .fc-score { display: flex; align-items: baseline; gap: 4px; }
      .fc-num { font-family: var(--font-display); font-weight: 700; font-size: 1.5rem; color: var(--amber-600); font-variant-numeric: tabular-nums; }
      .fc-stats { display: flex; flex-wrap: wrap; gap: 6px; }
      .fc-chip { display: inline-flex; align-items: center; gap: 4px; font-size: var(--t-xs); font-weight: 600;
        color: var(--text-soft); background: var(--surface); border: 1px solid var(--border); padding: 3px 9px; border-radius: var(--r-pill); }
      .fc-detail { display: flex; flex-wrap: wrap; gap: 9px; font-size: var(--t-xs); font-weight: 600; color: var(--text-soft);
        padding-top: 8px; border-top: 1px dashed var(--border); }

      .spark { display: flex; align-items: flex-end; gap: 3px; height: 30px; padding: 2px 0; }
      .spark-bar { flex: 1; min-height: 2px; border-radius: 2px; background: linear-gradient(var(--amber-400), var(--amber-500)); }

      .fc-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; }
      .share-seg { display: inline-flex; align-items: center; gap: 2px; background: var(--surface); border: 1px solid var(--border);
        border-radius: var(--r-pill); padding: 2px; }
      .seg-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-faint); padding: 0 6px; }
      .seg { font-size: var(--t-xs); font-weight: 600; color: var(--text-soft); padding: 4px 9px; border-radius: var(--r-pill); transition: all var(--dur-fast); }
      .seg.on { background: linear-gradient(135deg, var(--amber-400), var(--amber-600)); color: #fff; box-shadow: var(--shadow-xs); }

      .icon-mini { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center;
        color: var(--text-faint); background: var(--surface); border: 1px solid var(--border); transition: all var(--dur-fast); }
      .icon-mini:hover { color: var(--bad); border-color: var(--bad); }
    `}</style>
  );
}
