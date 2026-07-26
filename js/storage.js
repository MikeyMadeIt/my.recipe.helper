/* ==========================================================================
   storage.js — localStorage persistence layer
   Everything the app persists goes through this module. No other module
   should call localStorage directly.
   ========================================================================== */

const RK_KEYS = {
  RECIPES: 'rk_recipes',
  SHOPPING: 'rk_shopping_list',
  PLANNER: 'rk_meal_planner',
  SETTINGS: 'rk_settings',
  THEME: 'rk_theme',
};

const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: 'amber',
  defaultUnit: 'cup',
  defaultServings: 4,
  animations: true,
  autoSave: true,
};

const Storage = (() => {
  function _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Storage read error for', key, e);
      return fallback;
    }
  }

  function _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage write error for', key, e);
      if (window.Toast) {
        Toast.show('Storage is full — free up space to keep saving.', 'danger');
      }
      return false;
    }
  }

  // ---- Recipes -----------------------------------------------------------
  function getRecipes() {
    return _read(RK_KEYS.RECIPES, []);
  }
  function saveRecipes(recipes) {
    return _write(RK_KEYS.RECIPES, recipes);
  }

  // ---- Shopping list -------------------------------------------------------
  function getShoppingList() {
    return _read(RK_KEYS.SHOPPING, []);
  }
  function saveShoppingList(list) {
    return _write(RK_KEYS.SHOPPING, list);
  }

  // ---- Meal planner --------------------------------------------------------
  function getPlanner() {
    return _read(RK_KEYS.PLANNER, {});
  }
  function savePlanner(planner) {
    return _write(RK_KEYS.PLANNER, planner);
  }

  // ---- Settings --------------------------------------------------------
  function getSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, _read(RK_KEYS.SETTINGS, {}));
  }
  function saveSettings(settings) {
    return _write(RK_KEYS.SETTINGS, settings);
  }

  // ---- Theme -------------------------------------------------------------
  function getTheme() {
    return localStorage.getItem(RK_KEYS.THEME) || 'dark';
  }
  function saveTheme(theme) {
    localStorage.setItem(RK_KEYS.THEME, theme);
  }

  // ---- Backup / restore ----------------------------------------------------
  function exportAll() {
    return {
      exportedAt: new Date().toISOString(),
      app: 'Recipe Keeper',
      version: 1,
      recipes: getRecipes(),
      shoppingList: getShoppingList(),
      planner: getPlanner(),
      settings: getSettings(),
    };
  }

  function importAll(data) {
    if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
    if (Array.isArray(data.recipes)) saveRecipes(data.recipes);
    if (Array.isArray(data.shoppingList)) saveShoppingList(data.shoppingList);
    if (data.planner && typeof data.planner === 'object') savePlanner(data.planner);
    if (data.settings && typeof data.settings === 'object') saveSettings(data.settings);
    return true;
  }

  function resetAll() {
    Object.values(RK_KEYS).forEach((k) => localStorage.removeItem(k));
  }

  // ---- Diagnostics -----------------------------------------------------
  function isAvailable() {
    const testKey = '__rk_storage_test__';
    try {
      localStorage.setItem(testKey, '1');
      const ok = localStorage.getItem(testKey) === '1';
      localStorage.removeItem(testKey);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function isFileProtocol() {
    return typeof location !== 'undefined' && location.protocol === 'file:';
  }

  return {
    getRecipes, saveRecipes,
    getShoppingList, saveShoppingList,
    getPlanner, savePlanner,
    getSettings, saveSettings,
    getTheme, saveTheme,
    exportAll, importAll, resetAll,
    isAvailable, isFileProtocol,
    KEYS: RK_KEYS,
    DEFAULT_SETTINGS,
  };
})();
