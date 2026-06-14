// Health data importer.
//
// Apple Health and Google Fit do NOT expose a live web API — a browser app can't
// read them directly. The realistic path is a file the user exports once:
//   • Apple Health  → iPhone Health app → "Export All Health Data" → export.zip
//                     (contains apple_health_export/export.xml)
//   • Google Fit    → takeout.google.com → "Fitness" → a zip of CSVs
//
// This module takes whichever file the user picked (zip, xml, csv or json),
// auto-detects the source, and normalises it into Pulse's own shape:
//
//   {
//     source: 'apple' | 'google',
//     days:    { 'YYYY-MM-DD': { steps, sleepHours, workouts: [{type,minutes,intensity,key}] } },
//     weights: { 'YYYY-MM-DD': kg },
//     summary: { days, steps, workouts, weights, sleepNights, from, to },
//   }
//
// Everything is best-effort and never throws on a missing field — health exports
// are messy and we just take what's there. The merge into app state lives in
// usePulse (importHealth), which is non-destructive.

const LB_TO_KG = 0.45359237;

// ----- small helpers --------------------------------------------------------

// Local day key from an Apple-style date string like "2026-06-13 08:55:00 -0700".
// The leading 10 chars are already the local calendar date, which matches how
// Pulse keys its days (device-local), so we just take them.
function dayKeyFromAppleDate(s) {
  return typeof s === 'string' && s.length >= 10 ? s.slice(0, 10) : null;
}

// Parse the attributes of a single XML tag into a plain object.
function attrs(tag) {
  const out = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(tag))) out[m[1]] = m[2];
  return out;
}

function msBetween(start, end) {
  const a = Date.parse(start);
  const b = Date.parse(end);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, b - a) : 0;
}

// Map an Apple HKWorkoutActivityType to one of Pulse's workout chips.
const APPLE_WORKOUT_MAP = {
  Running: 'Run', Walking: 'Walk', Hiking: 'Walk',
  TraditionalStrengthTraining: 'Strength', FunctionalStrengthTraining: 'Strength',
  CoreTraining: 'Strength', Cooldown: 'Yoga',
  Yoga: 'Yoga', Flexibility: 'Yoga', MindAndBody: 'Yoga', Pilates: 'Yoga',
  Cycling: 'Cycle', HandCycling: 'Cycle',
  Swimming: 'Swim',
  HighIntensityIntervalTraining: 'HIIT', JumpRope: 'HIIT', Crossfit: 'HIIT',
};
function appleWorkoutType(raw) {
  const name = String(raw || '').replace('HKWorkoutActivityType', '');
  return APPLE_WORKOUT_MAP[name] || 'Sport';
}

function emptyResult(source) {
  return { source, days: {}, weights: {}, summary: null };
}

function ensureDay(days, key) {
  if (!days[key]) days[key] = { steps: 0, sleepHours: 0, workouts: [] };
  return days[key];
}

function summarise(result) {
  const dayKeys = Object.keys(result.days);
  const weightKeys = Object.keys(result.weights);
  const all = [...dayKeys, ...weightKeys].sort();
  let steps = 0;
  let workouts = 0;
  let sleepNights = 0;
  for (const k of dayKeys) {
    const d = result.days[k];
    steps += d.steps;
    workouts += d.workouts.length;
    if (d.sleepHours > 0) sleepNights += 1;
  }
  result.summary = {
    days: dayKeys.length,
    steps,
    workouts,
    weights: weightKeys.length,
    sleepNights,
    from: all[0] || null,
    to: all[all.length - 1] || null,
  };
  return result;
}

// ----- Apple Health (export.xml) -------------------------------------------

export function parseAppleHealthXml(xml) {
  const result = emptyResult('apple');
  const { days, weights } = result;

  // Records: steps, weight, sleep. We scan tag-by-tag with a regex rather than
  // building a DOM, because these files can be very large.
  const recRe = /<Record\b[^>]*?\/?>/g;
  let m;
  // Sleep is summed in ms per wake-up date, then converted to hours at the end.
  const sleepMs = {};
  while ((m = recRe.exec(xml))) {
    const a = attrs(m[0]);
    const type = a.type || '';

    if (type === 'HKQuantityTypeIdentifierStepCount') {
      const key = dayKeyFromAppleDate(a.startDate);
      const v = Number(a.value);
      if (key && Number.isFinite(v)) ensureDay(days, key).steps += v;
    } else if (type === 'HKQuantityTypeIdentifierBodyMass') {
      const key = dayKeyFromAppleDate(a.startDate);
      let v = Number(a.value);
      if (key && Number.isFinite(v)) {
        if ((a.unit || '').toLowerCase().includes('lb')) v *= LB_TO_KG;
        weights[key] = Math.round(v * 10) / 10; // latest wins
      }
    } else if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
      // Count only genuinely-asleep segments (not "InBed"/"Awake"). Attribute it
      // to the day you woke up (endDate), which is how people think of "sleep".
      const val = a.value || '';
      if (val.includes('Asleep')) {
        const key = dayKeyFromAppleDate(a.endDate);
        if (key) sleepMs[key] = (sleepMs[key] || 0) + msBetween(a.startDate, a.endDate);
      }
    }
  }

  for (const [key, ms] of Object.entries(sleepMs)) {
    const hours = Math.round((ms / 3600000) * 10) / 10;
    if (hours > 0 && hours <= 24) ensureDay(days, key).sleepHours = hours;
  }

  // Workouts are their own tag.
  const woRe = /<Workout\b[^>]*?>/g;
  while ((m = woRe.exec(xml))) {
    const a = attrs(m[0]);
    const key = dayKeyFromAppleDate(a.startDate);
    if (!key) continue;
    let minutes = Number(a.duration);
    if (!Number.isFinite(minutes) || minutes <= 0) continue;
    if ((a.durationUnit || 'min').toLowerCase().startsWith('s')) minutes /= 60;
    minutes = Math.round(minutes);
    if (minutes <= 0) continue;
    ensureDay(days, key).workouts.push({
      type: appleWorkoutType(a.workoutActivityType),
      minutes,
      intensity: 2,
      key: `hk_${Date.parse(a.startDate) || a.startDate}_${minutes}`,
    });
  }

  return summarise(result);
}

// ----- Google Fit (Takeout CSV) --------------------------------------------

// Minimal CSV row splitter (handles simple quoted fields).
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function findCol(header, ...needles) {
  return header.findIndex((h) => {
    const low = h.toLowerCase();
    return needles.some((n) => low.includes(n));
  });
}

// Parse one Google Takeout CSV into the result. Google's daily files repeat a
// date and break the day into time segments; the full-day total is the largest
// "Step count" we see for that date, so we take the max per date (avoids the
// double-counting you'd get from summing segments).
function parseGoogleCsv(text, result) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return;
  const header = splitCsvLine(lines[0]);
  const dateCol = findCol(header, 'date');
  const stepCol = findCol(header, 'step count', 'steps');
  const weightCol = findCol(header, 'weight');
  // Many Fit daily files carry the date only in the filename, not a column.
  // Those we skip here and rely on per-file handling in unzip (below).
  if (dateCol < 0) return;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const key = (cols[dateCol] || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    if (stepCol >= 0) {
      const v = Number(cols[stepCol]);
      if (Number.isFinite(v) && v > 0) {
        const d = ensureDay(result.days, key);
        d.steps = Math.max(d.steps, Math.round(v));
      }
    }
    if (weightCol >= 0) {
      const v = Number(cols[weightCol]);
      if (Number.isFinite(v) && v > 0) result.weights[key] = Math.round(v * 10) / 10;
    }
  }
}

// A daily file whose name carries the date (e.g. "2026-06-13.csv") and whose
// rows sum to the day's steps.
function parseGoogleDailyFile(name, text, result) {
  const m = name.match(/(\d{4}-\d{2}-\d{2})/);
  if (!m) return false;
  const key = m[1];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return false;
  const header = splitCsvLine(lines[0]);
  if (findCol(header, 'date') >= 0) return false; // has its own date column → handled elsewhere
  const stepCol = findCol(header, 'step count', 'steps');
  if (stepCol < 0) return false;
  let total = 0;
  for (let i = 1; i < lines.length; i++) {
    const v = Number(splitCsvLine(lines[i])[stepCol]);
    if (Number.isFinite(v) && v > 0) total += v;
  }
  if (total > 0) {
    const d = ensureDay(result.days, key);
    d.steps = Math.max(d.steps, Math.round(total));
  }
  return true;
}

function parseGoogleJson(text, result) {
  let data;
  try { data = JSON.parse(text); } catch { return; }
  // Best-effort: walk arrays of objects that look like { date|day, steps }.
  const visit = (node) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    const dateRaw = node.date || node.day || node.startTime || node.startDate;
    const steps = node.steps ?? node.stepCount ?? node.step_count;
    if (dateRaw && Number.isFinite(Number(steps))) {
      const key = String(dateRaw).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        const d = ensureDay(result.days, key);
        d.steps = Math.max(d.steps, Math.round(Number(steps)));
      }
    }
    Object.values(node).forEach(visit);
  };
  visit(data);
}

// ----- file dispatch --------------------------------------------------------

function looksLikeApple(text) {
  return text.includes('HKQuantityTypeIdentifier') || text.includes('HealthData');
}

// Parse a single in-memory file (already decoded to text) given its name.
function parseTextFile(name, text, forcedSource) {
  const lower = name.toLowerCase();
  if (forcedSource === 'apple' || (forcedSource == null && (lower.endsWith('.xml') || looksLikeApple(text)))) {
    return { kind: 'apple', xml: text };
  }
  if (lower.endsWith('.json')) return { kind: 'google-json', text };
  return { kind: 'google-csv', name, text };
}

// Decompress a zip and fold every relevant entry into one result. fflate is
// imported on demand so its code only loads when someone actually syncs a file.
async function parseZip(bytes) {
  const { unzipSync, strFromU8 } = await import('fflate');
  const files = unzipSync(bytes);
  const names = Object.keys(files);

  // Apple export: a single big export.xml inside apple_health_export/.
  const appleEntry = names.find((n) => /export\.xml$/i.test(n) && !/cda/i.test(n))
    || names.find((n) => /\.xml$/i.test(n));
  if (appleEntry) {
    const xml = strFromU8(files[appleEntry]);
    if (looksLikeApple(xml)) return parseAppleHealthXml(xml);
  }

  // Otherwise treat it as a Google Takeout zip of CSV/JSON files.
  const result = emptyResult('google');
  for (const n of names) {
    if (/\.csv$/i.test(n)) {
      const text = strFromU8(files[n]);
      if (!parseGoogleDailyFile(n, text, result)) parseGoogleCsv(text, result);
    } else if (/\.json$/i.test(n)) {
      parseGoogleJson(strFromU8(files[n]), result);
    }
  }
  return summarise(result);
}

// ----- public entry ---------------------------------------------------------

// Read a File (from an <input type="file">) and return the normalised result.
// Throws a friendly Error if nothing usable was found.
export async function parseHealthFile(file) {
  const name = (file.name || '').toLowerCase();
  let result;

  if (name.endsWith('.zip')) {
    const buf = new Uint8Array(await file.arrayBuffer());
    result = await parseZip(buf);
  } else {
    const text = await file.text();
    const dispatched = parseTextFile(file.name || '', text, null);
    if (dispatched.kind === 'apple') {
      result = parseAppleHealthXml(dispatched.xml);
    } else if (dispatched.kind === 'google-json') {
      result = emptyResult('google');
      parseGoogleJson(dispatched.text, result);
      summarise(result);
    } else {
      result = emptyResult('google');
      if (!parseGoogleDailyFile(dispatched.name, dispatched.text, result)) {
        parseGoogleCsv(dispatched.text, result);
      }
      summarise(result);
    }
  }

  const s = result.summary;
  const found = s && (s.days > 0 || s.weights > 0);
  if (!found) {
    throw new Error(
      "Couldn't find any health data in that file. Make sure you picked the export "
      + 'from Apple Health ("Export All Health Data") or your Google Takeout Fit file.',
    );
  }
  return result;
}
