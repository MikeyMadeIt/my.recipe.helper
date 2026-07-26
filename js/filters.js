/* ==========================================================================
   filters.js — filtering and sorting of the recipe list
   ========================================================================== */

const FilterSort = (() => {
  const state = {
    query: '',
    category: 'All',
    difficulty: 'All',
    maxPrep: null,
    maxCook: null,
    favoritesOnly: false,
    sort: 'newest',
  };

  function apply(list) {
    let out = list.filter((r) => Search.matches(r, state.query));

    if (state.category !== 'All') out = out.filter((r) => r.category === state.category);
    if (state.difficulty !== 'All') out = out.filter((r) => r.difficulty === state.difficulty);
    if (state.maxPrep) out = out.filter((r) => (Number(r.prepTime) || 0) <= state.maxPrep);
    if (state.maxCook) out = out.filter((r) => (Number(r.cookTime) || 0) <= state.maxCook);
    if (state.favoritesOnly) out = out.filter((r) => r.favorite);

    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      newest: (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated),
      oldest: (a, b) => new Date(a.dateCreated) - new Date(b.dateCreated),
      cookTime: (a, b) => (Number(a.cookTime) || 0) - (Number(b.cookTime) || 0),
      prepTime: (a, b) => (Number(a.prepTime) || 0) - (Number(b.prepTime) || 0),
      favorite: (a, b) => Number(b.favorite) - Number(a.favorite),
      recentlyCooked: (a, b) => new Date(b.lastCooked || 0) - new Date(a.lastCooked || 0),
    };
    out = [...out].sort(sorters[state.sort] || sorters.newest);
    return out;
  }

  function populateCategoryFilter() {
    const sel = document.getElementById('filterCategory');
    if (!sel) return;
    const cats = ['All', ...CATEGORIES];
    sel.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join('');
  }

  function updateActiveBadge() {
    const badge = document.getElementById('filterActiveBadge');
    if (!badge) return;
    let count = 0;
    if (state.category !== 'All') count++;
    if (state.difficulty !== 'All') count++;
    if (state.maxPrep) count++;
    if (state.maxCook) count++;
    if (state.favoritesOnly) count++;
    badge.textContent = count;
    badge.classList.toggle('d-none', count === 0);
  }

  function init() {
    populateCategoryFilter();

    document.getElementById('filterApplyBtn')?.addEventListener('click', () => {
      state.category = document.getElementById('filterCategory').value;
      state.difficulty = document.getElementById('filterDifficulty').value;
      const maxPrep = document.getElementById('filterMaxPrep').value;
      const maxCook = document.getElementById('filterMaxCook').value;
      state.maxPrep = maxPrep ? Number(maxPrep) : null;
      state.maxCook = maxCook ? Number(maxCook) : null;
      state.favoritesOnly = document.getElementById('filterFavoritesOnly').checked;
      updateActiveBadge();
      document.dispatchEvent(new CustomEvent('rk:filters-changed'));
      bootstrap.Offcanvas.getInstance(document.getElementById('filterOffcanvas'))?.hide();
      Toast.show('Filters applied', 'info', 1500);
    });

    document.getElementById('filterResetBtn')?.addEventListener('click', () => {
      state.category = 'All'; state.difficulty = 'All'; state.maxPrep = null; state.maxCook = null; state.favoritesOnly = false;
      document.getElementById('filterCategory').value = 'All';
      document.getElementById('filterDifficulty').value = 'All';
      document.getElementById('filterMaxPrep').value = '';
      document.getElementById('filterMaxCook').value = '';
      document.getElementById('filterFavoritesOnly').checked = false;
      updateActiveBadge();
      document.dispatchEvent(new CustomEvent('rk:filters-changed'));
      Toast.show('Filters cleared', 'info', 1500);
    });

    document.querySelectorAll('[data-sort-option]').forEach((opt) => {
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        state.sort = opt.dataset.sortOption;
        document.querySelectorAll('[data-sort-option]').forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        const label = document.getElementById('sortLabel');
        if (label) label.textContent = opt.textContent.trim();
        document.dispatchEvent(new CustomEvent('rk:filters-changed'));
      });
    });
  }

  return { state, apply, init };
})();
