// Unit conversion helpers. Internal storage is always metric (ml, kg, km).

// A gentle over-hydration guardrail. Most people need ~2–3 L of water a day;
// drinking a great deal more — especially quickly — can dilute the blood's
// sodium (hyponatremia / "water intoxication"). Past this daily total Pulse
// surfaces a friendly heads-up. Not medical advice, just a nudge to ease off.
export const SAFE_WATER_MAX_ML = 4000;

export function mlToDisplay(ml, units) {
  if (units === 'imperial') return { value: Math.round(ml / 29.5735), unit: 'oz' };
  return { value: ml, unit: 'ml' };
}

export function waterGoalLabel(ml, units) {
  if (units === 'imperial') return `${Math.round(ml / 29.5735)} oz`;
  return ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)} L` : `${ml} ml`;
}

export function waterCurrentLabel(ml, units) {
  if (units === 'imperial') return `${Math.round(ml / 29.5735)} oz`;
  return ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${ml} ml`;
}

// ---- weight (stored in kg) ------------------------------------------------
const LB_PER_KG = 2.20462;

export function kgToLb(kg) { return kg * LB_PER_KG; }
export function lbToKg(lb) { return lb / LB_PER_KG; }

// A kg value shown in the user's units, e.g. "70 kg" or "154 lb".
export function weightLabel(kg, units) {
  if (kg == null || Number.isNaN(Number(kg))) return '—';
  const v = units === 'imperial' ? kg * LB_PER_KG : kg;
  const r = Math.round(v * 10) / 10;                 // one decimal of precision
  const s = Number.isInteger(r) ? String(r) : r.toFixed(1); // drop a trailing .0
  return `${s} ${units === 'imperial' ? 'lb' : 'kg'}`;
}

// ---- height (stored in cm) ------------------------------------------------
const CM_PER_IN = 2.54;

export function cmToInches(cm) { return cm / CM_PER_IN; }
export function inchesToCm(inches) { return inches * CM_PER_IN; }

// A cm value shown in the user's units, e.g. "175 cm" or "5'9\"".
export function heightLabel(cm, units) {
  if (cm == null || Number.isNaN(Number(cm))) return '—';
  if (units === 'imperial') {
    const totalIn = Math.round(cm / CM_PER_IN);
    return `${Math.floor(totalIn / 12)}'${totalIn % 12}"`;
  }
  return `${Math.round(cm)} cm`;
}

// A "glass" of water — most people track in glasses, not millilitres.
// ~250 ml metric / 8 oz imperial is the everyday standard.
export function glassMl(units) {
  return units === 'imperial' ? 237 : 250;
}

// How many glasses a volume (ml) works out to, e.g. 3 or 2.5.
export function glassesCount(ml, units) {
  const g = ml / glassMl(units);
  return Math.round(g * 10) / 10; // one decimal
}

// "3 glasses" / "1 glass" / "2.5 glasses"
export function glassesLabel(ml, units) {
  const n = glassesCount(ml, units);
  const pretty = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${pretty} ${n === 1 ? 'glass' : 'glasses'}`;
}

// Quick-add increments in ml, labelled per unit system.
export function waterIncrements(units) {
  if (units === 'imperial') {
    return [
      { ml: 237, label: '8 oz' },
      { ml: 355, label: '12 oz' },
      { ml: 591, label: '20 oz' },
    ];
  }
  return [
    { ml: 250, label: '250 ml' },
    { ml: 500, label: '500 ml' },
    { ml: 750, label: '750 ml' },
  ];
}
