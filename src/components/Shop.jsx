import { useState } from 'react';
import { IconShop } from './Icons.jsx';
import {
  ACCENTS, FRAMES, NAMEPLATES, CONSUMABLES, SPARK_PACKS, FREEZE_MAX, PLUS_MULT, slotOf, boostActive,
} from '../lib/economy.js';

const fmt = (n) => Math.round(n).toLocaleString();

// The Sparks Shop. A scrim + sheet (same family as PlusModal). Everything is
// bought with ⚡ Sparks earned in-app; Plus members earn 1.5× and unlock a few
// exclusive skins. Real-money Spark packs arrive in a later wave.
export default function Shop({ open, onClose, wallet, plus, openPlus, onBuy, onEquip, onApplyFreeze, freezeTarget, freezeLabel, onBuySparks, liveMoney, notify }) {
  const [busyPack, setBusyPack] = useState(null);
  if (!open || !wallet) return null;
  const { balance, earned, owned = [], equipped = {}, freezes = 0 } = wallet;
  const boosted = boostActive(wallet);
  const boostHrs = boosted ? Math.max(1, Math.round((wallet.boostUntil - Date.now()) / 3600000)) : 0;

  const buy = (item) => {
    if (item.plus && !plus) { onClose(); openPlus(); return; }
    if (balance < item.price) { notify(`Need ${fmt(item.price - balance)} more Sparks`, '⚡'); return; }
    onBuy(item);
    const verb = slotOf(item) ? 'Unlocked & equipped' : item.kind === 'freeze' ? 'Added a Streak Freeze' : 'Double Sparks is on';
    notify(`${verb} · ${item.emoji} ${item.name}`, '✨');
  };
  const equip = (item) => { onEquip(slotOf(item), item.value); notify(`Equipped ${item.emoji} ${item.name}`, '✅'); };

  return (
    <div className="shop-modal" onClick={onClose}>
      <div className="shop-sheet pop" onClick={(e) => e.stopPropagation()}>
        <div className="shop-top">
          <div className="shop-mark"><IconShop size={22} /></div>
          <div className="shop-bal">
            <div className="shop-bal-num">⚡ {fmt(balance)}</div>
            <div className="faint shop-bal-sub">{fmt(earned)} earned all-time</div>
          </div>
          <button className="shop-x" onClick={onClose} aria-label="Close shop">✕</button>
        </div>

        <div className={`shop-acc ${plus ? 'on' : ''}`} onClick={plus ? undefined : () => { onClose(); openPlus(); }}>
          {plus
            ? <><b>Plus active</b> — you’re earning <b>{PLUS_MULT}× Sparks</b>{boosted ? ` · ⚡ Double Sparks ${boostHrs}h left` : ''}.</>
            : <><b>Get Plus</b> to earn <b>{PLUS_MULT}× Sparks</b> + unlock exclusive skins →</>}
        </div>

        {/* —— Streak Freeze (consumable, with an apply action) —— */}
        <Shelf title="Streak Freeze" sub="Protects your streak through a missed day">
          <div className="shop-freeze">
            <span className="sf-emoji">🧊</span>
            <div className="sf-text">
              <div className="sf-held"><b>{freezes}</b> / {FREEZE_MAX} held</div>
              {freezeTarget
                ? <button className="sf-apply" onClick={() => { onApplyFreeze(freezeTarget); notify(`Protected ${freezeLabel} 🧊`, '🛡️'); }} disabled={freezes < 1}>
                    Protect {freezeLabel}
                  </button>
                : <span className="faint sf-none">Your recent days are safe</span>}
            </div>
            <BuyBtn item={CONSUMABLES[0]} balance={balance} disabled={freezes >= FREEZE_MAX} onClick={() => buy(CONSUMABLES[0])} fullLabel={freezes >= FREEZE_MAX ? 'Full' : null} />
          </div>
        </Shelf>

        {/* —— Double Sparks boost —— */}
        <Shelf title="Boost" sub="Earn faster while it’s active">
          <div className="shop-row">
            <span className="sr-emoji">⚡</span>
            <div className="sr-text"><div className="sr-name">Double Sparks Day</div><div className="faint sr-desc">2× on everything for 24 hours</div></div>
            {boosted
              ? <span className="sr-state on">Active · {boostHrs}h</span>
              : <BuyBtn item={CONSUMABLES[1]} balance={balance} onClick={() => buy(CONSUMABLES[1])} />}
          </div>
        </Shelf>

        {/* —— Accent themes (cosmetic) —— */}
        <Shelf title="Accent themes" sub="Re-skin the whole app">
          <div className="shop-grid">
            {ACCENTS.map((a) => (
              <Tile key={a.id} item={a} owned={a.free || owned.includes(a.id)} equipped={equipped.accent === a.value}
                    balance={balance} plus={plus} onBuy={() => buy(a)} onEquip={() => equip(a)}
                    swatch={<span className="tile-swatch" style={{ background: a.swatch }} />} />
            ))}
          </div>
        </Shelf>

        {/* —— Badge frames (cosmetic) —— */}
        <Shelf title="Badge frames" sub="Dress up your earned medals">
          <div className="shop-grid">
            {FRAMES.map((f) => (
              <Tile key={f.id} item={f} owned={f.free || owned.includes(f.id)} equipped={equipped.frame === f.value}
                    balance={balance} plus={plus} onBuy={() => buy(f)} onEquip={() => equip(f)}
                    swatch={<span className="tile-emoji">{f.emoji}</span>} />
            ))}
          </div>
        </Shelf>

        {/* —— Nameplates (cosmetic flair) —— */}
        <Shelf title="Nameplates" sub="A flair beside your name">
          <div className="shop-grid">
            {NAMEPLATES.map((n) => (
              <Tile key={n.id} item={n} owned={n.free || owned.includes(n.id)} equipped={(equipped.nameplate || '') === n.value}
                    balance={balance} plus={plus} onBuy={() => buy(n)} onEquip={() => equip(n)}
                    swatch={<span className="tile-emoji">{n.emoji}</span>} />
            ))}
          </div>
        </Shelf>

        {/* —— Buy Sparks (real money) —— */}
        <Shelf title="Buy Sparks" sub="Top up instantly">
          <div className="shop-packs">
            {SPARK_PACKS.map((pk) => (
              <button key={pk.id} className={`pack ${pk.tag ? 'feat' : ''}`} disabled={busyPack != null}
                      onClick={async () => { setBusyPack(pk.id); try { await onBuySparks(pk.id); } finally { setBusyPack(null); } }}>
                {pk.tag && <span className="pack-tag">{pk.tag}</span>}
                <span className="pack-emoji">{pk.emoji}</span>
                <span className="pack-sparks">⚡ {fmt(pk.sparks)}</span>
                <span className="pack-price">{busyPack === pk.id ? '…' : pk.price}</span>
              </button>
            ))}
          </div>
          <p className="shop-foot faint">
            {liveMoney
              ? <>Secure payment via <b>Razorpay</b>. Sparks are added the moment payment clears.</>
              : <>Demo mode — taps add Sparks instantly and <b>nothing is charged</b>. Live payments turn on once Razorpay keys are set.</>}
          </p>
        </Shelf>
      </div>

      <style>{`
        .shop-modal { position: fixed; inset: 0; z-index: 95; display: grid; place-items: end center;
          background: color-mix(in srgb, var(--ink-900) 48%, transparent); backdrop-filter: blur(5px);
          animation: fadeDown .2s var(--ease-out); }
        .shop-sheet { background: var(--bg); border: 1px solid var(--border);
          border-radius: var(--r-xl) var(--r-xl) 0 0; padding: var(--s-5) var(--s-5) var(--s-8);
          width: 100%; max-width: 560px; max-height: 92dvh; overflow-y: auto; box-shadow: var(--shadow-lg); }
        @media (min-width: 600px) { .shop-modal { place-items: center; } .shop-sheet { border-radius: var(--r-xl); max-height: 90dvh; } }

        .shop-top { display: flex; align-items: center; gap: 12px; margin-bottom: var(--s-4);
          position: sticky; top: -20px; background: var(--bg); padding-top: 4px; z-index: 2; }
        .shop-mark { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; color: #fff;
          background: linear-gradient(140deg, var(--amber-400), var(--amber-600)); box-shadow: var(--shadow-glow); flex: none; }
        .shop-bal { flex: 1; }
        .shop-bal-num { font-family: var(--font-display); font-weight: 600; font-size: 1.5rem; font-variant-numeric: tabular-nums; line-height: 1; }
        .shop-bal-sub { font-size: var(--t-xs); margin-top: 3px; }
        .shop-x { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface);
          color: var(--text-soft); font-size: 14px; cursor: pointer; flex: none; }

        .shop-acc { font-size: var(--t-xs); line-height: 1.5; padding: 10px 13px; border-radius: var(--r-md);
          background: color-mix(in srgb, var(--amber-400) 12%, var(--surface)); border: 1px solid color-mix(in srgb, var(--amber-400) 30%, var(--border));
          margin-bottom: var(--s-5); cursor: pointer; }
        .shop-acc.on { cursor: default; }

        .shop-shelf { margin-bottom: var(--s-5); }
        .shelf-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
        .shelf-title { font-family: var(--font-display); font-weight: 600; font-size: var(--t-md); }
        .shelf-sub { font-size: var(--t-xs); }

        .shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
        .shop-tile { border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface);
          padding: 12px 8px 10px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 7px;
          transition: border-color var(--dur-fast), transform var(--dur-fast) var(--ease-out); }
        .shop-tile.equipped { border-color: var(--amber-500); background: color-mix(in srgb, var(--amber-400) 10%, var(--surface)); }
        .tile-swatch { width: 30px; height: 30px; border-radius: 50%; box-shadow: var(--shadow-sm); }
        .tile-emoji { font-size: 26px; line-height: 30px; }
        .tile-name { font-size: var(--t-xs); font-weight: 700; }
        .tile-btn { width: 100%; border-radius: var(--r-pill); border: 1px solid var(--border); background: var(--surface-soft);
          color: var(--text); font-weight: 700; font-size: var(--t-xs); padding: 5px 6px; cursor: pointer; }
        .tile-btn.buy { background: var(--amber-500); border-color: var(--amber-500); color: #fff; }
        .tile-btn.buy:disabled { background: var(--surface-soft); border-color: var(--border); color: var(--text-faint); cursor: not-allowed; }
        .tile-btn.equip { background: var(--surface); }
        .tile-btn.plus { background: linear-gradient(135deg, var(--amber-400), var(--clay)); border: none; color: #fff; }
        .tile-state { font-size: var(--t-xs); font-weight: 800; color: var(--amber-600); padding: 5px 0; }

        .shop-row, .shop-freeze { display: flex; align-items: center; gap: 12px; border: 1px solid var(--border);
          border-radius: var(--r-md); background: var(--surface); padding: 12px 14px; }
        .sr-emoji, .sf-emoji { font-size: 26px; flex: none; }
        .sr-text, .sf-text { flex: 1; }
        .sr-name { font-weight: 700; font-size: var(--t-sm); }
        .sr-desc { font-size: var(--t-xs); }
        .sr-state.on { font-weight: 800; color: var(--good); font-size: var(--t-sm); }
        .sf-held { font-weight: 700; font-size: var(--t-sm); }
        .sf-apply { margin-top: 4px; border: 1px solid var(--amber-500); background: color-mix(in srgb, var(--amber-400) 14%, var(--surface));
          color: var(--amber-700); font-weight: 700; font-size: var(--t-xs); padding: 4px 10px; border-radius: var(--r-pill); cursor: pointer; }
        .sf-apply:disabled { opacity: .5; cursor: not-allowed; }
        .sf-none { font-size: var(--t-xs); }

        .buy-btn { flex: none; border-radius: var(--r-pill); border: 1px solid var(--amber-500); background: var(--amber-500);
          color: #fff; font-weight: 800; font-size: var(--t-sm); padding: 8px 14px; cursor: pointer; white-space: nowrap; }
        .buy-btn:disabled { background: var(--surface-soft); border-color: var(--border); color: var(--text-faint); cursor: not-allowed; }

        .shop-packs { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
        .pack { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px;
          border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); padding: 14px 8px 10px;
          cursor: pointer; transition: border-color var(--dur-fast), transform var(--dur-fast) var(--ease-out); }
        .pack:hover:not(:disabled) { border-color: var(--amber-400); transform: translateY(-2px); }
        .pack:disabled { opacity: .6; cursor: progress; }
        .pack.feat { border-color: var(--amber-500); box-shadow: var(--shadow-glow); }
        .pack-tag { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); white-space: nowrap;
          font-size: 0.58rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: #fff;
          padding: 2px 8px; border-radius: var(--r-pill); background: linear-gradient(135deg, var(--amber-400), var(--clay)); }
        .pack-emoji { font-size: 24px; }
        .pack-sparks { font-weight: 800; font-size: var(--t-sm); font-variant-numeric: tabular-nums; }
        .pack-price { font-family: var(--font-display); font-weight: 600; font-size: var(--t-md); color: var(--amber-700); }

        .shop-foot { font-size: var(--t-xs); line-height: 1.5; margin-top: 10px; text-align: center; }
      `}</style>
    </div>
  );
}

function Shelf({ title, sub, children }) {
  return (
    <section className="shop-shelf">
      <div className="shelf-head"><span className="shelf-title">{title}</span><span className="faint shelf-sub">{sub}</span></div>
      {children}
    </section>
  );
}

function BuyBtn({ item, balance, onClick, disabled, fullLabel }) {
  const poor = balance < item.price;
  return (
    <button className="buy-btn" onClick={onClick} disabled={disabled || poor}>
      {fullLabel || `⚡ ${fmt(item.price)}`}
    </button>
  );
}

// A cosmetic tile: shows Owned/Equipped/Equip/Buy/Plus depending on state.
function Tile({ item, owned, equipped, balance, plus, onBuy, onEquip, swatch }) {
  const poor = balance < item.price;
  let btn;
  if (equipped) btn = <div className="tile-state">Equipped</div>;
  else if (owned) btn = <button className="tile-btn equip" onClick={onEquip}>Equip</button>;
  else if (item.plus && !plus) btn = <button className="tile-btn plus" onClick={onBuy}>Plus</button>;
  else btn = <button className="tile-btn buy" onClick={onBuy} disabled={poor}>⚡ {fmt(item.price)}</button>;
  return (
    <div className={`shop-tile ${equipped ? 'equipped' : ''}`}>
      {swatch}
      <div className="tile-name">{item.name}</div>
      {btn}
    </div>
  );
}
