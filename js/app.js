/* ==========================================================================
   app.js — application shell: init, theme, toasts, confirm dialogs,
   dashboard stats, and recipe grid rendering.
   ========================================================================== */

/* ---------------------------- Toast notifications --------------------------- */
const Toast = (() => {
  let container;
  function ensureContainer() {
    if (container) return container;
    container = document.getElementById('toastStack');
    return container;
  }

  const ICONS = {
    success: 'bi-check-circle-fill',
    danger: 'bi-exclamation-octagon-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
  };

  function show(message, type = 'success', delay = 3200) {
    ensureContainer();
    if (!container) return;
    const el = document.createElement('div');
    el.className = `rk-toast rk-toast-${type}`;
    el.innerHTML = `
      <i class="bi ${ICONS[type] || ICONS.info}"></i>
      <span class="rk-toast-msg">${message}</span>
      <button type="button" class="rk-toast-close" aria-label="Close"><i class="bi bi-x"></i></button>
    `;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    const remove = () => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    };
    el.querySelector('.rk-toast-close').addEventListener('click', remove);
    const timer = setTimeout(remove, delay);
    el.addEventListener('mouseenter', () => clearTimeout(timer));
  }

  return { show };
})();

/* ---------------------------- Confirm dialog --------------------------- */
const Confirm = (() => {
  let modalEl, bsModal, resolveFn;

  function init() {
    modalEl = document.getElementById('confirmModal');
    if (!modalEl) return;
    bsModal = new bootstrap.Modal(modalEl);
    modalEl.querySelector('#confirmOkBtn').addEventListener('click', () => {
      bsModal.hide();
      if (resolveFn) resolveFn(true);
    });
    modalEl.addEventListener('hidden.bs.modal', () => {
      if (resolveFn) resolveFn(false);
      resolveFn = null;
    });
  }

  function ask({ title = 'Are you sure?', message = '', okText = 'Delete', okClass = 'btn-danger' } = {}) {
    return new Promise((resolve) => {
      resolveFn = resolve;
      modalEl.querySelector('#confirmTitle').textContent = title;
      modalEl.querySelector('#confirmMessage').textContent = message;
      const okBtn = modalEl.querySelector('#confirmOkBtn');
      okBtn.textContent = okText;
      okBtn.className = `btn ${okClass} rk-ripple`;
      bsModal.show();
    });
  }

  return { init, ask };
})();

/* ---------------------------- Theme management --------------------------- */
const ThemeManager = (() => {
  function apply(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.documentElement.setAttribute('data-rk-theme', theme);
    const icon = document.getElementById('themeToggleIcon');
    if (icon) icon.className = theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#12131c' : '#faf8f5');
  }

  function applyAccent(accent) {
    document.documentElement.setAttribute('data-rk-accent', accent || 'amber');
  }

  function toggle() {
    const settings = Storage.getSettings();
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    settings.theme = next;
    Storage.saveSettings(settings);
    Storage.saveTheme(next);
    apply(next);
    Toast.show(`Switched to ${next} mode`, 'info', 1800);
  }

  function init() {
    const settings = Storage.getSettings();
    apply(settings.theme || 'dark');
    applyAccent(settings.accent || 'amber');
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.addEventListener('click', toggle);
  }

  return { init, apply, applyAccent, toggle };
})();

/* ---------------------------- Ripple effect --------------------------- */
function initRippleEffect() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.rk-ripple');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'rk-ripple-effect';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

/* ---------------------------- Helpers --------------------------- */
function rkEscapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function rkFormatTime(mins) {
  mins = Number(mins) || 0;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function rkFormatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function rkDifficultyBadgeClass(diff) {
  return { Easy: 'rk-badge-easy', Medium: 'rk-badge-medium', Hard: 'rk-badge-hard' }[diff] || 'rk-badge-easy';
}

/* ---------------------------- Recipe card / grid rendering --------------------------- */
function recipeCardHTML(r) {
  const img = r.image
    ? `<img src="${r.image}" alt="${rkEscapeHTML(r.name)}" loading="lazy">`
    : `<div class="rk-card-noimg"><i class="bi bi-egg-fried"></i></div>`;
  return `
  <div class="col-12 col-sm-6 col-lg-4 col-xl-3 rk-fade-in" data-recipe-id="${r.id}">
    <div class="rk-card h-100" data-id="${r.id}">
      <div class="rk-card-img-wrap">
        ${img}
        <button type="button" class="rk-fav-btn ${r.favorite ? 'active' : ''}" data-action="toggle-fav" data-id="${r.id}" aria-label="Toggle favorite">
          <i class="bi ${r.favorite ? 'bi-heart-fill' : 'bi-heart'}"></i>
        </button>
        <span class="rk-badge-category">${rkEscapeHTML(r.category)}</span>
      </div>
      <div class="rk-card-body">
        <h3 class="rk-card-title">${rkEscapeHTML(r.name)}</h3>
        <div class="rk-card-meta">
          <span><i class="bi bi-alarm"></i> ${rkFormatTime(r.totalTime)}</span>
          <span><i class="bi bi-people"></i> ${r.servings}</span>
          <span class="rk-badge-diff ${rkDifficultyBadgeClass(r.difficulty)}">${r.difficulty}</span>
        </div>
        <div class="rk-card-actions">
          <button class="btn btn-sm rk-btn-view rk-ripple" data-action="view" data-id="${r.id}"><i class="bi bi-eye"></i> View</button>
          <button class="btn btn-sm rk-btn-icon rk-ripple" data-action="edit" data-id="${r.id}" aria-label="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm rk-btn-icon rk-btn-danger rk-ripple" data-action="delete" data-id="${r.id}" aria-label="Delete"><i class="bi bi-trash3"></i></button>
        </div>
      </div>
    </div>
  </div>`;
}

function emptyStateHTML(type = 'default') {
  const map = {
    default: { icon: 'bi-journal-plus', title: 'No recipes yet', msg: 'Start your personal cookbook by adding your very first recipe.' },
    search: { icon: 'bi-search', title: 'No matches found', msg: 'Try a different search term or clear your filters.' },
    favorites: { icon: 'bi-heart', title: 'No favorites yet', msg: 'Tap the heart on a recipe to save it here.' },
  };
  const s = map[type] || map.default;
  return `
    <div class="rk-empty-state rk-fade-in">
      <div class="rk-empty-state-icon"><i class="bi ${s.icon}"></i></div>
      <h4>${s.title}</h4>
      <p>${s.msg}</p>
      ${type === 'default' ? `<button class="btn rk-btn-primary rk-ripple" data-action="add-recipe"><i class="bi bi-plus-lg"></i> Add Recipe</button>` : ''}
    </div>`;
}

function skeletonGridHTML(count = 8) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
    <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
      <div class="rk-skeleton-card">
        <div class="rk-skeleton rk-skeleton-img"></div>
        <div class="rk-skeleton rk-skeleton-line w-75"></div>
        <div class="rk-skeleton rk-skeleton-line w-50"></div>
      </div>
    </div>`;
  }
  return html;
}

function renderRecipeGrid(list) {
  const grid = document.getElementById('recipeGrid');
  if (!grid) return;
  if (!list.length) {
    const hasAny = Recipes.all().length > 0;
    grid.innerHTML = emptyStateHTML(hasAny ? 'search' : 'default');
    return;
  }
  grid.innerHTML = list.map(recipeCardHTML).join('');
}

function animateCount(el, to) {
  if (!el) return;
  const from = 0;
  const duration = 700;
  const start = performance.now();
  function step(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderDashboardStats() {
  const s = Recipes.stats();
  animateCount(document.getElementById('statTotal'), s.total);
  animateCount(document.getElementById('statFavorites'), s.favorites);
  animateCount(document.getElementById('statRecent'), s.recentlyAdded.length);
  const cooked = Recipes.all().filter((r) => Recipes.recentlyCookedBucket(r) === 'Today').length;
  animateCount(document.getElementById('statCookedToday'), cooked);
}

/* ---------------------------- Main refresh cycle --------------------------- */
function App_refresh() {
  const list = FilterSort.apply(Recipes.all());
  renderRecipeGrid(list);
  renderDashboardStats();
}
document.addEventListener('rk:recipes-changed', App_refresh);
document.addEventListener('rk:filters-changed', App_refresh);

/* ---------------------------- Card action delegation --------------------------- */
function initGridDelegation() {
  const grids = ['recipeGrid', 'favoritesGrid', 'recentlyCookedList'];
  grids.forEach((gridId) => {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'toggle-fav') {
          Recipes.toggleFavorite(id);
          Toast.show('Favorite updated', 'success', 1500);
          return;
        }
        if (action === 'view') return RecipeModal.openView(id);
        if (action === 'edit') return RecipeModal.openEdit(id);
        if (action === 'delete') return deleteRecipeFlow(id);
        if (action === 'add-recipe') return RecipeModal.openAdd();
        return;
      }
      const card = e.target.closest('.rk-card');
      if (card) RecipeModal.openView(card.dataset.id);
    });
  });
}

async function deleteRecipeFlow(id) {
  const r = Recipes.getById(id);
  if (!r) return;
  const ok = await Confirm.ask({
    title: 'Delete recipe?',
    message: `"${r.name}" will be permanently removed. This can't be undone.`,
    okText: 'Delete',
    okClass: 'btn-danger',
  });
  if (ok) {
    Recipes.remove(id);
    Toast.show('Recipe deleted', 'danger', 2000);
    const modalEl = document.getElementById('viewRecipeModal');
    if (modalEl) {
      const inst = bootstrap.Modal.getInstance(modalEl);
      if (inst) inst.hide();
    }
  }
}

/* ---------------------------- Navigation / section switching --------------------------- */
function initSectionNav() {
  const links = document.querySelectorAll('[data-section-target]');
  const sections = document.querySelectorAll('.rk-section');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.sectionTarget;
      sections.forEach((s) => s.classList.toggle('d-none', s.id !== `section-${target}`));
      links.forEach((l) => l.classList.remove('active'));
      document.querySelectorAll(`[data-section-target="${target}"]`).forEach((l) => l.classList.add('active'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('navCollapse')?.classList.remove('show');
      if (target === 'favorites') FavoritesView.render();
      if (target === 'recently-cooked') RecentlyCookedView.render();
      if (target === 'planner') Planner.render();
      if (target === 'shopping') Shopping.render();
      if (target === 'settings') SettingsView.render();
    });
  });
}

/* ---------------------------- FAB --------------------------- */
function initFAB() {
  const fab = document.getElementById('fabAddRecipe');
  if (fab) fab.addEventListener('click', () => RecipeModal.openAdd());
}

/* ---------------------------- Loading screen --------------------------- */
function hideLoadingScreen() {
  const loader = document.getElementById('loadingScreen');
  if (!loader) return;
  setTimeout(() => {
    loader.classList.add('rk-loader-hide');
    setTimeout(() => loader.remove(), 600);
  }, 500);
}

/* ---------------------------- Favorites & Recently Cooked views --------------------------- */
const FavoritesView = (() => {
  function render() {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;
    const favs = Recipes.all().filter((r) => r.favorite);
    grid.innerHTML = favs.length ? favs.map(recipeCardHTML).join('') : emptyStateHTML('favorites');
  }
  return { render };
})();

const RecentlyCookedView = (() => {
  function render() {
    const wrap = document.getElementById('recentlyCookedList');
    if (!wrap) return;
    const buckets = { Today: [], Yesterday: [], 'Last Week': [] };
    Recipes.all().forEach((r) => {
      const b = Recipes.recentlyCookedBucket(r);
      if (b && buckets[b]) buckets[b].push(r);
    });
    const sections = Object.entries(buckets)
      .filter(([, list]) => list.length)
      .map(([label, list]) => `
        <div class="rk-cooked-bucket">
          <h6>${label}</h6>
          <div class="row g-3">${list.map(recipeCardHTML).join('')}</div>
        </div>`).join('');
    wrap.innerHTML = sections || `<p class="text-body-secondary text-center py-4">Nothing cooked recently — open a recipe to mark it as cooked.</p>`;
  }
  return { render };
})();
document.addEventListener('rk:recipes-changed', () => { FavoritesView.render(); RecentlyCookedView.render(); });

/* ---------------------------- Init --------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  Recipes.seedIfEmpty();
  ThemeManager.init();
  Confirm.init();
  initRippleEffect();
  initGridDelegation();
  initSectionNav();
  initFAB();
  RecipeModal.init();
  Search.init();
  FilterSort.init();
  Planner.init();
  Shopping.init();
  SettingsView.init();
  Timers.init();
  CookMode.init();

  App_refresh();
  hideLoadingScreen();

  // Welcome message with time-of-day greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const el = document.getElementById('welcomeGreeting');
  if (el) el.textContent = `${greeting}, chef 👋`;
});
