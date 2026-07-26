/* ==========================================================================
   shopping.js — shopping list: add ingredients from recipes, check off,
   remove, clear, export as text.
   ========================================================================== */

const Shopping = (() => {
  function getList() {
    return Storage.getShoppingList();
  }
  function saveList(list) {
    Storage.saveShoppingList(list);
  }

  function addFromRecipe(recipe, servings) {
    const list = getList();
    const scaled = Recipes.scaleIngredients(recipe.ingredients || [], recipe.servings || 1, servings || recipe.servings);
    scaled.forEach((ing) => {
      list.push({
        id: rkUid('shop'),
        name: ing.name,
        qty: ing.qty,
        unit: ing.unit,
        note: ing.note,
        recipeName: recipe.name,
        checked: false,
      });
    });
    saveList(list);
    render();
  }

  function addManual(name) {
    if (!name || !name.trim()) return;
    const list = getList();
    list.push({ id: rkUid('shop'), name: name.trim(), qty: '', unit: '', note: '', recipeName: '', checked: false });
    saveList(list);
    render();
  }

  function toggle(id) {
    const list = getList();
    const item = list.find((i) => i.id === id);
    if (item) item.checked = !item.checked;
    saveList(list);
    render();
  }

  function remove(id) {
    saveList(getList().filter((i) => i.id !== id));
    render();
  }

  async function clear() {
    if (!getList().length) return;
    const ok = await Confirm.ask({
      title: 'Clear shopping list?',
      message: 'All items on your shopping list will be removed.',
      okText: 'Clear list',
      okClass: 'btn-danger',
    });
    if (ok) { saveList([]); render(); Toast.show('Shopping list cleared', 'info'); }
  }

  function exportList() {
    const list = getList();
    if (!list.length) { Toast.show('Your shopping list is empty', 'warning'); return; }
    const lines = list.map((i) => `${i.checked ? '[x]' : '[ ]'} ${i.qty || ''} ${i.unit || ''} ${i.name}${i.note ? ` (${i.note})` : ''}`.replace(/\s+/g, ' ').trim());
    const text = `Shopping List — ${new Date().toLocaleDateString()}\n\n${lines.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Shopping list exported', 'success');
  }

  function itemRowHTML(item) {
    return `
    <li class="rk-shop-item ${item.checked ? 'checked' : ''}" data-id="${item.id}">
      <label class="rk-check-item flex-grow-1">
        <input type="checkbox" ${item.checked ? 'checked' : ''} data-toggle-shop="${item.id}">
        <span>
          <strong>${item.qty || ''} ${rkEscapeHTML(item.unit || '')}</strong> ${rkEscapeHTML(item.name)}
          ${item.recipeName ? `<small class="d-block text-body-secondary">from ${rkEscapeHTML(item.recipeName)}</small>` : ''}
        </span>
      </label>
      <button class="btn btn-sm rk-btn-icon rk-btn-danger rk-ripple" data-remove-shop="${item.id}" aria-label="Remove"><i class="bi bi-trash3"></i></button>
    </li>`;
  }

  function render() {
    const wrap = document.getElementById('shoppingListItems');
    if (!wrap) return;
    const list = getList();
    if (!list.length) {
      wrap.innerHTML = `<div class="rk-empty-state"><i class="bi bi-cart3"></i><h4>Your shopping list is empty</h4><p>Add ingredients from any recipe, or type an item below.</p></div>`;
    } else {
      wrap.innerHTML = list.map(itemRowHTML).join('');
    }
    const total = list.length;
    const checked = list.filter((i) => i.checked).length;
    const counter = document.getElementById('shoppingCounter');
    if (counter) counter.textContent = total ? `${checked}/${total} checked` : '';
  }

  function init() {
    document.getElementById('shoppingAddForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('shoppingManualInput');
      addManual(input.value);
      input.value = '';
      input.focus();
    });
    document.getElementById('shoppingClearBtn')?.addEventListener('click', clear);
    document.getElementById('shoppingExportBtn')?.addEventListener('click', exportList);
    document.getElementById('shoppingListItems')?.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-remove-shop]');
      if (removeBtn) return remove(removeBtn.dataset.removeShop);
    });
    document.getElementById('shoppingListItems')?.addEventListener('change', (e) => {
      const cb = e.target.closest('[data-toggle-shop]');
      if (cb) toggle(cb.dataset.toggleShop);
    });
  }

  return { init, render, addFromRecipe, addManual, toggle, remove, clear, exportList };
})();
