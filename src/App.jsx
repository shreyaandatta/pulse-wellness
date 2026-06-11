import { useState, useCallback, useRef, useEffect, cloneElement } from 'react';
import { usePulse } from './hooks/usePulse.js';
import { useAuth } from './hooks/useAuth.js';
import { useCloudSync } from './hooks/useCloudSync.js';
import { hasSupabase } from './lib/supabase.js';
import { resolveOrder } from './lib/pillars.js';
import { setFeedbackConfig, haptic } from './lib/feedback.js';
import { greeting, prettyDate, isToday, addDays, todayKey } from './lib/dates.js';
import {
  IconHome, IconTrends, IconGear, IconMoon, IconSun,
  IconChevronL, IconChevronR, IconShield, IconInsight,
} from './components/Icons.jsx';

import AuthGate from './components/AuthGate.jsx';
import Onboarding from './components/Onboarding.jsx';
import WellnessRing from './components/WellnessRing.jsx';
import WaterCard from './components/WaterCard.jsx';
import WorkoutCard from './components/WorkoutCard.jsx';
import MealCard from './components/MealCard.jsx';
import SleepCard from './components/SleepCard.jsx';
import MoodCard from './components/MoodCard.jsx';
import StepsCard from './components/StepsCard.jsx';
import StreakCard from './components/StreakCard.jsx';
import TrendCharts from './components/TrendCharts.jsx';
import Insights from './components/Insights.jsx';
import SmartNudge from './components/SmartNudge.jsx';
import DataVault from './components/DataVault.jsx';
import Settings from './components/Settings.jsx';

export default function App() {
  const auth = useAuth();
  if (auth.loading) return <Splash />;
  if (!auth.user) {
    return <AuthGate cloud={hasSupabase} onSignup={auth.signup} onLogin={auth.login} onGuest={auth.guest} />;
  }
  // Remount per account so the wellness store reloads that user's data.
  return <PulseApp key={auth.user.id} auth={auth} />;
}

// Brief splash while a cloud session is restored on first load.
function Splash() {
  return (
    <div className="splash">
      <div className="splash-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="#FFFBF5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 13h4l2-5 3 9 2-6 1.5 2H21" />
        </svg>
      </div>
      <style>{`
        .splash { min-height: 100dvh; display: grid; place-items: center; }
        .splash-mark { width: 60px; height: 60px; border-radius: 18px; display: grid; place-items: center;
          background: linear-gradient(140deg, var(--amber-400), var(--amber-600)); box-shadow: var(--shadow-glow);
          animation: pulseGlow 1.6s var(--ease-out) infinite; }
        .splash-mark svg { width: 34px; height: 34px; }
      `}</style>
    </div>
  );
}

function PulseApp({ auth }) {
  const p = usePulse();
  // Sync this account's data with the cloud (no-op for guests / on-device accounts).
  useCloudSync({ cloudUserId: auth.user.cloud ? auth.user.id : null, state: p.state, replaceAll: p.replaceAll });
  const [tab, setTab] = useState('today');
  const [toasts, setToasts] = useState([]);
  const tid = useRef(0);

  const notify = useCallback((msg, emoji = '✨') => {
    const id = ++tid.current;
    setToasts((t) => [...t, { id, msg, emoji }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1900);
  }, []);

  const { settings } = p.state;
  const name = settings.name ? `, ${settings.name}` : '';

  // Keep haptics/sound feedback in sync with the user's preferences.
  useEffect(() => {
    setFeedbackConfig({ haptics: settings.haptics, sounds: settings.sounds });
  }, [settings.haptics, settings.sounds]);

  // A light buzz on any control tap (no-op where unsupported / disabled).
  useEffect(() => {
    const onTap = (e) => { if (e.target.closest('button, .chip, .food-row, .q-dot')) haptic(6); };
    window.addEventListener('pointerdown', onTap);
    return () => window.removeEventListener('pointerdown', onTap);
  }, []);

  // A freshly created account hasn't been set up yet — greet it.
  if (auth.user.isNew && !settings.onboarded) {
    return (
      <Onboarding
        name={auth.user.name}
        goals={p.state.goals}
        settings={settings}
        onFinish={(goals, patch) => { p.setGoals(goals); p.setSettings(patch); auth.clearNew(); }}
      />
    );
  }

  // Today's tracker cards, keyed by pillar id so layout settings can reorder/hide them.
  const pillarCards = {
    water: <WaterCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} units={settings.units} onAdd={p.addWater} notify={notify} />,
    workout: <WorkoutCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} onAdd={p.addWorkout} onRemove={p.removeWorkout} notify={notify} />,
    meal: <MealCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} foods={p.state.foods} onAdd={p.addMeal} onAddFood={p.addFood} onRemove={p.removeMeal} notify={notify} />,
    sleep: <SleepCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} onSet={p.setSleep} notify={notify} />,
    mood: <MoodCard day={p.day} dayKey={p.activeDay} onSet={p.setMood} notify={notify} />,
  };
  const visiblePillars = resolveOrder(settings.pillarOrder).filter((id) => !(settings.hiddenPillars || []).includes(id));

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="#FFFBF5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13h4l2-5 3 9 2-6 1.5 2H21" />
            </svg>
          </div>
          <div>
            <h1>Pulse</h1>
            <div className="date">{greeting()}{name} · {prettyDate(p.activeDay)}</div>
          </div>
        </div>

        <div className="topbar-actions">
          <nav className="toptabs">
            <button className={`tab ${tab==='today'?'active':''}`} onClick={() => setTab('today')}><IconHome size={17} /> Today</button>
            <button className={`tab ${tab==='trends'?'active':''}`} onClick={() => setTab('trends')}><IconTrends size={17} /> Trends</button>
            <button className={`tab ${tab==='insights'?'active':''}`} onClick={() => setTab('insights')}><IconInsight size={17} /> Insights</button>
            <button className={`tab ${tab==='data'?'active':''}`} onClick={() => setTab('data')}><IconShield size={17} /> Data</button>
            <button className={`tab ${tab==='settings'?'active':''}`} onClick={() => setTab('settings')}><IconGear size={17} /> Settings</button>
          </nav>
          <button className="icon-btn" onClick={p.toggleTheme} aria-label="Toggle theme">
            {settings.theme === 'dark' ? <IconSun size={19} /> : <IconMoon size={19} />}
          </button>
        </div>
      </header>

      {tab === 'today' && (
        <div className="tab-pane" key="today">
          <DaySwitcher activeDay={p.activeDay} setActiveDay={p.setActiveDay} />

          {isToday(p.activeDay) && <SmartNudge state={p.state} units={settings.units} />}

          <div className="grid dash stagger" style={{ marginTop: 'var(--s-5)' }}>
            <WellnessRing day={p.day} dayKey={p.activeDay} goals={p.state.goals} notify={notify} />
            <StreakCard state={p.state} />
            <StepsCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} onAdd={p.addSteps} onSet={p.setSteps} notify={notify} />
          </div>

          <div className="section-head"><h2>Log your day</h2></div>
          {visiblePillars.length > 0 ? (
            <div className="grid trackers stagger">
              {visiblePillars.map((id) => cloneElement(pillarCards[id], { key: id }))}
            </div>
          ) : (
            <p className="faint" style={{ textAlign: 'center', padding: 'var(--s-6)' }}>
              All trackers are hidden. Re-enable them in <b>Settings → Dashboard layout</b>.
            </p>
          )}
        </div>
      )}

      {tab === 'trends' && (
        <div className="tab-pane" key="trends">
          <div className="section-head"><h2>Your trends</h2><span className="faint">last days at a glance</span></div>
          <TrendCharts state={p.state} units={settings.units} />
        </div>
      )}

      {tab === 'insights' && (
        <div className="tab-pane" key="insights">
          <div className="section-head"><h2>Insights</h2><span className="faint">patterns from your own days</span></div>
          <Insights state={p.state} units={settings.units} />
        </div>
      )}

      {tab === 'data' && (
        <div className="tab-pane" key="data">
          <div className="section-head"><h2>Your data</h2><span className="faint">private · portable · yours</span></div>
          <DataVault state={p.state} replaceAll={p.replaceAll} markBackup={p.markBackup} setFoods={p.setFoods} notify={notify} />
        </div>
      )}

      {tab === 'settings' && (
        <div className="tab-pane" key="settings">
          <div className="section-head"><h2>Settings</h2></div>
          <Settings
            state={p.state}
            setGoals={p.setGoals} setSettings={p.setSettings}
            toggleTheme={p.toggleTheme} toggleUnits={p.toggleUnits}
            resetAll={p.resetAll} notify={notify}
            user={auth.user} onLogout={auth.logout}
          />
        </div>
      )}

      {/* mobile bottom nav */}
      <nav className="tabbar">
        <button className={`tab ${tab==='today'?'active':''}`} onClick={() => setTab('today')}>
          <span className="tab-icon"><IconHome size={22} /></span> Today
        </button>
        <button className={`tab ${tab==='trends'?'active':''}`} onClick={() => setTab('trends')}>
          <span className="tab-icon"><IconTrends size={22} /></span> Trends
        </button>
        <button className={`tab ${tab==='insights'?'active':''}`} onClick={() => setTab('insights')}>
          <span className="tab-icon"><IconInsight size={22} /></span> Insights
        </button>
        <button className={`tab ${tab==='data'?'active':''}`} onClick={() => setTab('data')}>
          <span className="tab-icon"><IconShield size={22} /></span> Data
        </button>
        <button className={`tab ${tab==='settings'?'active':''}`} onClick={() => setTab('settings')}>
          <span className="tab-icon"><IconGear size={22} /></span> Settings
        </button>
      </nav>

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div className="toast" key={t.id}><span className="t-emoji">{t.emoji}</span>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}

function DaySwitcher({ activeDay, setActiveDay }) {
  const today = isToday(activeDay);
  return (
    <div className="day-switch">
      <button className="icon-btn" onClick={() => setActiveDay(addDays(activeDay, -1))} aria-label="Previous day"><IconChevronL size={18} /></button>
      <button className="day-label" onClick={() => setActiveDay(todayKey())}>
        {today ? 'Today' : prettyDate(activeDay)}
        {!today && <span className="back-today">tap for today</span>}
      </button>
      <button className="icon-btn" onClick={() => setActiveDay(addDays(activeDay, 1))} disabled={today} aria-label="Next day"
        style={{ opacity: today ? 0.35 : 1 }}><IconChevronR size={18} /></button>

      <style>{`
        .day-switch { display: flex; align-items: center; justify-content: center; gap: var(--s-3); }
        .day-label { display: flex; flex-direction: column; align-items: center; min-width: 160px;
          padding: 9px 18px; border-radius: var(--r-pill); background: var(--surface); border: 1px solid var(--border);
          font-family: var(--font-display); font-weight: 600; font-size: var(--t-md); box-shadow: var(--shadow-xs);
          transition: transform var(--dur-fast) var(--ease-spring); }
        .day-label:active { transform: scale(0.96); }
        .back-today { font-family: var(--font-sans); font-size: 0.62rem; font-weight: 600; color: var(--amber-600); text-transform: uppercase; letter-spacing: 0.04em; }
      `}</style>
    </div>
  );
}
