import { useState } from 'react';
import { IconFamily, IconUsers, IconLock, IconCheck, IconTrash, IconFire, IconPlus } from './Icons.jsx';
import { normHandle, handleError } from '../lib/social.js';

const MOOD_E = ['😔', '😕', '😊', '😄', '🤩'];

// The Family tab. Cloud-only (like Friends): heads see each member's daily
// stats; members see who can see theirs. Creating a family needs Plus; invited
// members join free.
export default function Family({ family, user, notify, onLogout, plus, openPlus }) {
  if (!family.enabled) return <NeedsAccount user={user} onLogout={onLogout} />;
  if (family.loading && !family.family && !family.invites.length) {
    return <div className="card"><p className="faint" style={{ textAlign: 'center', padding: 'var(--s-5)' }}>Loading your family…</p></div>;
  }

  const hasFamily = !!family.family;

  return (
    <div className="family stagger">
      {family.invites.length > 0 && <Invites family={family} notify={notify} />}

      {hasFamily ? (
        family.amHead
          ? <HeadView family={family} notify={notify} />
          : <MemberView family={family} notify={notify} />
      ) : (
        family.invites.length === 0 && <CreateOrPaywall family={family} notify={notify} plus={plus} openPlus={openPlus} />
      )}

      <FamilyStyle />
    </div>
  );
}

// ---- Guests / on-device: family lives in the cloud ----
function NeedsAccount({ user, onLogout }) {
  const guest = user?.guest;
  return (
    <div className="card family-empty">
      <div className="fe-mark"><IconFamily size={30} /></div>
      <h3>Bring the household together</h3>
      <p className="faint">
        Family lets a parent see each kid's day at a glance — steps, meals, protein,
        workouts and mood. Because it syncs between people, it needs a free cloud
        account; guest mode stays private to this device.
      </p>
      {guest && (
        <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={onLogout}>
          Create an account or sign in
        </button>
      )}
      <FamilyStyle />
    </div>
  );
}

// ---- No family yet: create one (Plus) or see the pitch ----
function CreateOrPaywall({ family, notify, plus, openPlus }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!plus) {
    return (
      <div className="card family-empty">
        <div className="fe-mark"><IconFamily size={30} /></div>
        <h3>Start a family with Pulse Plus</h3>
        <p className="faint">
          Create a household, invite up to two parents and your kids, and see everyone's
          steps, calories, protein, workouts and mood in one place. Invited members join free.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={openPlus}>
          <IconLock size={15} /> Unlock Family with Plus
        </button>
      </div>
    );
  }

  const create = async () => {
    setErr(null);
    if (!name.trim()) { setErr('Give your family a name.'); return; }
    setBusy(true);
    try { await family.create(name); notify('Family created 🎉'); }
    catch (e) { setErr(e.message || 'Could not create the family.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="card family-empty">
      <div className="fe-mark"><IconFamily size={30} /></div>
      <h3>Create your family</h3>
      <p className="faint">Name your household. You'll be its first head — invite a co-parent and your kids next.</p>
      <input
        className="input" autoFocus value={name} placeholder="e.g. The Datta family" maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && create()}
        style={{ marginTop: 12, textAlign: 'center' }}
      />
      {err && <div className="handle-err">{err}</div>}
      <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={create} style={{ marginTop: 12 }}>
        {busy ? 'Creating…' : 'Create family'}
      </button>
    </div>
  );
}

// ---- Pending invites addressed to me ----
function Invites({ family, notify }) {
  return (
    <div className="card span-2">
      <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} /> Family invites</div>
      <div className="req-list">
        {family.invites.map((inv) => (
          <div className="req-row" key={inv.member_id}>
            <div className="req-who">
              <span className="avatar sm"><IconFamily size={16} /></span>
              <div>
                <div className="req-name">{inv.family_name}</div>
                <div className="faint">{inv.invited_by_name} invited you as a {inv.role === 'head' ? 'parent' : 'kid'}</div>
              </div>
            </div>
            <div className="req-actions">
              <button className="btn btn-sm btn-primary" onClick={async () => { await family.accept(inv.member_id); notify('Joined the family 🏡'); }}>
                <IconCheck size={15} /> Join
              </button>
              <button className="btn btn-sm" onClick={() => family.decline(inv.member_id)}>Decline</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Head view: manage the family + see everyone's day ----
function HeadView({ family, notify }) {
  const { family: fam, members, heads, kids, snaps } = family;
  const others = members.filter((m) => !m.isMe);

  return (
    <>
      <div className="card span-2 fam-head-card">
        <div className="fam-title-row">
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}><span className="dot" style={{ background: 'var(--good)' }} /> {fam.name}</div>
            <div className="faint" style={{ fontSize: 'var(--t-xs)' }}>{heads.length} {heads.length === 1 ? 'parent' : 'parents'} · {kids.length} {kids.length === 1 ? 'kid' : 'kids'}</div>
          </div>
          <FamilyMenu family={family} notify={notify} />
        </div>
      </div>

      <AddMember family={family} notify={notify} />

      <div className="card span-2">
        <div className="card-title"><span className="dot" style={{ background: 'var(--water)' }} /> Everyone today</div>
        {others.length === 0 ? (
          <p className="faint" style={{ padding: 'var(--s-4) 0' }}>
            No one's joined yet. Invite a parent or kid by their handle above — once they accept,
            their day shows up here.
          </p>
        ) : (
          <div className="member-list">
            {others.map((m) => (
              <MemberCard key={m.id} m={m} snap={snaps[m.memberUserId]} family={family} notify={notify} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AddMember({ family, notify }) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('kid');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const invite = async () => {
    setErr(null);
    if (handleError(q)) { setErr('That doesn\'t look like a valid handle.'); return; }
    setBusy(true);
    try {
      const res = await family.invite(q, role);
      if (res === 'exists') notify('Already in the family', '🙂');
      else notify('Invite sent 📨');
      setQ('');
    } catch (e) { setErr(e.message || 'Could not send the invite.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="card span-2">
      <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} /> Add a family member</div>
      <div className="add-member">
        <div className="handle-field grow">
          <span className="at">@</span>
          <input className="input" value={q} placeholder="their handle"
            onChange={(e) => { setQ(e.target.value); setErr(null); }}
            onKeyDown={(e) => e.key === 'Enter' && invite()} />
        </div>
        <div className="role-seg" role="group" aria-label="Role">
          <button className={`role-opt ${role === 'kid' ? 'on' : ''}`} onClick={() => setRole('kid')}>Kid</button>
          <button className={`role-opt ${role === 'head' ? 'on' : ''}`} onClick={() => setRole('head')}>Parent</button>
        </div>
        <button className="btn btn-sm btn-primary" disabled={busy || !normHandle(q)} onClick={invite}>
          <IconPlus size={14} /> {busy ? '…' : 'Invite'}
        </button>
      </div>
      {err && <p className="handle-err" style={{ textAlign: 'left' }}>{err}</p>}
      <p className="faint" style={{ marginTop: 8, fontSize: 'var(--t-xs)' }}>
        A family can have up to two parents (heads). Members only ever share the same curated
        daily numbers they'd share with a friend — never journal notes.
      </p>
    </div>
  );
}

// One member's day, as a head sees it.
function MemberCard({ m, snap, family, notify }) {
  const [confirm, setConfirm] = useState(false);
  const s = snap?.summary;
  const d = snap?.detail && Object.keys(snap.detail).length ? snap.detail : null;
  const name = m.displayName || s?.name || `@${m.username || 'member'}`;
  const isParent = m.role === 'head';
  const canDemote = isParent; // a co-head can be demoted to kid

  return (
    <div className="member-card">
      <div className="mc-head">
        <span className="avatar">{(name || '?').charAt(0).toUpperCase()}</span>
        <div className="mc-id">
          <div className="mc-name">{name} <span className={`role-chip ${isParent ? 'parent' : ''}`}>{isParent ? 'Parent' : 'Kid'}</span></div>
          {m.username && <div className="faint">@{m.username}{snap?.updated_at && <> · {ago(snap.updated_at)}</>}</div>}
        </div>
        {s && <div className="mc-score"><span className="mc-num">{s.score}</span><span className="faint">{s.band?.emoji}</span></div>}
      </div>

      {s ? (
        <div className="mc-stats">
          <Stat emoji="👟" label="steps" value={fmtK(d?.steps?.value || 0)} />
          <Stat emoji="🍽️" label="kcal" value={d?.calories?.value ? Math.round(d.calories.value).toLocaleString() : '—'} />
          <Stat emoji="🍗" label="protein" value={d?.protein?.value ? `${Math.round(d.protein.value)}g` : '—'} />
          <Stat emoji="🔥" label="active" value={`${d?.active?.value || 0}m`} />
          <Stat emoji={d?.mood ? MOOD_E[d.mood - 1] : '🌤️'} label="mood" value={d?.mood ? ['Low', 'Meh', 'OK', 'Good', 'Great'][d.mood - 1] : '—'} />
        </div>
      ) : (
        <p className="faint" style={{ fontSize: 'var(--t-xs)', padding: '8px 0' }}>No check-in shared yet today.</p>
      )}

      <div className="mc-foot">
        <button className="btn btn-xs" onClick={async () => {
          try { await family.setRole(m.id, isParent ? 'kid' : 'head'); notify(isParent ? 'Now a kid' : 'Now a parent', '🔁'); }
          catch (e) { notify(e.message || 'Could not change role', '⚠️'); }
        }}>{isParent ? 'Make kid' : 'Make parent'}</button>
        {confirm ? (
          <span className="confirm-row">
            <span className="faint">Remove?</span>
            <button className="btn btn-xs btn-danger" onClick={async () => { await family.remove(m.id); notify('Removed from family'); }}>Yes</button>
            <button className="btn btn-xs" onClick={() => setConfirm(false)}>No</button>
          </span>
        ) : (
          <button className="icon-mini" onClick={() => setConfirm(true)} aria-label="Remove member"><IconTrash size={15} /></button>
        )}
      </div>
    </div>
  );
}

// ---- Member (kid / co-parent) view: who sees me + my own day + leave ----
function MemberView({ family, notify }) {
  const { family: fam, heads } = family;
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="card span-2 fam-member-card">
      <div className="card-title"><span className="dot" style={{ background: 'var(--good)' }} /> {fam.name}</div>
      <p className="member-lede">You're part of <b>{fam.name}</b>.</p>

      <div className="who-sees">
        <div className="ws-title"><IconUsers size={16} /> Who can see your day</div>
        {heads.length === 0 ? (
          <p className="faint">No parents yet.</p>
        ) : (
          <ul className="ws-list">
            {heads.map((h) => (
              <li key={h.id}>{h.displayName || `@${h.username}`}{h.isMe && ' (you)'} <span className="role-chip parent">Parent</span></li>
            ))}
          </ul>
        )}
        <p className="faint" style={{ fontSize: 'var(--t-xs)', marginTop: 8 }}>
          Parents see the same curated daily numbers you'd share with a friend — your steps,
          meals, protein, workouts and mood. Never your journal notes.
        </p>
      </div>

      <div className="mv-foot">
        {confirm ? (
          <span className="confirm-row">
            <span className="faint">Leave {fam.name}?</span>
            <button className="btn btn-sm btn-danger" onClick={async () => { await family.leave(); notify('You left the family'); }}>Leave</button>
            <button className="btn btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
          </span>
        ) : (
          <button className="btn btn-sm" onClick={() => setConfirm(true)}>Leave family</button>
        )}
      </div>
    </div>
  );
}

// Family settings menu for a head: rename, disband.
function FamilyMenu({ family, notify }) {
  const [mode, setMode] = useState(null); // null | 'rename' | 'disband'
  const [name, setName] = useState(family.family?.name || '');

  if (mode === 'rename') {
    return (
      <span className="fam-menu-edit">
        <input className="input" value={name} maxLength={40} autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && family.rename(name).then(() => { setMode(null); notify('Renamed'); })} />
        <button className="btn btn-xs btn-primary" disabled={!name.trim()} onClick={() => family.rename(name).then(() => { setMode(null); notify('Renamed'); })}>Save</button>
        <button className="btn btn-xs" onClick={() => setMode(null)}>Cancel</button>
      </span>
    );
  }
  if (mode === 'disband') {
    return (
      <span className="confirm-row">
        <span className="faint">Disband family?</span>
        <button className="btn btn-xs btn-danger" onClick={() => family.disband().then(() => notify('Family disbanded'))}>Disband</button>
        <button className="btn btn-xs" onClick={() => setMode(null)}>Cancel</button>
      </span>
    );
  }
  return (
    <span className="fam-menu">
      <button className="btn btn-xs" onClick={() => { setName(family.family?.name || ''); setMode('rename'); }}>Rename</button>
      <button className="btn btn-xs btn-danger-ghost" onClick={() => setMode('disband')}>Disband</button>
    </span>
  );
}

function Stat({ emoji, label, value }) {
  return (
    <div className="stat">
      <div className="stat-emoji">{emoji}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

function ago(ts) {
  if (!ts) return null;
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 90) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtK(n) { return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`; }

function FamilyStyle() {
  return (
    <style>{`
      .family { display: grid; grid-template-columns: 1fr; gap: var(--s-5); }
      @media (min-width: 720px) { .family { grid-template-columns: 1fr 1fr; } .family .span-2 { grid-column: 1 / -1; } }

      .family-empty { text-align: center; padding: var(--s-10) var(--s-6); grid-column: 1 / -1; }
      .fe-mark { width: 64px; height: 64px; margin: 0 auto 14px; border-radius: var(--r-lg);
        display: grid; place-items: center; color: var(--amber-700);
        background: linear-gradient(150deg, var(--amber-100), var(--amber-200)); }
      .family-empty h3 { font-family: var(--font-display); font-weight: 600; font-size: var(--t-md); margin-bottom: 8px; }
      .family-empty p { max-width: 46ch; margin: 0 auto; line-height: 1.55; }
      .handle-err { color: var(--bad); font-size: var(--t-sm); margin-top: 8px; }

      .fam-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      .fam-menu, .fam-menu-edit { display: inline-flex; gap: 6px; align-items: center; }
      .fam-menu-edit .input { width: 160px; }

      /* add member */
      .add-member { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .handle-field { display: inline-flex; align-items: center; gap: 2px; background: var(--surface-soft);
        border: 1px solid var(--border); border-radius: var(--r-pill); padding: 0 12px; }
      .handle-field.grow { flex: 1; min-width: 140px; }
      .handle-field .at { color: var(--text-faint); font-weight: 700; }
      .handle-field .input { border: none; background: transparent; padding: 9px 4px; }
      .role-seg { display: inline-flex; background: var(--surface-soft); border: 1px solid var(--border); border-radius: var(--r-pill); padding: 3px; }
      .role-opt { padding: 6px 12px; border-radius: var(--r-pill); font-size: var(--t-sm); font-weight: 600; color: var(--text-soft); }
      .role-opt.on { background: linear-gradient(135deg, var(--amber-100), var(--amber-200)); color: var(--amber-800); }

      /* member cards */
      .member-list { display: grid; grid-template-columns: 1fr; gap: 12px; }
      @media (min-width: 560px) { .member-list { grid-template-columns: 1fr 1fr; } }
      .member-card { border: 1px solid var(--border); border-radius: var(--r-md); padding: 14px; background: var(--surface-soft); }
      .mc-head { display: flex; align-items: center; gap: 10px; }
      .avatar { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-weight: 700;
        color: #fff; background: linear-gradient(135deg, var(--amber-400), var(--clay)); flex: none; }
      .avatar.sm { width: 30px; height: 30px; font-size: var(--t-sm); }
      .mc-id { flex: 1; min-width: 0; }
      .mc-name { font-weight: 700; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .role-chip { font-size: 0.58rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
        padding: 2px 7px; border-radius: 99px; background: var(--surface); border: 1px solid var(--border); color: var(--text-soft); }
      .role-chip.parent { background: linear-gradient(135deg, var(--amber-100), var(--amber-200)); color: var(--amber-800); border-color: transparent; }
      .mc-score { display: flex; flex-direction: column; align-items: center; line-height: 1; }
      .mc-num { font-family: var(--font-display); font-weight: 600; font-size: 1.5rem; }

      .mc-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 12px; }
      .stat { text-align: center; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 8px 2px; }
      .stat-emoji { font-size: 1rem; }
      .stat-val { font-weight: 700; font-size: var(--t-sm); margin-top: 2px; }
      .stat-lbl { font-size: 0.56rem; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.04em; }

      .mc-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; }
      .confirm-row { display: inline-flex; align-items: center; gap: 6px; }

      /* member (kid) view */
      .member-lede { margin: 4px 0 14px; }
      .who-sees { background: var(--surface-soft); border: 1px solid var(--border); border-radius: var(--r-md); padding: 14px; }
      .ws-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: var(--t-sm); margin-bottom: 8px; }
      .ws-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
      .ws-list li { display: flex; align-items: center; gap: 8px; font-weight: 600; }
      .mv-foot { margin-top: 14px; }

      .req-list { display: flex; flex-direction: column; gap: 10px; }
      .req-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
      .req-who { display: flex; align-items: center; gap: 10px; }
      .req-name { font-weight: 700; }
      .req-actions { display: inline-flex; gap: 6px; }

      .btn-xs { padding: 5px 10px; font-size: var(--t-xs); border-radius: var(--r-pill); font-weight: 600;
        background: var(--surface); border: 1px solid var(--border); color: var(--text); }
      .btn-danger { background: var(--bad); color: #fff; border-color: transparent; }
      .btn-danger-ghost { color: var(--bad); }
      .icon-mini { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
        color: var(--text-faint); background: var(--surface); border: 1px solid var(--border); }
      .icon-mini:hover { color: var(--bad); }
    `}</style>
  );
}
