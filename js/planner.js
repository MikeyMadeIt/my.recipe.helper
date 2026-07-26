/* ==========================================================================
   planner.js — weekly meal planner
   ========================================================================== */

const Planner = (() => {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MEALS = ['Breakfast', 'Lunch', 'Dinner'];
  let pickerTarget = null; // { day, meal }
  let bsPickerModal;

  function getPlan() {
    return Storage.getPlanner();
  }
  function savePlan(plan) {
    Storage.savePlanner(plan);
  }

  function slotHTML(day, meal) {
    const plan = getPlan();
    const recipeId = plan[day]?.[meal];
    const recipe = recipeId ? Recipes.getById(recipeId) : null;
    return `
    <div class="rk-planner-slot" data-day="${day}" data-meal="${meal}">
      <span class="rk-planner-meal-label">${meal}</span>
      ${recipe
        ? `<div class="rk-planner-recipe">
             <span>${rkEscapeHTML(recipe.name)}</span>
             <button type="button" class="btn btn-sm rk-btn-icon rk-ripple" data-clear-slot title="Remove"><i class="bi bi-x"></i></button>
           </div>`
        : `<button type="button" class="rk-planner-add rk-ripple" data-open-picker><i class="bi bi-plus-lg"></i> Add recipe</button>`}
    </div>`;
  }

  function render() {
    const wrap = document.getElementById('plannerGrid');
    if (!wrap) return;
    wrap.innerHTML = DAYS.map((day) => `
      <div class="rk-planner-day">
        <h6>${day}</h6>
        ${MEALS.map((meal) => slotHTML(day, meal)).join('')}
      </div>
    `).join('');
  }

  function openPicker(day, meal) {
    pickerTarget = { day, meal };
    const list = document.getElementById('plannerPickerList');
    const recipes = Recipes.all();
    list.innerHTML = recipes.length
      ? recipes.map((r) => `
          <button type="button" class="rk-planner-pick-item rk-ripple" data-pick-id="${r.id}">
            <span>${rkEscapeHTML(r.name)}</span>
            <small class="text-body-secondary">${rkEscapeHTML(r.category)}</small>
          </button>`).join('')
      : `<p class="text-body-secondary text-center py-3">Add some recipes first!</p>`;
    document.getElementById('plannerPickerTitle').textContent = `${meal} — ${day}`;
    bsPickerModal.show();
  }

  function assign(day, meal, recipeId) {
    const plan = getPlan();
    plan[day] = plan[day] || {};
    plan[day][meal] = recipeId;
    savePlan(plan);
    render();
  }

  function clearSlot(day, meal) {
    const plan = getPlan();
    if (plan[day]) delete plan[day][meal];
    savePlan(plan);
    render();
  }

  function init() {
    bsPickerModal = new bootstrap.Modal(document.getElementById('plannerPickerModal'));

    document.getElementById('plannerGrid')?.addEventListener('click', (e) => {
      const slot = e.target.closest('.rk-planner-slot');
      if (!slot) return;
      const { day, meal } = slot.dataset;
      if (e.target.closest('[data-open-picker]')) openPicker(day, meal);
      if (e.target.closest('[data-clear-slot]')) clearSlot(day, meal);
    });

    document.getElementById('plannerPickerList')?.addEventListener('click', (e) => {
      const item = e.target.closest('[data-pick-id]');
      if (!item || !pickerTarget) return;
      assign(pickerTarget.day, pickerTarget.meal, item.dataset.pickId);
      bsPickerModal.hide();
      Toast.show('Meal planned', 'success', 1600);
    });

    document.getElementById('plannerClearWeekBtn')?.addEventListener('click', async () => {
      const ok = await Confirm.ask({
        title: 'Clear the whole week?',
        message: 'All planned meals for this week will be removed.',
        okText: 'Clear week',
        okClass: 'btn-danger',
      });
      if (ok) { savePlan({}); render(); Toast.show('Meal planner cleared', 'info'); }
    });
  }

  return { init, render };
})();
