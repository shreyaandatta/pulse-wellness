// A small, friendly food database. Each food carries rough nutrition per its
// serving plus a 1–5 "nourishing" quality used by the wellness score. Users can
// add their own foods (stored in state.foods) and download/restore the whole
// library as a file.
import { triggerDownload } from './download.js';
import { todayKey } from './dates.js';

// Built-in starter foods (~180). Values are approximate, everyday-portion
// estimates compiled from standard published nutrition data — enough to be
// useful without pretending to be a clinical database. Each carries a 1–5
// "nourishing" quality used by the wellness score. Log any food at a fractional
// or multiple quantity (0.5×, 2×, …) when your portion differs from the serving.
export const STARTER_FOODS = [
  // ---- Indian breads & grains ----
  { id: 'f_roti',        name: 'Roti / Chapati',     emoji: '🫓', serving: '1 piece',  calories: 71,  protein: 3,  carbs: 15, fat: 0,  quality: 4 },
  { id: 'f_naan',        name: 'Naan',               emoji: '🫓', serving: '1 piece',  calories: 260, protein: 9,  carbs: 45, fat: 5,  quality: 3 },
  { id: 'f_butternaan',  name: 'Butter naan',        emoji: '🫓', serving: '1 piece',  calories: 320, protein: 9,  carbs: 46, fat: 11, quality: 2 },
  { id: 'f_garlicnaan',  name: 'Garlic naan',        emoji: '🫓', serving: '1 piece',  calories: 300, protein: 9,  carbs: 45, fat: 9,  quality: 3 },
  { id: 'f_paratha',     name: 'Plain paratha',      emoji: '🫓', serving: '1 piece',  calories: 180, protein: 4,  carbs: 26, fat: 7,  quality: 3 },
  { id: 'f_alooparatha', name: 'Aloo paratha',       emoji: '🥔', serving: '1 piece',  calories: 290, protein: 6,  carbs: 40, fat: 12, quality: 3 },
  { id: 'f_puri',        name: 'Puri',               emoji: '🫓', serving: '2 pieces', calories: 200, protein: 3,  carbs: 24, fat: 10, quality: 2 },
  { id: 'f_bhatura',     name: 'Bhatura',            emoji: '🫓', serving: '1 piece',  calories: 290, protein: 6,  carbs: 40, fat: 12, quality: 2 },
  { id: 'f_dosa',        name: 'Plain dosa',         emoji: '🥞', serving: '1',        calories: 133, protein: 3,  carbs: 24, fat: 3,  quality: 4 },
  { id: 'f_masaladosa',  name: 'Masala dosa',        emoji: '🥞', serving: '1',        calories: 250, protein: 6,  carbs: 42, fat: 7,  quality: 3 },
  { id: 'f_idli',        name: 'Idli',               emoji: '🍥', serving: '2 pieces', calories: 116, protein: 4,  carbs: 24, fat: 1,  quality: 5 },
  { id: 'f_uttapam',     name: 'Uttapam',            emoji: '🥞', serving: '1',        calories: 200, protein: 6,  carbs: 32, fat: 5,  quality: 4 },
  { id: 'f_poha',        name: 'Poha',               emoji: '🍚', serving: '1 plate',  calories: 270, protein: 6,  carbs: 45, fat: 7,  quality: 4 },
  { id: 'f_upma',        name: 'Upma',               emoji: '🍚', serving: '1 plate',  calories: 250, protein: 6,  carbs: 40, fat: 8,  quality: 4 },

  // ---- Indian dals, curries & mains ----
  { id: 'f_dal',          name: 'Dal (tadka)',       emoji: '🍲', serving: '1 cup',    calories: 150, protein: 9,  carbs: 20, fat: 4,  quality: 5 },
  { id: 'f_dalmakhani',   name: 'Dal makhani',       emoji: '🍲', serving: '1 cup',    calories: 330, protein: 12, carbs: 30, fat: 18, quality: 3 },
  { id: 'f_chana',        name: 'Chana masala',      emoji: '🍛', serving: '1 cup',    calories: 270, protein: 11, carbs: 40, fat: 8,  quality: 4 },
  { id: 'f_rajma',        name: 'Rajma',             emoji: '🍛', serving: '1 cup',    calories: 280, protein: 13, carbs: 42, fat: 6,  quality: 4 },
  { id: 'f_chole',        name: 'Chole',             emoji: '🍛', serving: '1 cup',    calories: 290, protein: 12, carbs: 42, fat: 8,  quality: 4 },
  { id: 'f_sambar',       name: 'Sambar',            emoji: '🍲', serving: '1 cup',    calories: 140, protein: 7,  carbs: 22, fat: 3,  quality: 5 },
  { id: 'f_rasam',        name: 'Rasam',             emoji: '🍲', serving: '1 cup',    calories: 70,  protein: 3,  carbs: 12, fat: 1,  quality: 5 },
  { id: 'f_kadhi',        name: 'Kadhi',             emoji: '🍲', serving: '1 cup',    calories: 180, protein: 7,  carbs: 18, fat: 9,  quality: 3 },
  { id: 'f_paneerbm',     name: 'Paneer butter masala', emoji: '🧀', serving: '1 cup', calories: 380, protein: 15, carbs: 18, fat: 28, quality: 2 },
  { id: 'f_palakpaneer',  name: 'Palak paneer',      emoji: '🥬', serving: '1 cup',    calories: 300, protein: 14, carbs: 14, fat: 22, quality: 4 },
  { id: 'f_shahipaneer',  name: 'Shahi paneer',      emoji: '🧀', serving: '1 cup',    calories: 360, protein: 14, carbs: 18, fat: 26, quality: 2 },
  { id: 'f_butterchicken',name: 'Butter chicken',    emoji: '🍗', serving: '1 cup',    calories: 440, protein: 30, carbs: 12, fat: 30, quality: 3 },
  { id: 'f_chickencurry', name: 'Chicken curry',     emoji: '🍛', serving: '1 cup',    calories: 300, protein: 26, carbs: 8,  fat: 18, quality: 4 },
  { id: 'f_chickentikka', name: 'Chicken tikka',     emoji: '🍢', serving: '6 pieces', calories: 280, protein: 35, carbs: 6,  fat: 12, quality: 4 },
  { id: 'f_tandoori',     name: 'Tandoori chicken',  emoji: '🍗', serving: '2 pieces', calories: 300, protein: 38, carbs: 4,  fat: 14, quality: 4 },
  { id: 'f_fishcurry',    name: 'Fish curry',        emoji: '🐟', serving: '1 cup',    calories: 250, protein: 24, carbs: 8,  fat: 13, quality: 4 },
  { id: 'f_eggcurry',     name: 'Egg curry',         emoji: '🥚', serving: '1 cup',    calories: 270, protein: 14, carbs: 10, fat: 19, quality: 3 },
  { id: 'f_aloogobi',     name: 'Aloo gobi',         emoji: '🥔', serving: '1 cup',    calories: 200, protein: 5,  carbs: 24, fat: 10, quality: 4 },
  { id: 'f_bhindi',       name: 'Bhindi masala',     emoji: '🫛', serving: '1 cup',    calories: 170, protein: 4,  carbs: 18, fat: 10, quality: 4 },
  { id: 'f_baingan',      name: 'Baingan bharta',    emoji: '🍆', serving: '1 cup',    calories: 180, protein: 4,  carbs: 18, fat: 11, quality: 4 },
  { id: 'f_mixveg',       name: 'Mixed veg curry',   emoji: '🥗', serving: '1 cup',    calories: 190, protein: 5,  carbs: 20, fat: 10, quality: 4 },
  { id: 'f_pavbhaji',     name: 'Pav bhaji',         emoji: '🍛', serving: '1 plate',  calories: 400, protein: 10, carbs: 55, fat: 16, quality: 2 },
  { id: 'f_chickenbiryani',name:'Chicken biryani',   emoji: '🍚', serving: '1 plate',  calories: 490, protein: 25, carbs: 60, fat: 16, quality: 3 },
  { id: 'f_vegbiryani',   name: 'Veg biryani',       emoji: '🍚', serving: '1 plate',  calories: 420, protein: 9,  carbs: 66, fat: 13, quality: 3 },
  { id: 'f_pulao',        name: 'Veg pulao',         emoji: '🍚', serving: '1 plate',  calories: 320, protein: 7,  carbs: 52, fat: 9,  quality: 3 },
  { id: 'f_jeerarice',    name: 'Jeera rice',        emoji: '🍚', serving: '1 cup',    calories: 240, protein: 4,  carbs: 44, fat: 6,  quality: 3 },
  { id: 'f_khichdi',      name: 'Khichdi',           emoji: '🍲', serving: '1 bowl',   calories: 280, protein: 10, carbs: 45, fat: 6,  quality: 5 },
  { id: 'f_curdrice',     name: 'Curd rice',         emoji: '🍚', serving: '1 bowl',   calories: 250, protein: 7,  carbs: 40, fat: 6,  quality: 4 },

  // ---- Indian snacks & street food ----
  { id: 'f_samosa',     name: 'Samosa',          emoji: '🥟', serving: '1 piece',  calories: 260, protein: 4,  carbs: 30, fat: 14, quality: 2 },
  { id: 'f_pakora',     name: 'Pakora',          emoji: '🧆', serving: '6 pieces', calories: 280, protein: 6,  carbs: 28, fat: 16, quality: 2 },
  { id: 'f_vadapav',    name: 'Vada pav',        emoji: '🍔', serving: '1',        calories: 290, protein: 7,  carbs: 42, fat: 11, quality: 2 },
  { id: 'f_bhel',       name: 'Bhel puri',       emoji: '🥗', serving: '1 plate',  calories: 240, protein: 6,  carbs: 40, fat: 7,  quality: 3 },
  { id: 'f_panipuri',   name: 'Pani puri',       emoji: '💧', serving: '6 pieces', calories: 180, protein: 4,  carbs: 32, fat: 5,  quality: 2 },
  { id: 'f_alootikki',  name: 'Aloo tikki',      emoji: '🥔', serving: '2 pieces', calories: 220, protein: 4,  carbs: 30, fat: 10, quality: 2 },
  { id: 'f_dhokla',     name: 'Dhokla',          emoji: '🟡', serving: '3 pieces', calories: 160, protein: 6,  carbs: 26, fat: 4,  quality: 4 },
  { id: 'f_kachori',    name: 'Kachori',         emoji: '🥟', serving: '1 piece',  calories: 240, protein: 5,  carbs: 28, fat: 12, quality: 2 },
  { id: 'f_momos',      name: 'Momos',           emoji: '🥟', serving: '6 pieces', calories: 250, protein: 10, carbs: 36, fat: 7,  quality: 3 },
  { id: 'f_frankie',    name: 'Kathi roll',      emoji: '🌯', serving: '1',        calories: 330, protein: 14, carbs: 38, fat: 14, quality: 3 },
  { id: 'f_springroll', name: 'Spring roll',     emoji: '🥢', serving: '2 pieces', calories: 200, protein: 4,  carbs: 26, fat: 9,  quality: 2 },

  // ---- Indian sweets ----
  { id: 'f_gulabjamun', name: 'Gulab jamun',     emoji: '🍮', serving: '2 pieces', calories: 300, protein: 4,  carbs: 48, fat: 11, quality: 1 },
  { id: 'f_jalebi',     name: 'Jalebi',          emoji: '🍥', serving: '2 pieces', calories: 250, protein: 2,  carbs: 44, fat: 8,  quality: 1 },
  { id: 'f_rasgulla',   name: 'Rasgulla',        emoji: '🤍', serving: '2 pieces', calories: 220, protein: 4,  carbs: 44, fat: 3,  quality: 1 },
  { id: 'f_ladoo',      name: 'Ladoo',           emoji: '🟠', serving: '1 piece',  calories: 180, protein: 3,  carbs: 26, fat: 8,  quality: 1 },
  { id: 'f_barfi',      name: 'Barfi',           emoji: '🟫', serving: '1 piece',  calories: 170, protein: 4,  carbs: 22, fat: 8,  quality: 1 },
  { id: 'f_kheer',      name: 'Kheer',           emoji: '🍚', serving: '1 bowl',   calories: 250, protein: 6,  carbs: 40, fat: 8,  quality: 2 },
  { id: 'f_gajarhalwa', name: 'Gajar halwa',     emoji: '🥕', serving: '1 bowl',   calories: 300, protein: 5,  carbs: 40, fat: 14, quality: 1 },

  // ---- Dairy ----
  { id: 'f_milk',         name: 'Milk',            emoji: '🥛', serving: '1 cup',    calories: 120, protein: 8,  carbs: 12, fat: 5,  quality: 4 },
  { id: 'f_paneer',       name: 'Paneer',          emoji: '🧀', serving: '100 g',    calories: 265, protein: 18, carbs: 6,  fat: 21, quality: 4 },
  { id: 'f_curd',         name: 'Curd / Yogurt',   emoji: '🍶', serving: '1 cup',    calories: 100, protein: 8,  carbs: 8,  fat: 3,  quality: 5 },
  { id: 'f_yogurt',       name: 'Greek yogurt',    emoji: '🍶', serving: '1 cup',    calories: 130, protein: 17, carbs: 9,  fat: 4,  quality: 5 },
  { id: 'f_lassi',        name: 'Sweet lassi',     emoji: '🥤', serving: '1 glass',  calories: 220, protein: 8,  carbs: 32, fat: 6,  quality: 3 },
  { id: 'f_buttermilk',   name: 'Buttermilk',      emoji: '🥛', serving: '1 glass',  calories: 80,  protein: 4,  carbs: 10, fat: 2,  quality: 4 },
  { id: 'f_ghee',         name: 'Ghee',            emoji: '🧈', serving: '1 tbsp',   calories: 120, protein: 0,  carbs: 0,  fat: 14, quality: 2 },
  { id: 'f_butter',       name: 'Butter',          emoji: '🧈', serving: '1 tbsp',   calories: 100, protein: 0,  carbs: 0,  fat: 11, quality: 2 },
  { id: 'f_cheese',       name: 'Cheese slice',    emoji: '🧀', serving: '1 slice',  calories: 80,  protein: 5,  carbs: 1,  fat: 6,  quality: 3 },
  { id: 'f_cottagecheese',name: 'Cottage cheese',  emoji: '🥛', serving: '1 cup',    calories: 180, protein: 25, carbs: 7,  fat: 5,  quality: 5 },

  // ---- Breakfast (global) ----
  { id: 'f_oatmeal',    name: 'Oatmeal',          emoji: '🥣', serving: '1 bowl',   calories: 150, protein: 5,  carbs: 27, fat: 3,  quality: 5 },
  { id: 'f_eggs',       name: 'Eggs',             emoji: '🥚', serving: '2 eggs',   calories: 140, protein: 12, carbs: 1,  fat: 10, quality: 4 },
  { id: 'f_boiledegg',  name: 'Boiled egg',       emoji: '🥚', serving: '1',        calories: 70,  protein: 6,  carbs: 1,  fat: 5,  quality: 5 },
  { id: 'f_omelette',   name: 'Omelette',         emoji: '🍳', serving: '2 eggs',   calories: 220, protein: 14, carbs: 2,  fat: 17, quality: 4 },
  { id: 'f_toast',      name: 'Whole-grain toast',emoji: '🍞', serving: '2 slices', calories: 160, protein: 6,  carbs: 28, fat: 2,  quality: 4 },
  { id: 'f_frenchtoast',name: 'French toast',     emoji: '🍞', serving: '2 slices', calories: 290, protein: 9,  carbs: 36, fat: 12, quality: 2 },
  { id: 'f_pancakes',   name: 'Pancakes',         emoji: '🥞', serving: '3 small',  calories: 350, protein: 8,  carbs: 50, fat: 12, quality: 2 },
  { id: 'f_waffles',    name: 'Waffles',          emoji: '🧇', serving: '2',        calories: 290, protein: 7,  carbs: 40, fat: 11, quality: 2 },
  { id: 'f_cereal',     name: 'Cereal & milk',    emoji: '🥛', serving: '1 bowl',   calories: 220, protein: 8,  carbs: 40, fat: 4,  quality: 3 },
  { id: 'f_granola',    name: 'Granola',          emoji: '🥣', serving: '1/2 cup',  calories: 230, protein: 5,  carbs: 40, fat: 8,  quality: 3 },
  { id: 'f_bagel',      name: 'Bagel',            emoji: '🥯', serving: '1',        calories: 280, protein: 11, carbs: 55, fat: 2,  quality: 3 },
  { id: 'f_croissant',  name: 'Croissant',        emoji: '🥐', serving: '1',        calories: 270, protein: 5,  carbs: 31, fat: 14, quality: 2 },
  { id: 'f_muffin',     name: 'Muffin',           emoji: '🧁', serving: '1',        calories: 380, protein: 6,  carbs: 54, fat: 16, quality: 1 },
  { id: 'f_smoothiebowl',name:'Smoothie bowl',    emoji: '🥣', serving: '1 bowl',   calories: 320, protein: 8,  carbs: 58, fat: 7,  quality: 4 },

  // ---- Fruit ----
  { id: 'f_banana',       name: 'Banana',          emoji: '🍌', serving: '1 medium', calories: 105, protein: 1,  carbs: 27, fat: 0,  quality: 5 },
  { id: 'f_apple',        name: 'Apple',           emoji: '🍎', serving: '1 medium', calories: 95,  protein: 0,  carbs: 25, fat: 0,  quality: 5 },
  { id: 'f_orange',       name: 'Orange',          emoji: '🍊', serving: '1',        calories: 62,  protein: 1,  carbs: 15, fat: 0,  quality: 5 },
  { id: 'f_mango',        name: 'Mango',           emoji: '🥭', serving: '1 cup',    calories: 100, protein: 1,  carbs: 25, fat: 0,  quality: 5 },
  { id: 'f_grapes',       name: 'Grapes',          emoji: '🍇', serving: '1 cup',    calories: 104, protein: 1,  carbs: 27, fat: 0,  quality: 4 },
  { id: 'f_watermelon',   name: 'Watermelon',      emoji: '🍉', serving: '1 cup',    calories: 46,  protein: 1,  carbs: 12, fat: 0,  quality: 5 },
  { id: 'f_pineapple',    name: 'Pineapple',       emoji: '🍍', serving: '1 cup',    calories: 82,  protein: 1,  carbs: 22, fat: 0,  quality: 5 },
  { id: 'f_pear',         name: 'Pear',            emoji: '🍐', serving: '1',        calories: 100, protein: 1,  carbs: 27, fat: 0,  quality: 5 },
  { id: 'f_papaya',       name: 'Papaya',          emoji: '🟠', serving: '1 cup',    calories: 62,  protein: 1,  carbs: 16, fat: 0,  quality: 5 },
  { id: 'f_pomegranate',  name: 'Pomegranate',     emoji: '🔴', serving: '1/2 cup',  calories: 72,  protein: 1,  carbs: 16, fat: 1,  quality: 5 },
  { id: 'f_kiwi',         name: 'Kiwi',            emoji: '🥝', serving: '1',        calories: 42,  protein: 1,  carbs: 10, fat: 0,  quality: 5 },
  { id: 'f_strawberries', name: 'Strawberries',    emoji: '🍓', serving: '1 cup',    calories: 49,  protein: 1,  carbs: 12, fat: 0,  quality: 5 },
  { id: 'f_berries',      name: 'Mixed berries',   emoji: '🫐', serving: '1 cup',    calories: 70,  protein: 1,  carbs: 17, fat: 0,  quality: 5 },
  { id: 'f_dates',        name: 'Dates',           emoji: '🌴', serving: '3 pieces', calories: 200, protein: 2,  carbs: 54, fat: 0,  quality: 4 },

  // ---- Vegetables & salad ----
  { id: 'f_salad',     name: 'Garden salad',     emoji: '🥗', serving: '1 bowl',   calories: 120, protein: 3,  carbs: 12, fat: 7,  quality: 5 },
  { id: 'f_avocado',   name: 'Avocado',          emoji: '🥑', serving: '1/2',      calories: 160, protein: 2,  carbs: 9,  fat: 15, quality: 5 },
  { id: 'f_veggies',   name: 'Steamed veggies',  emoji: '🥦', serving: '1 cup',    calories: 60,  protein: 4,  carbs: 11, fat: 0,  quality: 5 },
  { id: 'f_broccoli',  name: 'Broccoli',         emoji: '🥦', serving: '1 cup',    calories: 55,  protein: 4,  carbs: 11, fat: 0,  quality: 5 },
  { id: 'f_spinach',   name: 'Spinach',          emoji: '🥬', serving: '1 cup',    calories: 23,  protein: 3,  carbs: 4,  fat: 0,  quality: 5 },
  { id: 'f_carrot',    name: 'Carrot',           emoji: '🥕', serving: '1',        calories: 25,  protein: 1,  carbs: 6,  fat: 0,  quality: 5 },
  { id: 'f_cucumber',  name: 'Cucumber',         emoji: '🥒', serving: '1 cup',    calories: 16,  protein: 1,  carbs: 4,  fat: 0,  quality: 5 },
  { id: 'f_corn',      name: 'Corn',             emoji: '🌽', serving: '1 cob',    calories: 100, protein: 3,  carbs: 22, fat: 1,  quality: 4 },
  { id: 'f_sweetpotato',name:'Sweet potato',     emoji: '🍠', serving: '1 medium', calories: 115, protein: 2,  carbs: 27, fat: 0,  quality: 5 },
  { id: 'f_potato',    name: 'Potato',           emoji: '🥔', serving: '1 medium', calories: 160, protein: 4,  carbs: 37, fat: 0,  quality: 4 },
  { id: 'f_tomato',    name: 'Tomato',           emoji: '🍅', serving: '1',        calories: 22,  protein: 1,  carbs: 5,  fat: 0,  quality: 5 },

  // ---- Protein & mains ----
  { id: 'f_chicken',    name: 'Grilled chicken',  emoji: '🍗', serving: '1 breast', calories: 220, protein: 40, carbs: 0,  fat: 6,  quality: 5 },
  { id: 'f_friedchicken',name:'Fried chicken',    emoji: '🍗', serving: '2 pieces', calories: 480, protein: 30, carbs: 16, fat: 32, quality: 1 },
  { id: 'f_salmon',     name: 'Salmon',           emoji: '🐟', serving: '1 fillet', calories: 280, protein: 34, carbs: 0,  fat: 16, quality: 5 },
  { id: 'f_tuna',       name: 'Tuna',             emoji: '🐟', serving: '1 can',    calories: 180, protein: 40, carbs: 0,  fat: 2,  quality: 5 },
  { id: 'f_shrimp',     name: 'Shrimp',           emoji: '🦐', serving: '100 g',    calories: 99,  protein: 24, carbs: 0,  fat: 0,  quality: 5 },
  { id: 'f_steak',      name: 'Steak',            emoji: '🥩', serving: '200 g',    calories: 460, protein: 46, carbs: 0,  fat: 30, quality: 3 },
  { id: 'f_groundbeef', name: 'Ground beef',      emoji: '🍖', serving: '100 g',    calories: 250, protein: 26, carbs: 0,  fat: 17, quality: 3 },
  { id: 'f_porkchop',   name: 'Pork chop',        emoji: '🥩', serving: '1',        calories: 290, protein: 30, carbs: 0,  fat: 18, quality: 3 },
  { id: 'f_tofu',       name: 'Tofu stir-fry',    emoji: '🍱', serving: '1 plate',  calories: 300, protein: 18, carbs: 25, fat: 14, quality: 5 },
  { id: 'f_tempeh',     name: 'Tempeh',           emoji: '🟫', serving: '100 g',    calories: 190, protein: 20, carbs: 8,  fat: 11, quality: 5 },
  { id: 'f_lentils',    name: 'Lentils',          emoji: '🫘', serving: '1 cup',    calories: 230, protein: 18, carbs: 40, fat: 1,  quality: 5 },
  { id: 'f_chickpeas',  name: 'Chickpeas',        emoji: '🫛', serving: '1 cup',    calories: 270, protein: 15, carbs: 45, fat: 4,  quality: 5 },
  { id: 'f_blackbeans', name: 'Black beans',      emoji: '🫘', serving: '1 cup',    calories: 227, protein: 15, carbs: 41, fat: 1,  quality: 5 },
  { id: 'f_beans',      name: 'Beans & rice',     emoji: '🫘', serving: '1 bowl',   calories: 330, protein: 14, carbs: 55, fat: 5,  quality: 4 },

  // ---- Grains & carbs ----
  { id: 'f_rice',       name: 'White rice',       emoji: '🍚', serving: '1 cup',    calories: 205, protein: 4,  carbs: 45, fat: 0,  quality: 3 },
  { id: 'f_brownrice',  name: 'Brown rice',       emoji: '🍚', serving: '1 cup',    calories: 215, protein: 5,  carbs: 45, fat: 2,  quality: 4 },
  { id: 'f_quinoa',     name: 'Quinoa',           emoji: '🌾', serving: '1 cup',    calories: 220, protein: 8,  carbs: 39, fat: 4,  quality: 5 },
  { id: 'f_pasta',      name: 'Pasta',            emoji: '🍝', serving: '1 plate',  calories: 350, protein: 12, carbs: 65, fat: 4,  quality: 3 },
  { id: 'f_noodles',    name: 'Noodles',          emoji: '🍜', serving: '1 cup',    calories: 220, protein: 7,  carbs: 43, fat: 2,  quality: 3 },
  { id: 'f_couscous',   name: 'Couscous',         emoji: '🍚', serving: '1 cup',    calories: 175, protein: 6,  carbs: 36, fat: 0,  quality: 4 },
  { id: 'f_wheatbread', name: 'Wheat bread',      emoji: '🍞', serving: '1 slice',  calories: 80,  protein: 4,  carbs: 14, fat: 1,  quality: 4 },
  { id: 'f_whitebread', name: 'White bread',      emoji: '🍞', serving: '1 slice',  calories: 75,  protein: 2,  carbs: 14, fat: 1,  quality: 2 },
  { id: 'f_mashedpotato',name:'Mashed potato',    emoji: '🥔', serving: '1 cup',    calories: 240, protein: 4,  carbs: 35, fat: 9,  quality: 3 },

  // ---- Meals & fast food (global) ----
  { id: 'f_sandwich',   name: 'Sandwich',         emoji: '🥪', serving: '1',        calories: 360, protein: 18, carbs: 40, fat: 14, quality: 3 },
  { id: 'f_wrap',       name: 'Chicken wrap',     emoji: '🌯', serving: '1',        calories: 360, protein: 22, carbs: 36, fat: 14, quality: 3 },
  { id: 'f_grilledcheese',name:'Grilled cheese',  emoji: '🥪', serving: '1',        calories: 350, protein: 13, carbs: 30, fat: 19, quality: 2 },
  { id: 'f_soup',       name: 'Vegetable soup',   emoji: '🍲', serving: '1 bowl',   calories: 150, protein: 6,  carbs: 22, fat: 4,  quality: 5 },
  { id: 'f_pizza',      name: 'Pizza',            emoji: '🍕', serving: '2 slices', calories: 560, protein: 22, carbs: 64, fat: 22, quality: 2 },
  { id: 'f_burger',     name: 'Burger',           emoji: '🍔', serving: '1',        calories: 550, protein: 25, carbs: 42, fat: 30, quality: 2 },
  { id: 'f_hotdog',     name: 'Hot dog',          emoji: '🌭', serving: '1',        calories: 290, protein: 10, carbs: 24, fat: 17, quality: 1 },
  { id: 'f_taco',       name: 'Taco',             emoji: '🌮', serving: '1',        calories: 210, protein: 9,  carbs: 20, fat: 11, quality: 3 },
  { id: 'f_burrito',    name: 'Burrito',          emoji: '🌯', serving: '1',        calories: 450, protein: 20, carbs: 55, fat: 16, quality: 3 },
  { id: 'f_sushi',      name: 'Sushi roll',       emoji: '🍣', serving: '6 pieces', calories: 250, protein: 9,  carbs: 38, fat: 7,  quality: 4 },
  { id: 'f_ramen',      name: 'Ramen',            emoji: '🍜', serving: '1 bowl',   calories: 440, protein: 12, carbs: 60, fat: 16, quality: 2 },
  { id: 'f_friedrice',  name: 'Fried rice',       emoji: '🍚', serving: '1 plate',  calories: 350, protein: 9,  carbs: 50, fat: 12, quality: 2 },
  { id: 'f_nachos',     name: 'Nachos',           emoji: '🧀', serving: '1 plate',  calories: 480, protein: 10, carbs: 46, fat: 28, quality: 1 },
  { id: 'f_macncheese', name: 'Mac & cheese',     emoji: '🧀', serving: '1 cup',    calories: 380, protein: 13, carbs: 44, fat: 16, quality: 2 },
  { id: 'f_fries',      name: 'Fries',            emoji: '🍟', serving: '1 medium', calories: 380, protein: 4,  carbs: 48, fat: 18, quality: 1 },

  // ---- Snacks & treats ----
  { id: 'f_nuts',       name: 'Handful of nuts',  emoji: '🥜', serving: '30 g',     calories: 180, protein: 6,  carbs: 6,  fat: 16, quality: 4 },
  { id: 'f_peanutbutter',name:'Peanut butter',    emoji: '🥜', serving: '2 tbsp',   calories: 190, protein: 8,  carbs: 7,  fat: 16, quality: 3 },
  { id: 'f_trailmix',   name: 'Trail mix',        emoji: '🥜', serving: '1/4 cup',  calories: 175, protein: 5,  carbs: 16, fat: 11, quality: 3 },
  { id: 'f_makhana',    name: 'Makhana (fox nuts)',emoji: '🍿', serving: '1 cup',   calories: 110, protein: 3,  carbs: 20, fat: 1,  quality: 4 },
  { id: 'f_popcorn',    name: 'Popcorn',          emoji: '🍿', serving: '3 cups',   calories: 110, protein: 3,  carbs: 22, fat: 1,  quality: 3 },
  { id: 'f_proteinbar', name: 'Protein bar',      emoji: '🍫', serving: '1 bar',    calories: 220, protein: 20, carbs: 22, fat: 7,  quality: 3 },
  { id: 'f_granolabar', name: 'Granola bar',      emoji: '🍫', serving: '1',        calories: 130, protein: 3,  carbs: 20, fat: 5,  quality: 3 },
  { id: 'f_crackers',   name: 'Crackers',         emoji: '🍘', serving: '6',        calories: 120, protein: 2,  carbs: 20, fat: 4,  quality: 2 },
  { id: 'f_chips',      name: 'Chips',            emoji: '🥔', serving: '1 bag',    calories: 280, protein: 3,  carbs: 30, fat: 17, quality: 1 },
  { id: 'f_cookies',    name: 'Cookies',          emoji: '🍪', serving: '2',        calories: 160, protein: 2,  carbs: 22, fat: 8,  quality: 1 },
  { id: 'f_chocolate',  name: 'Chocolate',        emoji: '🍫', serving: '1 bar',    calories: 230, protein: 3,  carbs: 26, fat: 13, quality: 1 },
  { id: 'f_donut',      name: 'Donut',            emoji: '🍩', serving: '1',        calories: 250, protein: 3,  carbs: 30, fat: 14, quality: 1 },
  { id: 'f_cake',       name: 'Cake slice',       emoji: '🍰', serving: '1 slice',  calories: 350, protein: 4,  carbs: 50, fat: 15, quality: 1 },
  { id: 'f_brownie',    name: 'Brownie',          emoji: '🍫', serving: '1',        calories: 240, protein: 3,  carbs: 36, fat: 10, quality: 1 },
  { id: 'f_icecream',   name: 'Ice cream',        emoji: '🍨', serving: '1 scoop',  calories: 210, protein: 4,  carbs: 24, fat: 11, quality: 1 },

  // ---- Drinks ----
  { id: 'f_water',      name: 'Water',            emoji: '💧', serving: '1 glass',  calories: 0,   protein: 0,  carbs: 0,  fat: 0,  quality: 5 },
  { id: 'f_coffee',     name: 'Coffee',           emoji: '☕', serving: '1 cup',    calories: 40,  protein: 1,  carbs: 6,  fat: 1,  quality: 3 },
  { id: 'f_tea',        name: 'Tea (with milk)',  emoji: '🍵', serving: '1 cup',    calories: 50,  protein: 1,  carbs: 8,  fat: 1,  quality: 3 },
  { id: 'f_chai',       name: 'Masala chai',      emoji: '🫖', serving: '1 cup',    calories: 90,  protein: 2,  carbs: 12, fat: 3,  quality: 3 },
  { id: 'f_greentea',   name: 'Green tea',        emoji: '🍵', serving: '1 cup',    calories: 2,   protein: 0,  carbs: 0,  fat: 0,  quality: 5 },
  { id: 'f_coconutwater',name:'Coconut water',    emoji: '🥥', serving: '1 glass',  calories: 45,  protein: 1,  carbs: 9,  fat: 0,  quality: 4 },
  { id: 'f_oj',         name: 'Orange juice',     emoji: '🧃', serving: '1 glass',  calories: 110, protein: 2,  carbs: 26, fat: 0,  quality: 3 },
  { id: 'f_smoothie',   name: 'Fruit smoothie',   emoji: '🥤', serving: '1 glass',  calories: 200, protein: 5,  carbs: 40, fat: 2,  quality: 4 },
  { id: 'f_proteinshake',name:'Protein shake',    emoji: '🥤', serving: '1 glass',  calories: 160, protein: 25, carbs: 8,  fat: 3,  quality: 4 },
  { id: 'f_lemonade',   name: 'Lemonade',         emoji: '🍋', serving: '1 glass',  calories: 120, protein: 0,  carbs: 32, fat: 0,  quality: 2 },
  { id: 'f_milkshake',  name: 'Milkshake',        emoji: '🥤', serving: '1 glass',  calories: 350, protein: 9,  carbs: 50, fat: 12, quality: 1 },
  { id: 'f_hotchocolate',name:'Hot chocolate',    emoji: '☕', serving: '1 cup',    calories: 190, protein: 8,  carbs: 27, fat: 6,  quality: 2 },
  { id: 'f_soda',       name: 'Soda',             emoji: '🥤', serving: '1 can',    calories: 140, protein: 0,  carbs: 39, fat: 0,  quality: 1 },
  { id: 'f_energydrink',name: 'Energy drink',     emoji: '⚡', serving: '1 can',    calories: 110, protein: 0,  carbs: 28, fat: 0,  quality: 1 },
  { id: 'f_beer',       name: 'Beer',             emoji: '🍺', serving: '1 can',    calories: 150, protein: 2,  carbs: 13, fat: 0,  quality: 1 },
  { id: 'f_wine',       name: 'Wine',             emoji: '🍷', serving: '1 glass',  calories: 125, protein: 0,  carbs: 4,  fat: 0,  quality: 1 },
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

// Turn a chosen food into a meal entry, scaled by quantity (e.g. 0.5×, 2×).
// Snapshots nutrition so later edits to the food don't rewrite history.
export function foodToMeal(food, type, qty = 1) {
  const q = qty > 0 ? qty : 1;
  const sc = (n) => Math.round((n || 0) * q);
  return {
    type,
    foodId: food.id,
    label: food.name,
    emoji: food.emoji || '🍽️',
    serving: food.serving,
    qty: q,
    calories: sc(food.calories),
    protein: sc(food.protein),
    carbs: sc(food.carbs),
    fat: sc(food.fat),
    quality: food.quality ?? 3,
  };
}

// Tidy quantity label: 1 → "1", 0.5 → "½", 1.5 → "1½", else the number.
export function fmtQty(n) {
  const whole = Math.floor(n);
  const frac = +(n - whole).toFixed(2);
  const fracMap = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  if (frac === 0) return `${whole}`;
  if (fracMap[frac]) return whole ? `${whole}${fracMap[frac]}` : fracMap[frac];
  return `${n}`;
}

export function dayCalories(day) {
  return (day.meals || []).reduce((s, m) => s + (m.calories || 0), 0);
}

export function dayProtein(day) {
  return (day.meals || []).reduce((s, m) => s + (m.protein || 0), 0);
}

// Total protein / carbs / fat (grams) logged across the day's meals.
export function dayMacros(day) {
  return (day.meals || []).reduce(
    (a, m) => ({ protein: a.protein + (m.protein || 0), carbs: a.carbs + (m.carbs || 0), fat: a.fat + (m.fat || 0) }),
    { protein: 0, carbs: 0, fat: 0 },
  );
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
