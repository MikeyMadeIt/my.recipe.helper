/* ==========================================================================
   search.js — instant recipe search
   ========================================================================== */

const Search = (() => {
  let debounceTimer;

  function matches(recipe, query) {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystacks = [
      recipe.name,
      recipe.category,
      recipe.description,
      ...(recipe.tags || []),
      ...(recipe.ingredients || []).map((i) => i.name),
    ];
    return haystacks.some((h) => (h || '').toLowerCase().includes(q));
  }

  function init() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    if (!input) return;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const wrap = input.closest('.rk-search-wrap');
      wrap?.classList.add('rk-searching');
      if (clearBtn) clearBtn.classList.toggle('d-none', !input.value);
      debounceTimer = setTimeout(() => {
        FilterSort.state.query = input.value;
        wrap?.classList.remove('rk-searching');
        document.dispatchEvent(new CustomEvent('rk:filters-changed'));
      }, 180);
    });

    clearBtn?.addEventListener('click', () => {
      input.value = '';
      FilterSort.state.query = '';
      clearBtn.classList.add('d-none');
      document.dispatchEvent(new CustomEvent('rk:filters-changed'));
      input.focus();
    });
  }

  return { init, matches };
})();
