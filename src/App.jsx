import { useState, useCallback, useRef } from 'react';
import { usePulse } from './hooks/usePulse.js';
import { greeting, prettyDate, isToday, addDays, todayKey } from './lib/dates.js';
import {
  IconHome, IconTrends, IconGear, IconMoon, IconSun,
  IconChevronL, IconChevronR,
} from './components/Icons.jsx';

import WellnessRing from './components/WellnessRing.jsx';
import WaterCard from './components/WaterCard.jsx';
import WorkoutCard from './components/WorkoutCard.jsx';
import MealCard from './components/MealCard.jsx';
import SleepCard from './components/SleepCard.jsx';
import MoodCard from './components/MoodCard.jsx';
import StepsCard from './components/StepsCard.jsx';
import StreakCard from './components/StreakCard.jsx';
import TrendCharts from './components/TrendCharts.jsx';
import Settings from './components/Settings.jsx';

export default function App() {
  const p = usePulse();
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

          <div className="grid dash stagger" style={{ marginTop: 'var(--s-5)' }}>
            <WellnessRing day={p.day} dayKey={p.activeDay} goals={p.state.goals} notify={notify} />
            <StreakCard state={p.state} />
            <StepsCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} onAdd={p.addSteps} onSet={p.setSteps} notify={notify} />
          </div>

          <div className="section-head"><h2>Log your day</h2></div>
          <div className="grid trackers stagger">
            <WaterCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} units={settings.units} onAdd={p.addWater} notify={notify} />
            <WorkoutCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} onAdd={p.addWorkout} onRemove={p.removeWorkout} notify={notify} />
            <MealCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} onAdd={p.addMeal} onRemove={p.removeMeal} notify={notify} />
            <SleepCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} onSet={p.setSleep} notify={notify} />
            <MoodCard day={p.day} onSet={p.setMood} notify={notify} />
          </div>
        </div>
      )}

      {tab === 'trends' && (
        <div className="tab-pane" key="trends">
          <div className="section-head"><h2>Your trends</h2><span className="faint">last days at a glance</span></div>
          <TrendCharts state={p.state} units={settings.units} />
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
