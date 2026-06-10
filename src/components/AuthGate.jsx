import { useState } from 'react';

// The doorway. Accounts are optional — "Explore as guest" is always one tap
// away so anyone (a recruiter, a friend) can be inside the app instantly.
export default function AuthGate({ cloud, onSignup, onLogin, onGuest }) {
  const [mode, setMode] = useState('welcome'); // welcome | signin | signup
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); // email when cloud, username otherwise
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reset = (m) => { setError(''); setNotice(''); setPassword(''); setMode(m); };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const res = await onSignup(name, username, password);
        if (res?.needsConfirm) {
          reset('signin');
          setNotice('Account created! Check your email to confirm, then sign in.');
          setBusy(false);
          return;
        }
      } else {
        await onLogin(username, password);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <div className="gate-card pop" key={mode}>
        <div className="gate-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="#FFFBF5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 13h4l2-5 3 9 2-6 1.5 2H21" className="wave-draw" />
          </svg>
        </div>

        {mode === 'welcome' && (
          <>
            <h1 className="gate-title">Pulse</h1>
            <p className="gate-tag">A calm, private home for your daily wellbeing. Five pillars, one score, zero noise.</p>
            <div className="gate-actions">
              <button className="btn btn-primary btn-block" onClick={() => reset('signup')}>Create your account</button>
              <button className="btn btn-block" onClick={() => reset('signin')}>I already have one</button>
              <button className="btn-ghost btn-block gate-guest" onClick={onGuest}>Explore as guest →</button>
            </div>
            {notice && <div className="gate-notice">{notice}</div>}
            <p className="gate-foot">{cloud
              ? 'Your account syncs securely across your devices.'
              : 'Accounts are saved privately on this device — no cloud, no tracking.'}</p>
          </>
        )}

        {mode !== 'welcome' && (
          <>
            <h2 className="gate-h2">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
            <form className="gate-form" onSubmit={submit}>
              {mode === 'signup' && (
                <div className="field">
                  <label>Your name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="What should we call you?" autoFocus />
                </div>
              )}
              <div className="field">
                <label>{cloud ? 'Email' : 'Username'}</label>
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)}
                  type={cloud ? 'email' : 'text'}
                  placeholder={cloud ? 'you@example.com' : 'e.g. shreyaan'}
                  autoComplete={cloud ? 'email' : 'username'} autoCapitalize="none" autoFocus={mode === 'signin'} />
              </div>
              <div className="field">
                <label>Password</label>
                <div className="pw-wrap">
                  <input className="input" type={show ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                  <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label="Toggle password visibility">
                    {show ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {notice && <div className="gate-notice">{notice}</div>}
              {error && <div className="gate-error">{error}</div>}

              <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 6 }}>
                {busy ? 'One moment…' : (mode === 'signup' ? 'Create account' : 'Sign in')}
              </button>
            </form>

            <div className="gate-switch">
              {mode === 'signup' ? (
                <>Already have an account? <button onClick={() => reset('signin')}>Sign in</button></>
              ) : (
                <>New here? <button onClick={() => reset('signup')}>Create one</button></>
              )}
              <span className="gate-dot">·</span>
              <button onClick={onGuest}>Continue as guest</button>
            </div>
          </>
        )}
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
          box-shadow: var(--shadow-glow); animation: pulseGlow 3.4s var(--ease-out) infinite; }
        .gate-mark svg { width: 36px; height: 36px; }
        .wave-draw { stroke-dasharray: 44; stroke-dashoffset: 44; animation: drawWave 1.1s var(--ease-out) .15s forwards; }
        @keyframes drawWave { to { stroke-dashoffset: 0; } }

        .gate-title { font-family: var(--font-display); font-weight: 600; font-size: 2.6rem; line-height: 1; letter-spacing: -0.02em; }
        .gate-tag { color: var(--text-soft); margin: 10px auto 0; max-width: 30ch; line-height: 1.5; }
        .gate-actions { display: flex; flex-direction: column; gap: 10px; margin-top: var(--s-6); }
        .gate-guest { margin-top: 2px; }
        .gate-foot { font-size: var(--t-xs); color: var(--text-faint); margin-top: var(--s-5); }

        .gate-h2 { font-family: var(--font-display); font-weight: 600; font-size: var(--t-lg); margin-bottom: var(--s-5); }
        .gate-form { display: flex; flex-direction: column; gap: 14px; text-align: left; }
        .gate-form label { font-size: var(--t-sm); font-weight: 600; color: var(--text-soft); }
        .pw-wrap { position: relative; }
        .pw-toggle { position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          font-size: var(--t-xs); font-weight: 700; color: var(--amber-600); padding: 4px 6px; }
        .gate-error { background: color-mix(in srgb, var(--bad) 12%, var(--surface)); color: var(--bad);
          border: 1px solid color-mix(in srgb, var(--bad) 35%, var(--border)); border-radius: var(--r-md);
          padding: 10px 12px; font-size: var(--t-sm); font-weight: 500; animation: popIn .3s var(--ease-spring); }
        .gate-notice { background: color-mix(in srgb, var(--good) 12%, var(--surface)); color: var(--good);
          border: 1px solid color-mix(in srgb, var(--good) 35%, var(--border)); border-radius: var(--r-md);
          padding: 10px 12px; font-size: var(--t-sm); font-weight: 500; margin-top: 12px; animation: popIn .3s var(--ease-spring); }
        .gate-switch { margin-top: var(--s-5); font-size: var(--t-sm); color: var(--text-soft); }
        .gate-switch button { color: var(--amber-600); font-weight: 700; }
        .gate-switch button:hover { text-decoration: underline; }
        .gate-dot { margin: 0 8px; color: var(--text-faint); }
      `}</style>
    </div>
  );
}
