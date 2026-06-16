import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePulse } from './hooks/usePulse.js';
import { useAuth } from './hooks/useAuth.js';
import { useCloudSync } from './hooks/useCloudSync.js';
import { useSocial } from './hooks/useSocial.js';
import { useFamily } from './hooks/useFamily.js';
import { useEntitlement } from './hooks/useEntitlement.js';
import { hasSupabase } from './lib/supabase.js';
import { getDay } from './lib/storage.js';
import { resolveOrder } from './lib/pillars.js';
import { isPlus } from './lib/plan.js';
import { startSubscription, cancelSubscription } from './lib/billing.js';
import { setFeedbackConfig, haptic } from './lib/feedback.js';
import { greeting, prettyDate, isToday, addDays, todayKey } from './lib/dates.js';
import {
  IconHome, IconTrends, IconGear, IconMoon, IconSun,
  IconChevronL, IconChevronR, IconShield, IconInsight, IconUsers, IconTrophy, IconDots, IconFamily,
} from './components/Icons.jsx';
import { resolveBadges, BADGES } from './lib/badges.js';
import { celebrate } from './lib/celebrate.js';

import AuthGate from './components/AuthGate.jsx';
import ResetPassword from './components/ResetPassword.jsx';
import Onboarding from './components/Onboarding.jsx';
import WellnessRing from './components/WellnessRing.jsx';
import WaterCard from './components/WaterCard.jsx';
import WorkoutCard from './components/WorkoutCard.jsx';
import MealCard from './components/MealCard.jsx';
import SleepCard from './components/SleepCard.jsx';
import MoodCard from './components/MoodCard.jsx';
import StepsCard from './components/StepsCard.jsx';
import StreakCard from './components/StreakCard.jsx';
import WeightCard from './components/WeightCard.jsx';
import WelcomeChecklist from './components/WelcomeChecklist.jsx';
import HealthImportCard from './components/HealthImportCard.jsx';
import Badges from './components/Badges.jsx';
import TrendCharts from './components/TrendCharts.jsx';
import Insights from './components/Insights.jsx';
import SmartNudge from './components/SmartNudge.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import DataVault from './components/DataVault.jsx';
import Friends from './components/Friends.jsx';
import Family from './components/Family.jsx';
import Settings from './components/Settings.jsx';
import PlusModal from './components/PlusModal.jsx';
import YearReview from './components/YearReview.jsx';
import CustomCard from './components/CustomCard.jsx';
import BreathingCard from './components/BreathingCard.jsx';
import CycleCard from './components/CycleCard.jsx';
import QuickLog from './components/QuickLog.jsx';

export default function App() {
  const auth = useAuth();
  // A password-reset link takes precedence over everything else.
  if (auth.recovery) return <ResetPassword onSubmit={auth.completeRecovery} onCancel={auth.cancelRecovery} />;
  if (auth.loading) return <Splash />;
  if (!auth.user) {
    return <AuthGate cloud={hasSupabase} onSignup={auth.signup} onLogin={auth.login} onGuest={auth.guest} onReset={auth.resetPassword} />;
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
  // Friends / connections (cloud accounts only; inert otherwise).
  const social = useSocial({ user: auth.user, state: p.state });
  // Family (Plus) — heads see members' daily stats. Inert for guests.
  const family = useFamily({ user: auth.user });
  const [tab, setTab] = useState('today');
  const [moreOpen, setMoreOpen] = useState(false);
  // Bumped to open the quick-log sheet (from the FAB's own click, or a shortcut).
  const [quickSignal, setQuickSignal] = useState(0);
  const [toasts, setToasts] = useState([]);
  const tid = useRef(0);

  // Motion. Honour the OS "reduce motion" setting — fall back to plain fades.
  const reduce = useReducedMotion();
  const isWide = typeof window !== 'undefined' && window.matchMedia('(min-width: 760px)').matches;
  // Tab-pane enter: the keyed motion.div remounts on every tab change, so this
  // runs each switch. Enter-only (no exit/AnimatePresence) keeps nav snappy and
  // immune to the rapid-tap stalls that mode="wait" can cause on a bottom nav.
  const paneMotion = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  };

  // Secondary destinations tucked behind the "More" overflow so the primary
  // nav stays at 5 items (Material/HIG bottom-nav guidance). Selecting any of
  // these, or a primary tab, always closes the overflow.
  const MORE_TABS = ['family', 'friends', 'data', 'settings'];
  // A dot on the "More" tab when something inside needs attention.
  const moreAlerts = social.incoming.length + (family.invites?.length || 0);
  const go = useCallback((t) => { setTab(t); setMoreOpen(false); }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const notify = useCallback((msg, emoji = '✨') => {
    const id = ++tid.current;
    setToasts((t) => [...t, { id, msg, emoji }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1900);
  }, []);

  // Smoothly scroll to a tracker card (from a tapped nudge) and flash it.
  const jumpToPillar = useCallback((id) => {
    const el = document.getElementById(`pillar-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const card = el.querySelector('.card') || el;
    card.classList.remove('flash-card');
    void card.offsetWidth; // restart the animation if it's already mid-flash
    card.classList.add('flash-card');
    setTimeout(() => card.classList.remove('flash-card'), 1400);
  }, []);

  // Quick-log "Log a meal / sleep" → land on Today, on the real today, and
  // scroll to that card (the cards mount on the Today tab, hence the short wait).
  const quickJump = useCallback((id) => {
    setTab('today'); setMoreOpen(false);
    p.setActiveDay(todayKey());
    setTimeout(() => jumpToPillar(id), 80);
  }, [p, jumpToPillar]);

  // App-icon shortcuts (Android/desktop long-press, iOS quick actions) open the
  // app at `?log=water|steps|mood|meal|sleep`. water/steps/mood pop the quick-log
  // sheet; meal/sleep jump to their full cards. Runs once, then strips the param
  // so a refresh doesn't re-fire it.
  useEffect(() => {
    const log = new URLSearchParams(window.location.search).get('log');
    if (!log) return;
    if (log === 'meal' || log === 'sleep') quickJump(log);
    else setQuickSignal((n) => n + 1);
    const url = new URL(window.location.href);
    url.searchParams.delete('log');
    window.history.replaceState({}, '', url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for newly-earned badges app-wide so the celebration fires no matter
  // which tab you're on when you cross the line. The ref is seeded on first
  // render, so we never confetti the whole case on load — only fresh unlocks.
  const earnedBadgeIds = useMemo(
    () => resolveBadges(p.state).badges.filter((b) => b.earned).map((b) => b.id),
    [p.state]
  );
  const seenBadges = useRef(null);
  useEffect(() => {
    if (seenBadges.current === null) { seenBadges.current = new Set(earnedBadgeIds); return; }
    const fresh = earnedBadgeIds.filter((id) => !seenBadges.current.has(id));
    if (fresh.length) {
      celebrate(null, 40);
      const b = BADGES.find((x) => x.id === fresh[fresh.length - 1]);
      if (b) notify(`Badge unlocked — ${b.title}`, b.emoji);
      fresh.forEach((id) => seenBadges.current.add(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earnedBadgeIds.join(',')]);

  const { settings } = p.state;
  const name = settings.name ? `, ${settings.name}` : '';
  // What theme is actually showing (resolve 'system' against the OS) — so the
  // topbar toggle icon offers the opposite of what's on screen.
  const systemDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveTheme = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  // Pulse Plus. With real billing configured (Razorpay + cloud account) the
  // server's entitlement is the source of truth; otherwise we fall back to the
  // local demo flag so the app still demonstrates the full experience.
  const entitlement = useEntitlement({ user: auth.user });
  const plus = entitlement.enabled ? entitlement.plus : isPlus(settings);
  const [plusOpen, setPlusOpen] = useState(false);
  const openPlus = useCallback(() => setPlusOpen(true), []);

  // The upgrade action: real Razorpay checkout when live, else the demo flip.
  const startPlus = useCallback(async (cycle) => {
    if (entitlement.enabled) {
      await startSubscription(cycle, { email: auth.user.email, name: settings.name || auth.user.name });
      setPlusOpen(false);
      notify('Payment received — unlocking Plus…', '✨');
      entitlement.pollUntilActive();
    } else {
      p.setSettings({ plan: 'plus', plusSince: Date.now() });
      setPlusOpen(false);
      notify('Welcome to Pulse Plus', '✨');
    }
  }, [entitlement, auth.user, settings.name, p.setSettings, notify]);

  // Cancel a live subscription (at cycle end) or drop the demo flag.
  const managePlan = useCallback(async () => {
    if (entitlement.enabled) {
      await cancelSubscription();
      await entitlement.refresh();
      notify('Subscription will end at your billing date', '🌿');
    } else {
      p.setSettings({ plan: 'free' });
      notify('Switched back to Free', '🌿');
    }
  }, [entitlement, p.setSettings, notify]);

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
    sleep: <SleepCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} onSet={p.setSleep} onSetQuality={p.setSleepQuality} onSetTimes={p.setSleepTimes} notify={notify} />,
    mood: <MoodCard day={p.day} dayKey={p.activeDay} onSet={p.setMood} notify={notify} />,
  };
  const visiblePillars = resolveOrder(settings.pillarOrder).filter((id) => !(settings.hiddenPillars || []).includes(id));

  // First-run guide: only for a brand-new account (nothing logged yet) that
  // hasn't finished or skipped it. Existing users (any real history) never see it.
  const showWelcome = !settings.welcomed && Object.keys(p.state.days).length <= 1;

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
            <button className={`tab ${tab==='today'?'active':''}`} onClick={() => go('today')}><IconHome size={17} /> Today</button>
            <button className={`tab ${tab==='trends'?'active':''}`} onClick={() => go('trends')}><IconTrends size={17} /> Trends</button>
            <button className={`tab ${tab==='insights'?'active':''}`} onClick={() => go('insights')}><IconInsight size={17} /> Insights</button>
            <button className={`tab ${tab==='badges'?'active':''}`} onClick={() => go('badges')}><IconTrophy size={17} /> Badges</button>
            <button className={`tab ${MORE_TABS.includes(tab)?'active':''}`} onClick={() => setMoreOpen((o) => !o)} aria-haspopup="menu" aria-expanded={moreOpen}>
              <span className="tab-badge-wrap"><IconDots size={17} />{moreAlerts > 0 && <span className="tab-badge dot" />}</span> More
            </button>
          </nav>
          <button className="icon-btn" onClick={p.toggleTheme} aria-label="Toggle theme">
            {effectiveTheme === 'dark' ? <IconSun size={19} /> : <IconMoon size={19} />}
          </button>
        </div>
      </header>

        <motion.div className="tab-pane" key={tab} {...paneMotion}>
      {tab === 'today' && (
        <>
          <InstallPrompt notify={notify} />

          <DaySwitcher activeDay={p.activeDay} setActiveDay={p.setActiveDay} />

          {isToday(p.activeDay) && (
            showWelcome
              ? <WelcomeChecklist day={p.day} name={settings.name} onJump={jumpToPillar} onDismiss={() => p.setSettings({ welcomed: true })} />
              : <SmartNudge state={p.state} units={settings.units} onJump={jumpToPillar} />
          )}

          <div className="grid dash stagger" style={{ marginTop: 'var(--s-5)' }}>
            <WellnessRing day={p.day} dayKey={p.activeDay} goals={p.state.goals} notify={notify} />
            <StreakCard state={p.state} />
            <div className="pillar-anchor" id="pillar-steps">
              <StepsCard day={p.day} dayKey={p.activeDay} goals={p.state.goals} onAdd={p.addSteps} onSet={p.setSteps} notify={notify} />
            </div>
          </div>

          {isToday(p.activeDay) && (
            <div className="grid" style={{ marginTop: 'var(--s-5)' }}>
              <HealthImportCard
                onImport={p.importHealth}
                lastSync={settings.lastHealthSync}
                skipGuide={settings.skipHealthGuide}
                onSkipGuide={(v) => p.setSettings({ skipHealthGuide: v })}
                notify={notify}
              />
            </div>
          )}

          <div className="section-head"><h2>Log your day</h2></div>
          {(visiblePillars.length > 0 || (plus && (p.state.trackers || []).length > 0)) ? (
            <div className="grid trackers stagger">
              {visiblePillars.map((id) => (
                <div className="pillar-anchor" id={`pillar-${id}`} key={id}>{pillarCards[id]}</div>
              ))}
              {plus && (p.state.trackers || []).map((t) => (
                <CustomCard key={t.id} tracker={t} day={p.day} dayKey={p.activeDay} onAdd={p.addCustom} notify={notify} />
              ))}
            </div>
          ) : (
            <p className="faint" style={{ textAlign: 'center', padding: 'var(--s-6)' }}>
              All trackers are hidden. Re-enable them in <b>Settings → Dashboard layout</b>.
            </p>
          )}

          {isToday(p.activeDay) && (
            <>
              <div className="section-head"><h2>Weight</h2><span className="faint">log your weigh-in · watch the trend</span></div>
              <div className="grid">
                <WeightCard weights={p.state.weights} settings={settings} onLog={p.logWeight} notify={notify} />
              </div>
            </>
          )}

          {plus && settings.cycleEnabled && (
            <>
              <div className="section-head"><h2>Cycle</h2><span className="faint">predictions from your own logs</span></div>
              <div className="grid">
                <CycleCard
                  cycle={p.state.cycle} days={p.state.days} dayKey={p.activeDay}
                  togglePeriodStart={p.togglePeriodStart} setCycleFlow={p.setCycleFlow}
                  toggleCycleSymptom={p.toggleCycleSymptom} setCycleConfig={p.setCycleConfig} notify={notify}
                />
              </div>
            </>
          )}

          <div className="section-head"><h2>Take a breath</h2><span className="faint">a one-minute reset</span></div>
          <div className="grid pillar-anchor" id="pillar-breath">
            <BreathingCard day={p.day} onComplete={p.logCalm} notify={notify} />
          </div>
        </>
      )}

      {tab === 'trends' && (
        <>
          <div className="section-head"><h2>Your trends</h2><span className="faint">last days at a glance</span></div>
          <TrendCharts state={p.state} units={settings.units} plus={plus} openPlus={openPlus} />
          <div style={{ marginTop: 'var(--s-5)' }}>
            <YearReview state={p.state} plus={plus} openPlus={openPlus} />
          </div>
        </>
      )}

      {tab === 'insights' && (
        <>
          <div className="section-head"><h2>Insights</h2><span className="faint">patterns from your own days</span></div>
          <Insights state={p.state} units={settings.units} />
        </>
      )}

      {tab === 'badges' && (
        <>
          <div className="section-head"><h2>Achievements</h2><span className="faint">badges you earn by showing up</span></div>
          <Badges state={p.state} user={auth.user} />
        </>
      )}

      {tab === 'family' && (
        <>
          <div className="section-head"><h2>Family</h2><span className="faint">your household, at a glance</span></div>
          <Family family={family} user={auth.user} notify={notify} onLogout={auth.logout} plus={plus} openPlus={openPlus} />
        </>
      )}

      {tab === 'friends' && (
        <>
          <div className="section-head"><h2>Friends</h2><span className="faint">share check-ins · cheer each other on</span></div>
          <Friends social={social} user={auth.user} notify={notify} onLogout={auth.logout} plus={plus} openPlus={openPlus} />
        </>
      )}

      {tab === 'data' && (
        <>
          <div className="section-head"><h2>Your data</h2><span className="faint">private · portable · yours</span></div>
          <DataVault state={p.state} replaceAll={p.replaceAll} markBackup={p.markBackup} setFoods={p.setFoods} notify={notify} plus={plus} openPlus={openPlus} />
        </>
      )}

      {tab === 'settings' && (
        <>
          <div className="section-head"><h2>Settings</h2></div>
          <Settings
            state={p.state}
            setGoals={p.setGoals} setSettings={p.setSettings}
            toggleTheme={p.toggleTheme} toggleUnits={p.toggleUnits}
            resetAll={p.resetAll} notify={notify}
            user={auth.user} onLogout={auth.logout}
            openPlus={openPlus} addTracker={p.addTracker} removeTracker={p.removeTracker}
            plus={plus} billing={entitlement} managePlan={managePlan}
          />
        </>
      )}
        </motion.div>

      {/* mobile bottom nav — 5 top-level items; secondary screens live in More */}
      <nav className="tabbar">
        <button className={`tab ${tab==='today'?'active':''}`} onClick={() => go('today')}>
          <span className="tab-icon"><IconHome size={22} /></span> Today
        </button>
        <button className={`tab ${tab==='trends'?'active':''}`} onClick={() => go('trends')}>
          <span className="tab-icon"><IconTrends size={22} /></span> Trends
        </button>
        <button className={`tab ${tab==='insights'?'active':''}`} onClick={() => go('insights')}>
          <span className="tab-icon"><IconInsight size={22} /></span> Insights
        </button>
        <button className={`tab ${tab==='badges'?'active':''}`} onClick={() => go('badges')}>
          <span className="tab-icon"><IconTrophy size={22} /></span> Badges
        </button>
        <button className={`tab ${MORE_TABS.includes(tab) || moreOpen ? 'active':''}`} onClick={() => setMoreOpen((o) => !o)} aria-haspopup="menu" aria-expanded={moreOpen}>
          <span className="tab-icon"><IconDots size={22} />{moreAlerts > 0 && <span className="tab-badge dot" />}</span> More
        </button>
      </nav>

      {/* "More" overflow — bottom sheet on mobile, dropdown on desktop */}
      <AnimatePresence>
        {moreOpen && (
        <>
          <motion.div
            className="more-scrim" onClick={() => setMoreOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          />
          <motion.div
            className="more-menu" role="menu" aria-label="More"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: isWide ? -8 : 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: isWide ? -8 : 14, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
          >
            <button role="menuitem" className={`more-item ${tab==='family'?'active':''}`} onClick={() => go('family')}>
              <span className="more-ic"><IconFamily size={20} /></span>
              <span className="more-lbl">Family</span>
              {(family.invites?.length || 0) > 0 && <span className="more-count">{family.invites.length}</span>}
            </button>
            <button role="menuitem" className={`more-item ${tab==='friends'?'active':''}`} onClick={() => go('friends')}>
              <span className="more-ic"><IconUsers size={20} /></span>
              <span className="more-lbl">Friends</span>
              {social.incoming.length > 0 && <span className="more-count">{social.incoming.length}</span>}
            </button>
            <button role="menuitem" className={`more-item ${tab==='data'?'active':''}`} onClick={() => go('data')}>
              <span className="more-ic"><IconShield size={20} /></span>
              <span className="more-lbl">Your data</span>
            </button>
            <button role="menuitem" className={`more-item ${tab==='settings'?'active':''}`} onClick={() => go('settings')}>
              <span className="more-ic"><IconGear size={20} /></span>
              <span className="more-lbl">Settings</span>
            </button>
          </motion.div>
        </>
        )}
      </AnimatePresence>

      <QuickLog
        today={getDay(p.state, todayKey())}
        goals={p.state.goals} units={settings.units}
        onWater={p.addTodayWater} onSteps={p.addTodaySteps} onMood={p.setTodayMood}
        onJump={quickJump} notify={notify} openSignal={quickSignal}
      />

      <PlusModal open={plusOpen} onClose={() => setPlusOpen(false)} onUpgrade={startPlus} live={entitlement.enabled} />
      <div className="toast-wrap">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              className="toast" key={t.id} layout
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 480, damping: 32 }}
            >
              <span className="t-emoji">{t.emoji}</span>{t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
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
