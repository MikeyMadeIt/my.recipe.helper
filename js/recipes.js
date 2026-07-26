/* ==========================================================================
   recipes.js — recipe data model + CRUD operations
   ========================================================================== */

const CATEGORIES = [
  'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Soup', 'Pasta',
  'Noodles', 'Filipino', 'Asian', 'Western', 'Seafood', 'Chicken', 'Beef',
  'Pork', 'Vegetarian', 'Drinks', 'Sauces', 'Others',
];

const MEASUREMENTS = [
  'tsp', 'tbsp', 'cup', 'cups', 'ml', 'L', 'g', 'kg', 'oz', 'lb', 'pcs',
  'slice', 'cloves', 'can', 'pack', 'bottle', 'pinch', 'dash', 'handful', 'stick',
];

const INGREDIENT_SUGGESTIONS = [
  'Chicken', 'Beef', 'Pork', 'Fish', 'Shrimp', 'Egg', 'Rice', 'Flour',
  'Sugar', 'Salt', 'Pepper', 'Garlic', 'Onion', 'Butter', 'Milk', 'Cheese',
  'Soy Sauce', 'Vinegar', 'Cooking Oil', 'Tomato', 'Potato', 'Carrot', 'Bell Pepper',
];

const TAG_SUGGESTIONS = [
  'Quick', 'Easy', 'Budget Meal', 'Healthy', 'Spicy', 'Sweet', 'Savory',
  'Family Favorite', 'Holiday', 'Party', 'Meal Prep', 'Comfort Food',
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function rkUid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function rkNowISO() {
  return new Date().toISOString();
}

const Recipes = (() => {
  let cache = null;

  function all() {
    if (!cache) cache = Storage.getRecipes();
    return cache;
  }

  function persist() {
    Storage.saveRecipes(cache || []);
    document.dispatchEvent(new CustomEvent('rk:recipes-changed'));
  }

  function getById(id) {
    return all().find((r) => r.id === id);
  }

  function blankRecipe() {
    return {
      id: rkUid('recipe'),
      name: '',
      category: 'Others',
      description: '',
      prepTime: 0,
      cookTime: 0,
      servings: Storage.getSettings().defaultServings || 4,
      difficulty: 'Easy',
      image: '',
      ingredients: [],
      instructions: [],
      notes: '',
      tags: [],
      favorite: false,
      dateCreated: rkNowISO(),
      dateUpdated: rkNowISO(),
      lastCooked: null,
    };
  }

  function create(recipe) {
    const list = all();
    recipe.id = recipe.id || rkUid('recipe');
    recipe.dateCreated = rkNowISO();
    recipe.dateUpdated = rkNowISO();
    recipe.totalTime = (Number(recipe.prepTime) || 0) + (Number(recipe.cookTime) || 0);
    list.push(recipe);
    persist();
    return recipe;
  }

  function update(id, patch) {
    const list = all();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const updated = Object.assign({}, list[idx], patch, { id });
    updated.totalTime = (Number(updated.prepTime) || 0) + (Number(updated.cookTime) || 0);
    updated.dateUpdated = rkNowISO();
    list[idx] = updated;
    persist();
    return updated;
  }

  function remove(id) {
    cache = all().filter((r) => r.id !== id);
    persist();
  }

  function toggleFavorite(id) {
    const r = getById(id);
    if (!r) return;
    update(id, { favorite: !r.favorite });
  }

  function markCooked(id) {
    update(id, { lastCooked: rkNowISO() });
  }

  function stats() {
    const list = all();
    return {
      total: list.length,
      favorites: list.filter((r) => r.favorite).length,
      recentlyAdded: [...list]
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
        .slice(0, 5),
    };
  }

  function recentlyCookedBucket(recipe) {
    if (!recipe.lastCooked) return null;
    const last = new Date(recipe.lastCooked);
    const now = new Date();
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((startOfDay(now) - startOfDay(last)) / 86400000);
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return 'Last Week';
    return 'Earlier';
  }

  function scaleIngredients(ingredients, originalServings, newServings) {
    const factor = (Number(newServings) || 1) / (Number(originalServings) || 1);
    return ingredients.map((ing) => {
      const qty = parseFloat(ing.qty);
      if (isNaN(qty)) return Object.assign({}, ing);
      const scaled = qty * factor;
      const rounded = Math.round(scaled * 100) / 100;
      return Object.assign({}, ing, { qty: rounded });
    });
  }

  function seedIfEmpty() {
    if (all().length > 0) return;
    const seeds = [
      {
        name: 'Chicken Adobo',
        category: 'Filipino',
        description: 'Classic Filipino braised chicken in soy sauce, vinegar, and garlic.',
        prepTime: 15, cookTime: 40, servings: 4, difficulty: 'Easy',
        image: '',
        ingredients: [
          { id: rkUid('ing'), qty: 1, unit: 'kg', name: 'Chicken thighs', note: 'bone-in' },
          { id: rkUid('ing'), qty: 0.5, unit: 'cup', name: 'Soy Sauce', note: '' },
          { id: rkUid('ing'), qty: 0.25, unit: 'cup', name: 'Vinegar', note: '' },
          { id: rkUid('ing'), qty: 6, unit: 'cloves', name: 'Garlic', note: 'crushed' },
          { id: rkUid('ing'), qty: 2, unit: 'pcs', name: 'Bay leaves', note: '' },
        ],
        instructions: [
          { id: rkUid('step'), step: 1, text: 'Combine chicken, soy sauce, vinegar, garlic, and bay leaves in a pot. Marinate 15 minutes.', image: '', timerMinutes: 15 },
          { id: rkUid('step'), step: 2, text: 'Bring to a boil, then simmer uncovered for 25 minutes.', image: '', timerMinutes: 25 },
          { id: rkUid('step'), step: 3, text: 'Simmer until sauce thickens, about 15 minutes more.', image: '', timerMinutes: 15 },
        ],
        notes: 'Use less salt next time — soy sauce is salty enough.',
        tags: ['Family Favorite', 'Savory', 'Comfort Food'],
        favorite: true,
        lastCooked: rkNowISO(),
      },
      {
        name: 'Garlic Butter Shrimp',
        category: 'Seafood',
        description: 'Quick pan-seared shrimp in garlic butter sauce.',
        prepTime: 10, cookTime: 10, servings: 2, difficulty: 'Easy',
        image: '',
        ingredients: [
          { id: rkUid('ing'), qty: 500, unit: 'g', name: 'Shrimp', note: 'peeled, deveined' },
          { id: rkUid('ing'), qty: 4, unit: 'tbsp', name: 'Butter', note: '' },
          { id: rkUid('ing'), qty: 4, unit: 'cloves', name: 'Garlic', note: 'minced' },
          { id: rkUid('ing'), qty: 1, unit: 'pcs', name: 'Bell Pepper', note: 'sliced' },
        ],
        instructions: [
          { id: rkUid('step'), step: 1, text: 'Melt butter in a pan over medium heat, add garlic until fragrant.', image: '', timerMinutes: 2 },
          { id: rkUid('step'), step: 2, text: 'Add shrimp and bell pepper, cook until shrimp turns pink.', image: '', timerMinutes: '5-7' },
        ],
        notes: '',
        tags: ['Quick', 'Easy', 'Spicy'],
        favorite: false,
        lastCooked: null,
      },
      {
        name: 'Classic Pancakes',
        category: 'Breakfast',
        description: 'Fluffy homemade pancakes for a weekend breakfast.',
        prepTime: 10, cookTime: 15, servings: 4, difficulty: 'Easy',
        image: '',
        ingredients: [
          { id: rkUid('ing'), qty: 2, unit: 'cups', name: 'Flour', note: 'sifted' },
          { id: rkUid('ing'), qty: 2, unit: 'pcs', name: 'Egg', note: '' },
          { id: rkUid('ing'), qty: 1.5, unit: 'cups', name: 'Milk', note: '' },
          { id: rkUid('ing'), qty: 3, unit: 'tbsp', name: 'Sugar', note: '' },
        ],
        instructions: [
          { id: rkUid('step'), step: 1, text: 'Whisk dry ingredients together in a bowl.', image: '', timerMinutes: 0 },
          { id: rkUid('step'), step: 2, text: 'Add egg and milk, mix until just combined.', image: '', timerMinutes: 0 },
          { id: rkUid('step'), step: 3, text: 'Cook on a greased griddle, 2 minutes per side.', image: '', timerMinutes: 2 },
        ],
        notes: 'Kids prefer extra syrup on top.',
        tags: ['Family Favorite', 'Sweet'],
        favorite: true,
        lastCooked: null,
      },
    ];
    seeds.forEach((s) => create(Object.assign(blankRecipe(), s, { id: rkUid('recipe') })));
  }

  return {
    all, getById, blankRecipe, create, update, remove,
    toggleFavorite, markCooked, stats, recentlyCookedBucket,
    scaleIngredients, seedIfEmpty,
  };
})();
