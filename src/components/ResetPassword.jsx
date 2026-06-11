import { useState } from 'react';

// Shown when the user arrives via a password-reset email link. Supabase has
// already established a short-lived session for them, so all we do here is
// collect a new password and save it — then they're signed in.
export default function ResetPassword({ onSubmit, onCancel }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.length < 6) { setError('Use a password of at least 6 characters.'); return; }
    if (pw !== pw2) { setError("Those passwords don't match."); return; }
    setBusy(true);
    try {
      await onSubmit(pw);
    } catch (err) {
      setError(err.message || 'Could not update your password.');
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <div className="gate-card pop">
        <div className="gate-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="#FFFBF5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 13h4l2-5 3 9 2-6 1.5 2H21" />
          </svg>
        </div>
        <h2 className="gate-h2">Set a new password</h2>
        <p className="gate-tag" style={{ margin: '0 auto 18px' }}>Almost there — choose a new password for your account.</p>
        <form className="gate-form" onSubmit={submit}>
          <div className="field">
            <label>New password</label>
            <div className="pw-wrap">
              <input className="input" type={show ? 'text' : 'password'} value={pw}
                onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters"
                autoComplete="new-password" autoFocus />
              <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label="Toggle password visibility">
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input className="input" type={show ? 'text' : 'password'} value={pw2}
              onChange={(e) => setPw2(e.target.value)} placeholder="Re-enter it" autoComplete="new-password" />
          </div>
          {error && <div className="gate-error">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
        <div className="gate-switch">
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>

      <style>{`
        .gate { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
        .gate::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
          background:
            radial-gradient(820px 480px at 50% -10%, rgba(246,197,68,0.22), transparent 60%),
            radial-gradient(700px 460px at 90% 100%, rgba(217,119,74,0.12), transparent 55%); }
        .gate-card { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--r-xl); padding: var(--s-8) var(--s-6) var(--s-6); box-shadow: var(--shadow-lg); text-align: center; }
        .gate-mark { width: 64px; height: 64px; border-radius: 20px; margin: 0 auto var(--s-5);
          background: linear-gradient(140deg, var(--amber-400), var(--amber-600)); display: grid; place-items: center;
          box-shadow: var(--shadow-glow); }
        .gate-mark svg { width: 36px; height: 36px; }
        .gate-h2 { font-family: var(--font-display); font-weight: 600; font-size: var(--t-lg); margin-bottom: 8px; }
        .gate-tag { color: var(--text-soft); max-width: 32ch; line-height: 1.5; }
        .gate-form { display: flex; flex-direction: column; gap: 14px; text-align: left; }
        .gate-form label { font-size: var(--t-sm); font-weight: 600; color: var(--text-soft); }
        .pw-wrap { position: relative; }
        .pw-toggle { position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          font-size: var(--t-xs); font-weight: 700; color: var(--amber-600); padding: 4px 6px; }
        .gate-error { background: color-mix(in srgb, var(--bad) 12%, var(--surface)); color: var(--bad);
          border: 1px solid color-mix(in srgb, var(--bad) 35%, var(--border)); border-radius: var(--r-md);
          padding: 10px 12px; font-size: var(--t-sm); font-weight: 500; animation: popIn .3s var(--ease-spring); }
        .gate-switch { margin-top: var(--s-5); font-size: var(--t-sm); color: var(--text-soft); }
        .gate-switch button { color: var(--amber-600); font-weight: 700; }
        .gate-switch button:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
