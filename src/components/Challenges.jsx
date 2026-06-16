import { useState } from 'react';
import { IconTrophy, IconLock, IconCheck, IconTrash, IconPlus } from './Icons.jsx';
import { normHandle, handleError } from '../lib/social.js';
import { CH_METRICS, DURATIONS } from '../lib/challenges.js';
import { todayKey, keyToDate, prettyDate } from '../lib/dates.js';

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

// Days remaining in a challenge (inclusive of today), or an ended flag.
function timeLeft(ends) {
  const diff = Math.round((keyToDate(ends).getTime() - keyToDate(todayKey()).getTime()) / 86400000);
  if (diff < 0) return { ended: true, label: 'Ended' };
  if (diff === 0) return { ended: false, label: 'Last day' };
  return { ended: false, label: `${diff + 1} days left` };
}

// The Challenges tab. Cloud-only (like Friends/Family). Joining is free;
// creating a challenge needs Plus.
export default function Challenges({ challenges, user, notify, onLogout, plus, openPlus }) {
  if (!challenges.enabled) return <NeedsAccount user={user} onLogout={onLogout} />;
  if (challenges.loading && !challenges.list.length && !challenges.invites.length) {
    return <div className="card"><p className="faint" style={{ textAlign: 'center', padding: 'var(--s-5)' }}>Loading your challenges…</p></div>;
  }

  return (
    <div className="challenges stagger">
      {challenges.invites.length > 0 && <Invites challenges={challenges} notify={notify} />}

      {challenges.list.length > 0 && (
        <div className="ch-list">
          {challenges.list.map((c) => (
            <ChallengeCard key={c.id} c={c} challenges={challenges} notify={notify} />
          ))}
        </div>
      )}

      <CreateOrPaywall challenges={challenges} notify={notify} plus={plus} openPlus={openPlus} />

      <ChallengeStyle />
    </div>
  );
}

// ---- Guests / on-device ----
function NeedsAccount({ user, onLogout }) {
  return (
    <div className="card ch-empty">
      <div className="ch-mark"><IconTrophy size={30} /></div>
      <h3>Challenge your friends &amp; family</h3>
      <p className="faint">
        Set a shared goal — most steps this week, a daily wellness streak — and race
        each other up a live leaderboard. Because it's shared between people, it needs
        a free cloud account; guest mode stays private to this device.
      </p>
      {user?.guest && (
        <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={onLogout}>Create an account or sign in</button>
      )}
      <ChallengeStyle />
    </div>
  );
}

// ---- Pending invites addressed to me ----
function Invites({ challenges, notify }) {
  return (
    <div className="card">
      <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} /> Challenge invites</div>
      <div className="req-list">
        {challenges.invites.map((inv) => {
          const m = CH_METRICS[inv.metric] || {};
          return (
            <div className="req-row" key={inv.member_id}>
              <div className="req-who">
                <span className="ch-ava">{m.emoji || '🏆'}</span>
                <div>
                  <div className="req-name">{inv.title}</div>
                  <div className="faint">{inv.invited_by_name} invited you · {m.label} · ends {prettyDate(inv.ends)}</div>
                </div>
              </div>
              <div className="req-actions">
                <button className="btn btn-sm btn-primary" onClick={async () => { await challenges.accept(inv.member_id); notify('Joined the challenge 🏁'); }}>
                  <IconCheck size={15} /> Join
                </button>
                <button className="btn btn-sm" onClick={() => challenges.decline(inv.member_id)}>Decline</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- One challenge: header + live leaderboard + invite/leave/delete ----
function ChallengeCard({ c, challenges, notify }) {
  const meta = CH_METRICS[c.metric] || {};
  const mine = c.created_by === challenges.userId;
  const rows = [...(challenges.standings[c.id] || [])]
    .sort((a, b) => (Number(b.total) - Number(a.total)) || (Number(b.days_hit) - Number(a.days_hit)));
  const t = timeLeft(c.ends);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="card ch-card">
      <div className="ch-head">
        <div className="ch-title-wrap">
          <div className="ch-title">{meta.emoji} {c.title}</div>
          <div className="faint ch-sub">
            {meta.label}{c.goal != null && <> · target {meta.fmt ? meta.fmt(c.goal) : c.goal}{meta.unit}/day</>} · {c.member_count} in · <span className={t.ended ? 'ch-ended' : ''}>{t.label}</span>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="faint" style={{ padding: '8px 0' }}>No standings yet — once members open the app, their progress lands here.</p>
      ) : (
        <ol className="lb">
          {rows.map((r, i) => {
            const me = r.user_id === challenges.userId;
            const name = r.display_name || (r.username ? `@${r.username}` : 'Member');
            return (
              <li className={`lb-row ${me ? 'me' : ''}`} key={r.user_id}>
                <span className="lb-rank">{RANK_MEDAL[i] || i + 1}</span>
                <span className="lb-name">{me ? 'You' : name}</span>
                {Number(r.days_hit) > 0 && <span className="lb-hits">🎯 {r.days_hit}</span>}
                <span className="lb-total">{meta.fmt ? meta.fmt(r.total) : r.total}{meta.unit && <span className="lb-unit"> {meta.unit}</span>}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="ch-foot">
        {mine ? <InviteField c={c} challenges={challenges} notify={notify} /> : <span />}
        {mine ? (
          confirm ? (
            <span className="confirm-row">
              <span className="faint">Delete?</span>
              <button className="btn btn-xs btn-danger" onClick={async () => { await challenges.remove(c.id); notify('Challenge deleted'); }}>Yes</button>
              <button className="btn btn-xs" onClick={() => setConfirm(false)}>No</button>
            </span>
          ) : (
            <button className="icon-mini" onClick={() => setConfirm(true)} aria-label="Delete challenge"><IconTrash size={15} /></button>
          )
        ) : (
          confirm ? (
            <span className="confirm-row">
              <span className="faint">Leave?</span>
              <button className="btn btn-xs btn-danger" onClick={async () => { await challenges.leave(c.id); notify('You left the challenge'); }}>Leave</button>
              <button className="btn btn-xs" onClick={() => setConfirm(false)}>Cancel</button>
            </span>
          ) : (
            <button className="btn btn-xs" onClick={() => setConfirm(true)}>Leave</button>
          )
        )}
      </div>
    </div>
  );
}

function InviteField({ c, challenges, notify }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const invite = async () => {
    setErr(null);
    if (handleError(q)) { setErr('That doesn\'t look like a valid handle.'); return; }
    setBusy(true);
    try {
      const res = await challenges.invite(c.id, q);
      notify(res === 'exists' ? 'Already in the challenge' : 'Invite sent 📨', res === 'exists' ? '🙂' : '✨');
      setQ('');
    } catch (e) { setErr(e.message || 'Could not send the invite.'); }
    finally { setBusy(false); }
  };

  return (
    <span className="ch-invite">
      <span className="handle-field">
        <span className="at">@</span>
        <input className="input" value={q} placeholder="invite a handle"
          onChange={(e) => { setQ(e.target.value); setErr(null); }}
          onKeyDown={(e) => e.key === 'Enter' && invite()} />
      </span>
      <button className="btn btn-xs btn-primary" disabled={busy || !normHandle(q)} onClick={invite}><IconPlus size={13} /> {busy ? '…' : 'Invite'}</button>
      {err && <span className="handle-err" style={{ flexBasis: '100%' }}>{err}</span>}
    </span>
  );
}

// ---- Create a challenge (Plus) or see the pitch ----
function CreateOrPaywall({ challenges, notify, plus, openPlus }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState('steps');
  const [days, setDays] = useState(7);
  const [goal, setGoal] = useState(String(CH_METRICS.steps.defaultGoal));
  const [goalTouched, setGoalTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!plus) {
    return (
      <div className="card ch-empty">
        <div className="ch-mark"><IconTrophy size={30} /></div>
        <h3>Start a challenge with Pulse Plus</h3>
        <p className="faint">
          Create a shared goal, invite friends or family by their handle, and watch a live
          leaderboard. Anyone you invite can join and compete for free.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={openPlus}><IconLock size={15} /> Unlock Challenges with Plus</button>
      </div>
    );
  }

  const pickMetric = (m) => {
    setMetric(m);
    if (!goalTouched) setGoal(String(CH_METRICS[m].defaultGoal));
  };

  const create = async () => {
    setErr(null);
    if (!title.trim()) { setErr('Give your challenge a name.'); return; }
    setBusy(true);
    try {
      await challenges.create({ title, metric, goal: goal === '' ? null : Number(goal), days });
      notify('Challenge created 🏁');
      setOpen(false); setTitle(''); setGoalTouched(false); setGoal(String(CH_METRICS[metric].defaultGoal));
    } catch (e) { setErr(e.message || 'Could not create the challenge.'); }
    finally { setBusy(false); }
  };

  if (!open) {
    return (
      <button className="card ch-new" onClick={() => setOpen(true)}>
        <span className="ch-new-ic"><IconPlus size={20} /></span>
        <span>New challenge</span>
      </button>
    );
  }

  return (
    <div className="card ch-create">
      <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} /> New challenge</div>

      <label className="ch-lbl">Name</label>
      <input className="input" autoFocus value={title} maxLength={50} placeholder="e.g. October step showdown"
        onChange={(e) => setTitle(e.target.value)} />

      <label className="ch-lbl">Track</label>
      <div className="ch-seg">
        {Object.entries(CH_METRICS).map(([id, m]) => (
          <button key={id} className={`chip ${metric === id ? 'active' : ''}`} onClick={() => pickMetric(id)}>{m.emoji} {m.label}</button>
        ))}
      </div>

      <label className="ch-lbl">Daily target <span className="faint">· reach it to bank the day (optional)</span></label>
      <div className="ch-goal-row">
        <input className="input" type="number" inputMode="numeric" min="0" value={goal}
          onChange={(e) => { setGoal(e.target.value); setGoalTouched(true); }} placeholder="no target — just rank" />
        <span className="faint">{CH_METRICS[metric].unit || (metric === 'steps' ? 'steps' : '')}</span>
      </div>

      <label className="ch-lbl">For how long</label>
      <div className="ch-seg">
        {DURATIONS.map((d) => (
          <button key={d.days} className={`chip ${days === d.days ? 'active' : ''}`} onClick={() => setDays(d.days)}>{d.label}</button>
        ))}
      </div>

      {err && <div className="handle-err">{err}</div>}
      <div className="ch-create-foot">
        <button className="btn btn-sm" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn btn-sm btn-primary" disabled={busy || !title.trim()} onClick={create}>{busy ? 'Creating…' : 'Create & invite'}</button>
      </div>
    </div>
  );
}

function ChallengeStyle() {
  return (
    <style>{`
      .challenges { display: flex; flex-direction: column; gap: var(--s-5); }
      .ch-list { display: grid; grid-template-columns: 1fr; gap: var(--s-5); }
      @media (min-width: 720px) { .ch-list { grid-template-columns: 1fr 1fr; } }

      .ch-empty { text-align: center; padding: var(--s-10) var(--s-6); }
      .ch-mark { width: 64px; height: 64px; margin: 0 auto 14px; border-radius: var(--r-lg);
        display: grid; place-items: center; color: var(--amber-700);
        background: linear-gradient(150deg, var(--amber-100), var(--amber-200)); }
      .ch-empty h3 { font-family: var(--font-display); font-weight: 600; font-size: var(--t-md); margin-bottom: 8px; }
      .ch-empty p { max-width: 46ch; margin: 0 auto; line-height: 1.55; }
      .handle-err { color: var(--bad); font-size: var(--t-sm); margin-top: 8px; }

      .ch-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
      .ch-title { font-family: var(--font-display); font-weight: 600; font-size: var(--t-md); }
      .ch-sub { font-size: var(--t-xs); margin-top: 2px; }
      .ch-ended { color: var(--text-faint); }

      .lb { list-style: none; display: flex; flex-direction: column; gap: 4px; margin: 12px 0 4px; }
      .lb-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: var(--r-md);
        background: var(--surface-soft); border: 1px solid var(--border); }
      .lb-row.me { background: linear-gradient(135deg, var(--amber-100), var(--amber-200)); border-color: transparent; }
      .lb-rank { width: 24px; text-align: center; font-weight: 800; color: var(--text-soft); font-variant-numeric: tabular-nums; }
      .lb-name { flex: 1; font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .lb-hits { font-size: var(--t-xs); font-weight: 700; color: var(--text-soft); }
      .lb-total { font-weight: 800; font-variant-numeric: tabular-nums; }
      .lb-unit { font-weight: 600; color: var(--text-faint); font-size: var(--t-xs); }

      .ch-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
      .ch-invite { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .handle-field { display: inline-flex; align-items: center; gap: 2px; background: var(--surface-soft);
        border: 1px solid var(--border); border-radius: var(--r-pill); padding: 0 10px; }
      .handle-field .at { color: var(--text-faint); font-weight: 700; }
      .handle-field .input { border: none; background: transparent; padding: 7px 4px; width: 130px; }
      .confirm-row { display: inline-flex; align-items: center; gap: 6px; }

      .ch-new { display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer;
        font-weight: 700; color: var(--amber-700); border-style: dashed; }
      .ch-new-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%;
        background: linear-gradient(135deg, var(--amber-100), var(--amber-200)); }
      .ch-create .ch-lbl { display: block; font-size: var(--t-sm); font-weight: 600; color: var(--text-soft); margin: 14px 0 6px; }
      .ch-seg { display: flex; flex-wrap: wrap; gap: 8px; }
      .ch-seg .chip { flex: 1 1 auto; justify-content: center; }
      .ch-goal-row { display: flex; align-items: center; gap: 8px; }
      .ch-goal-row .input { flex: 1; }
      .ch-create-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

      .req-list { display: flex; flex-direction: column; gap: 10px; }
      .req-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
      .req-who { display: flex; align-items: center; gap: 10px; }
      .req-name { font-weight: 700; }
      .req-actions { display: inline-flex; gap: 6px; }
      .ch-ava { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 1.1rem;
        background: var(--surface-soft); border: 1px solid var(--border); flex: none; }

      .btn-xs { padding: 5px 10px; font-size: var(--t-xs); border-radius: var(--r-pill); font-weight: 600;
        background: var(--surface); border: 1px solid var(--border); color: var(--text); }
      .btn-danger { background: var(--bad); color: #fff; border-color: transparent; }
      .icon-mini { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
        color: var(--text-faint); background: var(--surface); border: 1px solid var(--border); }
      .icon-mini:hover { color: var(--bad); }
    `}</style>
  );
}
