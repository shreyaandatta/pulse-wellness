// A small, friendly food database. Each food carries rough nutrition per its
// serving plus a 1–5 "nourishing" quality used by the wellness score. Users can
// add their own foods (stored in state.foods) and download/restore the whole
// library as a file.
import { triggerDownload } from './download.js';
import { todayKey } from './dates.js';

// Built-in starter foods. Values are approximate, everyday-portion estimates —
// enough to be useful without pretending to be a clinical database.
export const STARTER_FOODS = [
  // Breakfast & grains
  { id: 'f_oatmeal',    name: 'Oatmeal',          emoji: '🥣', serving: '1 bowl',    calories: 150, protein: 5,  carbs: 27, fat: 3,  quality: 5 },
  { id: 'f_eggs',       name: 'Eggs',             emoji: '🥚', serving: '2 eggs',    calories: 140, protein: 12, carbs: 1,  fat: 10, quality: 4 },
  { id: 'f_toast',      name: 'Whole-grain toast',emoji: '🍞', serving: '2 slices',  calories: 160, protein: 6,  carbs: 28, fat: 2,  quality: 4 },
  { id: 'f_pancakes',   name: 'Pancakes',         emoji: '🥞', serving: '3 small',   calories: 350, protein: 8,  carbs: 50, fat: 12, quality: 2 },
  { id: 'f_cereal',     name: 'Cereal & milk',    emoji: '🥛', serving: '1 bowl',    calories: 220, protein: 8,  carbs: 40, fat: 4,  quality: 3 },
  { id: 'f_yogurt',     name: 'Greek yogurt',     emoji: '🍶', serving: '1 cup',     calories: 130, protein: 17, carbs: 9,  fat: 4,  quality: 5 },
  // Fruit & veg
  { id: 'f_banana',     name: 'Banana',           emoji: '🍌', serving: '1 medium',  calories: 105, protein: 1,  carbs: 27, fat: 0,  quality: 5 },
  { id: 'f_apple',      name: 'Apple',            emoji: '🍎', serving: '1 medium',  calories: 95,  protein: 0,  carbs: 25, fat: 0,  quality: 5 },
  { id: 'f_berries',    name: 'Mixed berries',    emoji: '🫐', serving: '1 cup',     calories: 70,  protein: 1,  carbs: 17, fat: 0,  quality: 5 },
  { id: 'f_salad',      name: 'Garden salad',     emoji: '🥗', serving: '1 bowl',    calories: 120, protein: 3,  carbs: 12, fat: 7,  quality: 5 },
  { id: 'f_avocado',    name: 'Avocado',          emoji: '🥑', serving: '1/2',       calories: 160, protein: 2,  carbs: 9,  fat: 15, quality: 5 },
  { id: 'f_veggies',    name: 'Steamed veggies',  emoji: '🥦', serving: '1 cup',     calories: 60,  protein: 4,  carbs: 11, fat: 0,  quality: 5 },
  // Mains & protein
  { id: 'f_chicken',    name: 'Grilled chicken',  emoji: '🍗', serving: '1 breast',  calories: 220, protein: 40, carbs: 0,  fat: 6,  quality: 5 },
  { id: 'f_salmon',     name: 'Salmon',           emoji: '🐟', serving: '1 fillet',  calories: 280, protein: 34, carbs: 0,  fat: 16, quality: 5 },
  { id: 'f_rice',       name: 'Rice',             emoji: '🍚', serving: '1 cup',     calories: 205, protein: 4,  carbs: 45, fat: 0,  quality: 3 },
  { id: 'f_pasta',      name: 'Pasta',            emoji: '🍝', serving: '1 plate',   calories: 350, protein: 12, carbs: 65, fat: 4,  quality: 3 },
  { id: 'f_sandwich',   name: 'Sandwich',         emoji: '🥪', serving: '1',         calories: 360, protein: 18, carbs: 40, fat: 14, quality: 3 },
  { id: 'f_soup',       name: 'Vegetable soup',   emoji: '🍲', serving: '1 bowl',    calories: 150, protein: 6,  carbs: 22, fat: 4,  quality: 5 },
  { id: 'f_tofu',       name: 'Tofu stir-fry',    emoji: '🍱', serving: '1 plate',   calories: 300, protein: 18, carbs: 25, fat: 14, quality: 5 },
  { id: 'f_beans',      name: 'Beans & rice',     emoji: '🫘', serving: '1 bowl',    calories: 330, protein: 14, carbs: 55, fat: 5,  quality: 4 },
  // Quick & treats
  { id: 'f_nuts',       name: 'Handful of nuts',  emoji: '🥜', serving: '30 g',      calories: 180, protein: 6,  carbs: 6,  fat: 16, quality: 4 },
  { id: 'f_proteinbar', name: 'Protein bar',      emoji: '🍫', serving: '1 bar',     calories: 220, protein: 20, carbs: 22, fat: 7,  quality: 3 },
  { id: 'f_pizza',      name: 'Pizza',            emoji: '🍕', serving: '2 slices',  calories: 560, protein: 22, carbs: 64, fat: 22, quality: 2 },
  { id: 'f_burger',     name: 'Burger',           emoji: '🍔', serving: '1',         calories: 550, protein: 25, carbs: 42, fat: 30, quality: 2 },
  { id: 'f_fries',      name: 'Fries',            emoji: '🍟', serving: '1 medium',  calories: 380, protein: 4,  carbs: 48, fat: 18, quality: 1 },
  { id: 'f_chips',      name: 'Chips',            emoji: '🥔', serving: '1 bag',     calories: 280, protein: 3,  carbs: 30, fat: 17, quality: 1 },
  { id: 'f_chocolate',  name: 'Chocolate',        emoji: '🍫', serving: '1 bar',     calories: 230, protein: 3,  carbs: 26, fat: 13, quality: 1 },
  { id: 'f_icecream',   name: 'Ice cream',        emoji: '🍨', serving: '1 scoop',   calories: 210, protein: 4,  carbs: 24, fat: 11, quality: 1 },
  // Drinks
  { id: 'f_coffee',     name: 'Coffee',           emoji: '☕', serving: '1 cup',     calories: 40,  protein: 1,  carbs: 6,  fat: 1,  quality: 3 },
  { id: 'f_smoothie',   name: 'Fruit smoothie',   emoji: '🥤', serving: '1 glass',   calories: 200, protein: 5,  carbs: 40, fat: 2,  quality: 4 },
  { id: 'f_soda',       name: 'Soda',             emoji: '🥤', serving: '1 can',     calories: 140, protein: 0,  carbs: 39, fat: 0,  quality: 1 },
];

const slug = () => 'f_' + Math.random().toString(36).slice(2, 9);

// Built-ins first, then custom foods; a custom food with the same id overrides.
export function allFoods(custom = []) {
  const map = new Map();
  STARTER_FOODS.forEach((f) => map.set(f.id, f));
  (custom || []).forEach((f) => map.set(f.id, f));
  return [...map.values()];
}

export function searchFoods(query, custom = []) {
  const list = allFoods(custom);
  const q = (query || '').trim().toLowerCase();
  if (!q) return list;
  return list
    .filter((f) => f.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q));
}

// Build a clean custom-food object from free-form form input.
export function makeFood({ name, serving, calories, protein, carbs, fat, quality }) {
  return {
    id: slug(),
    name: (name || '').trim(),
    emoji: '🍽️',
    serving: (serving || '').trim() || '1 serving',
    calories: Math.max(0, Math.round(+calories || 0)),
    protein: Math.max(0, Math.round(+protein || 0)),
    carbs: Math.max(0, Math.round(+carbs || 0)),
    fat: Math.max(0, Math.round(+fat || 0)),
    quality: Math.min(5, Math.max(1, Math.round(+quality || 3))),
    custom: true,
  };
}

// Turn a chosen food into a meal entry (snapshots nutrition so later edits to
// the food don't rewrite history).
export function foodToMeal(food, type) {
  return {
    type,
    foodId: food.id,
    label: food.name,
    emoji: food.emoji || '🍽️',
    serving: food.serving,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    quality: food.quality ?? 3,
  };
}

export function dayCalories(day) {
  return (day.meals || []).reduce((s, m) => s + (m.calories || 0), 0);
}

// ---- file export / import ----------------------------------------------
export function exportFoods(custom) {
  const data = {
    app: 'Pulse',
    kind: 'pulse-foods',
    exportedAt: new Date().toISOString(),
    foods: allFoods(custom),
  };
  const name = `pulse-foods-${todayKey()}.json`;
  triggerDownload(name, JSON.stringify(data, null, 2), 'application/json');
  return name;
}

// Returns an array of foods (custom-shaped) to merge in. Throws friendly errors.
export function parseFoods(text) {
  let obj;
  try { obj = JSON.parse(text); }
  catch { throw new Error("That file isn't valid JSON. Choose a Pulse food file (.json)."); }
  const foods = Array.isArray(obj) ? obj : obj?.foods;
  if (!Array.isArray(foods)) {
    throw new Error("That doesn't look like a Pulse food library. Choose a file you exported from Pulse.");
  }
  return foods
    .filter((f) => f && typeof f.name === 'string' && f.name.trim())
    .map((f) => ({
      id: typeof f.id === 'string' ? f.id : slug(),
      name: f.name.trim(),
      emoji: f.emoji || '🍽️',
      serving: f.serving || '1 serving',
      calories: Math.max(0, Math.round(+f.calories || 0)),
      protein: Math.max(0, Math.round(+f.protein || 0)),
      carbs: Math.max(0, Math.round(+f.carbs || 0)),
      fat: Math.max(0, Math.round(+f.fat || 0)),
      quality: Math.min(5, Math.max(1, Math.round(+f.quality || 3))),
      custom: true,
    }));
}

// Merge imported/added foods into the existing custom list (id wins, newest last).
export function mergeFoods(existing = [], incoming = []) {
  const map = new Map();
  // Drop any imported food that's identical to a built-in (keeps the library lean).
  const builtinIds = new Set(STARTER_FOODS.map((f) => f.id));
  existing.forEach((f) => map.set(f.id, f));
  incoming.forEach((f) => { if (!builtinIds.has(f.id)) map.set(f.id, f); });
  return [...map.values()];
}
