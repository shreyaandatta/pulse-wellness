// Unit conversion helpers. Internal storage is always metric (ml, kg, km).

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
  return units === 'imperial' ? `${Math.round(kg * LB_PER_KG)} lb` : `${Math.round(kg)} kg`;
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
