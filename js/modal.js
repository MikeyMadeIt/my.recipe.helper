/* ==========================================================================
   modal.js — Add/Edit recipe modal (ingredient + instruction builders,
   image upload, tags) and the View recipe modal (details, print, cook mode
   launcher, servings calculator).
   ========================================================================== */

const RecipeModal = (() => {
  let editingId = null;
  let ingredients = [];
  let instructions = [];
  let tags = [];
  let imageData = '';
  let bsEditModal, bsViewModal;
  let currentViewId = null;
  let viewServings = null;

  /* ------------------------- Ingredient builder ------------------------- */
  function ingredientRowHTML(ing, idx) {
    const measurementOptions = MEASUREMENTS.map(
      (m) => `<option value="${m}" ${ing.unit === m ? 'selected' : ''}>${m}</option>`
    ).join('');
    const isCustomUnit = ing.unit && !MEASUREMENTS.includes(ing.unit);
    return `
    <div class="rk-builder-row" data-ing-id="${ing.id}">
      <div class="rk-builder-row-grip"><i class="bi bi-grip-vertical"></i></div>
      <div class="row g-2 flex-grow-1 align-items-center">
        <div class="col-3 col-md-2">
          <input type="number" step="any" min="0" class="form-control form-control-sm rk-ing-qty" placeholder="Qty" value="${ing.qty ?? ''}">
        </div>
        <div class="col-4 col-md-3">
          <select class="form-select form-select-sm rk-ing-unit">
            ${measurementOptions}
            <option value="__custom__" ${isCustomUnit ? 'selected' : ''}>Custom…</option>
          </select>
          <input type="text" class="form-control form-control-sm rk-ing-unit-custom mt-1 ${isCustomUnit ? '' : 'd-none'}" placeholder="Unit" value="${isCustomUnit ? rkEscapeHTML(ing.unit) : ''}">
        </div>
        <div class="col-5 col-md-4">
          <input type="text" list="ingredientSuggestions" class="form-control form-control-sm rk-ing-name" placeholder="Ingredient name" value="${rkEscapeHTML(ing.name || '')}">
        </div>
        <div class="col-12 col-md-3">
          <input type="text" class="form-control form-control-sm rk-ing-note" placeholder="Note (optional)" value="${rkEscapeHTML(ing.note || '')}">
        </div>
      </div>
      <div class="rk-builder-row-actions">
        <button type="button" class="btn btn-sm rk-btn-icon rk-ripple" data-move="up" title="Move up"><i class="bi bi-chevron-up"></i></button>
        <button type="button" class="btn btn-sm rk-btn-icon rk-ripple" data-move="down" title="Move down"><i class="bi bi-chevron-down"></i></button>
        <button type="button" class="btn btn-sm rk-btn-icon rk-btn-danger rk-ripple" data-remove-ing title="Remove"><i class="bi bi-x-lg"></i></button>
      </div>
    </div>`;
  }

  function renderIngredients() {
    const wrap = document.getElementById('ingredientBuilder');
    if (!wrap) return;
    wrap.innerHTML = ingredients.length
      ? ingredients.map(ingredientRowHTML).join('')
      : `<p class="rk-builder-empty">No ingredients yet — add your first one below.</p>`;
  }

  function syncIngredientFromRow(row) {
    const id = row.dataset.ingId;
    const ing = ingredients.find((i) => i.id === id);
    if (!ing) return;
    ing.qty = row.querySelector('.rk-ing-qty').value;
    const unitSel = row.querySelector('.rk-ing-unit').value;
    ing.unit = unitSel === '__custom__' ? row.querySelector('.rk-ing-unit-custom').value : unitSel;
    ing.name = row.querySelector('.rk-ing-name').value;
    ing.note = row.querySelector('.rk-ing-note').value;
  }

  function initIngredientBuilder() {
    document.getElementById('addIngredientBtn')?.addEventListener('click', () => {
      ingredients.push({ id: rkUid('ing'), qty: '', unit: 'cup', name: '', note: '' });
      renderIngredients();
      document.querySelector('#ingredientBuilder .rk-builder-row:last-child .rk-ing-qty')?.focus();
    });

    const wrap = document.getElementById('ingredientBuilder');
    wrap?.addEventListener('input', (e) => {
      const row = e.target.closest('.rk-builder-row');
      if (!row) return;
      if (e.target.classList.contains('rk-ing-unit')) {
        row.querySelector('.rk-ing-unit-custom').classList.toggle('d-none', e.target.value !== '__custom__');
      }
      syncIngredientFromRow(row);
    });

    wrap?.addEventListener('click', (e) => {
      const row = e.target.closest('.rk-builder-row');
      if (!row) return;
      const id = row.dataset.ingId;
      if (e.target.closest('[data-remove-ing]')) {
        ingredients = ingredients.filter((i) => i.id !== id);
        renderIngredients();
      } else if (e.target.closest('[data-move="up"]')) {
        const idx = ingredients.findIndex((i) => i.id === id);
        if (idx > 0) [ingredients[idx - 1], ingredients[idx]] = [ingredients[idx], ingredients[idx - 1]];
        renderIngredients();
      } else if (e.target.closest('[data-move="down"]')) {
        const idx = ingredients.findIndex((i) => i.id === id);
        if (idx < ingredients.length - 1) [ingredients[idx + 1], ingredients[idx]] = [ingredients[idx], ingredients[idx + 1]];
        renderIngredients();
      }
    });
  }

  /* ------------------------- Instruction builder ------------------------- */
  function instructionRowHTML(step, idx) {
    return `
    <div class="rk-builder-row rk-builder-row-step" data-step-id="${step.id}">
      <div class="rk-step-number">${idx + 1}</div>
      <div class="flex-grow-1">
        <textarea class="form-control form-control-sm rk-step-text mb-2" rows="2" placeholder="Describe this step…">${rkEscapeHTML(step.text || '')}</textarea>
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <div class="input-group input-group-sm rk-step-time-group">
            <span class="input-group-text"><i class="bi bi-stopwatch"></i></span>
            <input type="number" min="0" class="form-control rk-step-time" placeholder="Minutes" value="${step.timerMinutes || ''}">
          </div>
          <label class="btn btn-sm rk-btn-icon rk-ripple mb-0" title="Add step image">
            <i class="bi bi-image"></i>
            <input type="file" accept="image/*" class="d-none rk-step-image-input">
          </label>
          ${step.image ? `<img src="${step.image}" class="rk-step-thumb" alt="Step image"><button type="button" class="btn btn-sm rk-btn-icon rk-btn-danger rk-ripple" data-remove-step-img><i class="bi bi-image-alt"></i></button>` : ''}
        </div>
      </div>
      <div class="rk-builder-row-actions">
        <button type="button" class="btn btn-sm rk-btn-icon rk-ripple" data-move-step="up" title="Move up"><i class="bi bi-chevron-up"></i></button>
        <button type="button" class="btn btn-sm rk-btn-icon rk-ripple" data-move-step="down" title="Move down"><i class="bi bi-chevron-down"></i></button>
        <button type="button" class="btn btn-sm rk-btn-icon rk-btn-danger rk-ripple" data-remove-step title="Remove"><i class="bi bi-x-lg"></i></button>
      </div>
    </div>`;
  }

  function renderInstructions() {
    const wrap = document.getElementById('instructionBuilder');
    if (!wrap) return;
    wrap.innerHTML = instructions.length
      ? instructions.map(instructionRowHTML).join('')
      : `<p class="rk-builder-empty">No steps yet — add your first cooking step below.</p>`;
  }

  function syncInstructionFromRow(row) {
    const id = row.dataset.stepId;
    const step = instructions.find((s) => s.id === id);
    if (!step) return;
    step.text = row.querySelector('.rk-step-text').value;
    step.timerMinutes = Number(row.querySelector('.rk-step-time').value) || 0;
  }

  function initInstructionBuilder() {
    document.getElementById('addInstructionBtn')?.addEventListener('click', () => {
      instructions.push({ id: rkUid('step'), step: instructions.length + 1, text: '', image: '', timerMinutes: 0 });
      renderInstructions();
      document.querySelector('#instructionBuilder .rk-builder-row-step:last-child .rk-step-text')?.focus();
    });

    const wrap = document.getElementById('instructionBuilder');
    wrap?.addEventListener('input', (e) => {
      const row = e.target.closest('.rk-builder-row-step');
      if (row) syncInstructionFromRow(row);
    });

    wrap?.addEventListener('change', (e) => {
      if (e.target.classList.contains('rk-step-image-input')) {
        const row = e.target.closest('.rk-builder-row-step');
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const step = instructions.find((s) => s.id === row.dataset.stepId);
          if (step) { step.image = reader.result; renderInstructions(); }
        };
        reader.readAsDataURL(file);
      }
    });

    wrap?.addEventListener('click', (e) => {
      const row = e.target.closest('.rk-builder-row-step');
      if (!row) return;
      const id = row.dataset.stepId;
      if (e.target.closest('[data-remove-step]')) {
        instructions = instructions.filter((s) => s.id !== id);
        instructions.forEach((s, i) => (s.step = i + 1));
        renderInstructions();
      } else if (e.target.closest('[data-remove-step-img]')) {
        const step = instructions.find((s) => s.id === id);
        if (step) { step.image = ''; renderInstructions(); }
      } else if (e.target.closest('[data-move-step="up"]')) {
        const idx = instructions.findIndex((s) => s.id === id);
        if (idx > 0) [instructions[idx - 1], instructions[idx]] = [instructions[idx], instructions[idx - 1]];
        instructions.forEach((s, i) => (s.step = i + 1));
        renderInstructions();
      } else if (e.target.closest('[data-move-step="down"]')) {
        const idx = instructions.findIndex((s) => s.id === id);
        if (idx < instructions.length - 1) [instructions[idx + 1], instructions[idx]] = [instructions[idx], instructions[idx + 1]];
        instructions.forEach((s, i) => (s.step = i + 1));
        renderInstructions();
      }
    });
  }

  /* ------------------------- Tags ------------------------- */
  function renderTags() {
    const wrap = document.getElementById('tagChipList');
    if (!wrap) return;
    wrap.innerHTML = tags.map((t) => `
      <span class="rk-chip">${rkEscapeHTML(t)} <button type="button" data-remove-tag="${rkEscapeHTML(t)}" aria-label="Remove tag"><i class="bi bi-x"></i></button></span>
    `).join('');
  }

  function addTag(value) {
    const v = value.trim();
    if (!v || tags.includes(v)) return;
    tags.push(v);
    renderTags();
  }

  function renderTagSuggestions() {
    const wrap = document.getElementById('tagSuggestionList');
    if (!wrap) return;
    wrap.innerHTML = TAG_SUGGESTIONS.map((t) => `<button type="button" class="rk-suggestion-chip" data-tag-suggestion="${rkEscapeHTML(t)}">${rkEscapeHTML(t)}</button>`).join('');
  }

  function initTags() {
    renderTagSuggestions();
    const input = document.getElementById('tagInput');
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(input.value.replace(/,/g, ''));
        input.value = '';
      }
    });
    document.getElementById('tagChipList')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-tag]');
      if (btn) { tags = tags.filter((t) => t !== btn.dataset.removeTag); renderTags(); }
    });
    document.querySelectorAll('[data-tag-suggestion]').forEach((chip) => {
      chip.addEventListener('click', () => addTag(chip.dataset.tagSuggestion));
    });
  }

  /* ------------------------- Category (with custom) ------------------------- */
  function populateCategorySelect() {
    const sel = document.getElementById('recipeCategory');
    if (!sel) return;
    sel.innerHTML = CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('') +
      `<option value="__custom__">Custom…</option>`;
  }

  function initCategoryCustom() {
    const sel = document.getElementById('recipeCategory');
    const custom = document.getElementById('recipeCategoryCustom');
    sel?.addEventListener('change', () => {
      custom.classList.toggle('d-none', sel.value !== '__custom__');
      if (sel.value === '__custom__') custom.focus();
    });
  }

  /* ------------------------- Image upload ------------------------- */
  function initImageUpload() {
    const input = document.getElementById('recipeImageInput');
    const preview = document.getElementById('recipeImagePreview');
    input?.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        imageData = reader.result;
        preview.src = imageData;
        preview.classList.remove('d-none');
        document.getElementById('recipeImagePlaceholder')?.classList.add('d-none');
      };
      reader.readAsDataURL(file);
    });
    document.getElementById('removeRecipeImageBtn')?.addEventListener('click', () => {
      imageData = '';
      input.value = '';
      preview.classList.add('d-none');
      document.getElementById('recipeImagePlaceholder')?.classList.remove('d-none');
    });
  }

  /* ------------------------- Form open/reset/save ------------------------- */
  function resetForm() {
    editingId = null;
    ingredients = [];
    instructions = [];
    tags = [];
    imageData = '';
    document.getElementById('recipeForm')?.reset();
    document.getElementById('recipeImagePreview')?.classList.add('d-none');
    document.getElementById('recipeImagePlaceholder')?.classList.remove('d-none');
    document.getElementById('recipeCategoryCustom')?.classList.add('d-none');
    renderIngredients();
    renderInstructions();
    renderTags();
  }

  function openAdd() {
    resetForm();
    document.getElementById('recipeModalTitle').innerHTML = '<i class="bi bi-journal-plus"></i> Add Recipe';
    document.getElementById('recipeServings').value = Storage.getSettings().defaultServings || 4;
    bsEditModal.show();
  }

  function openEdit(id) {
    const r = Recipes.getById(id);
    if (!r) return;
    resetForm();
    editingId = id;
    ingredients = (r.ingredients || []).map((i) => Object.assign({}, i));
    instructions = (r.instructions || []).map((s) => Object.assign({}, s));
    tags = [...(r.tags || [])];
    imageData = r.image || '';

    document.getElementById('recipeModalTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Edit Recipe';
    document.getElementById('recipeName').value = r.name;
    const sel = document.getElementById('recipeCategory');
    if (CATEGORIES.includes(r.category)) {
      sel.value = r.category;
    } else {
      sel.value = '__custom__';
      document.getElementById('recipeCategoryCustom').classList.remove('d-none');
      document.getElementById('recipeCategoryCustom').value = r.category;
    }
    document.getElementById('recipeDescription').value = r.description || '';
    document.getElementById('recipePrep').value = r.prepTime || 0;
    document.getElementById('recipeCook').value = r.cookTime || 0;
    document.getElementById('recipeServings').value = r.servings || 1;
    document.getElementById('recipeDifficulty').value = r.difficulty || 'Easy';
    document.getElementById('recipeNotes').value = r.notes || '';
    document.getElementById('recipeFavoriteToggle').checked = !!r.favorite;

    if (imageData) {
      document.getElementById('recipeImagePreview').src = imageData;
      document.getElementById('recipeImagePreview').classList.remove('d-none');
      document.getElementById('recipeImagePlaceholder').classList.add('d-none');
    }

    renderIngredients();
    renderInstructions();
    renderTags();
    bsEditModal.show();
  }

  function collectFormData() {
    const sel = document.getElementById('recipeCategory');
    const category = sel.value === '__custom__' ? (document.getElementById('recipeCategoryCustom').value.trim() || 'Others') : sel.value;
    return {
      name: document.getElementById('recipeName').value.trim(),
      category,
      description: document.getElementById('recipeDescription').value.trim(),
      prepTime: Number(document.getElementById('recipePrep').value) || 0,
      cookTime: Number(document.getElementById('recipeCook').value) || 0,
      servings: Number(document.getElementById('recipeServings').value) || 1,
      difficulty: document.getElementById('recipeDifficulty').value,
      image: imageData,
      ingredients: ingredients.filter((i) => i.name && i.name.trim()),
      instructions: instructions.filter((s) => s.text && s.text.trim()),
      notes: document.getElementById('recipeNotes').value.trim(),
      tags,
      favorite: document.getElementById('recipeFavoriteToggle').checked,
    };
  }

  function initForm() {
    const form = document.getElementById('recipeForm');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        Toast.show('Please fill in the required fields', 'warning');
        return;
      }
      const data = collectFormData();
      if (editingId) {
        Recipes.update(editingId, data);
        Toast.show('Recipe updated', 'success');
      } else {
        Recipes.create(Object.assign(Recipes.blankRecipe(), data));
        Toast.show('Recipe added to your cookbook', 'success');
      }
      form.classList.remove('was-validated');
      bsEditModal.hide();
    });
  }

  /* ------------------------- View modal ------------------------- */
  function ingredientListHTML(list) {
    if (!list.length) return '<p class="text-body-secondary">No ingredients listed.</p>';
    return `<ul class="rk-view-ingredients">${list.map((i) => `
      <li>
        <label class="rk-check-item">
          <input type="checkbox">
          <span><strong>${i.qty ?? ''} ${rkEscapeHTML(i.unit || '')}</strong> ${rkEscapeHTML(i.name)}${i.note ? ` <em>(${rkEscapeHTML(i.note)})</em>` : ''}</span>
        </label>
      </li>`).join('')}</ul>`;
  }

  function instructionListHTML(list) {
    if (!list.length) return '<p class="text-body-secondary">No instructions listed.</p>';
    return `<ol class="rk-view-instructions">${list.map((s) => `
      <li>
        <p>${rkEscapeHTML(s.text)} ${s.timerMinutes ? `<button class="btn btn-sm rk-timer-chip rk-ripple" data-start-timer="${s.timerMinutes}" data-timer-label="${rkEscapeHTML(s.text.slice(0, 40))}"><i class="bi bi-stopwatch"></i> ${s.timerMinutes} min</button>` : ''}</p>
        ${s.image ? `<img src="${s.image}" class="rk-step-view-img" alt="Step ${s.step}">` : ''}
      </li>`).join('')}</ol>`;
  }

  function renderViewModal(r, servings) {
    const factor = servings / (r.servings || 1);
    const scaled = Recipes.scaleIngredients(r.ingredients || [], r.servings || 1, servings);
    document.getElementById('viewRecipeTitle').textContent = r.name;
    document.getElementById('viewRecipeImage').src = r.image || '';
    document.getElementById('viewRecipeImage').classList.toggle('d-none', !r.image);
    document.getElementById('viewRecipeNoImage').classList.toggle('d-none', !!r.image);
    document.getElementById('viewRecipeCategory').textContent = r.category;
    document.getElementById('viewRecipeDifficulty').textContent = r.difficulty;
    document.getElementById('viewRecipeDifficulty').className = `rk-badge-diff ${rkDifficultyBadgeClass(r.difficulty)}`;
    document.getElementById('viewRecipeDescription').textContent = r.description || 'No description added.';
    document.getElementById('viewRecipePrep').textContent = rkFormatTime(r.prepTime);
    document.getElementById('viewRecipeCook').textContent = rkFormatTime(r.cookTime);
    document.getElementById('viewRecipeTotal').textContent = rkFormatTime((Number(r.prepTime) || 0) + (Number(r.cookTime) || 0));
    document.getElementById('viewRecipeServings').textContent = servings;
    document.getElementById('viewRecipeIngredients').innerHTML = ingredientListHTML(scaled);
    document.getElementById('viewRecipeInstructions').innerHTML = instructionListHTML(r.instructions || []);
    document.getElementById('viewRecipeNotes').textContent = r.notes || 'No personal notes yet.';
    document.getElementById('viewRecipeTags').innerHTML = (r.tags || []).map((t) => `<span class="rk-chip-static">${rkEscapeHTML(t)}</span>`).join('') || '<span class="text-body-secondary">No tags</span>';
    document.getElementById('viewRecipeCreated').textContent = rkFormatDate(r.dateCreated);
    document.getElementById('viewRecipeUpdated').textContent = rkFormatDate(r.dateUpdated);
    const favBtn = document.getElementById('viewFavoriteBtn');
    favBtn.innerHTML = `<i class="bi ${r.favorite ? 'bi-heart-fill' : 'bi-heart'}"></i>`;
    favBtn.classList.toggle('active', !!r.favorite);
  }

  function openView(id) {
    const r = Recipes.getById(id);
    if (!r) return;
    currentViewId = id;
    viewServings = r.servings || 1;
    renderViewModal(r, viewServings);
    bsViewModal.show();
    Recipes.markCooked(id);
  }

  function initViewModal() {
    document.getElementById('viewServingsMinus')?.addEventListener('click', () => {
      if (viewServings > 1) { viewServings--; renderViewModal(Recipes.getById(currentViewId), viewServings); }
    });
    document.getElementById('viewServingsPlus')?.addEventListener('click', () => {
      viewServings++;
      renderViewModal(Recipes.getById(currentViewId), viewServings);
    });

    document.getElementById('viewFavoriteBtn')?.addEventListener('click', () => {
      Recipes.toggleFavorite(currentViewId);
      renderViewModal(Recipes.getById(currentViewId), viewServings);
    });

    document.getElementById('viewEditBtn')?.addEventListener('click', () => {
      bsViewModal.hide();
      setTimeout(() => openEdit(currentViewId), 300);
    });

    document.getElementById('viewDeleteBtn')?.addEventListener('click', () => deleteRecipeFlow(currentViewId));

    document.getElementById('viewPrintBtn')?.addEventListener('click', () => PrintRecipe.print(Recipes.getById(currentViewId), viewServings));

    document.getElementById('viewCookModeBtn')?.addEventListener('click', () => {
      bsViewModal.hide();
      setTimeout(() => CookMode.open(currentViewId), 300);
    });

    document.getElementById('viewAddToShoppingBtn')?.addEventListener('click', () => {
      const r = Recipes.getById(currentViewId);
      Shopping.addFromRecipe(r, viewServings);
      Toast.show('Ingredients added to shopping list', 'success');
    });

    document.getElementById('viewRecipeInstructions')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-start-timer]');
      if (btn) Timers.start(Number(btn.dataset.startTimer), btn.dataset.timerLabel || 'Cooking step');
    });
  }

  /* ------------------------- Init ------------------------- */
  function init() {
    bsEditModal = new bootstrap.Modal(document.getElementById('recipeModal'));
    bsViewModal = new bootstrap.Modal(document.getElementById('viewRecipeModal'));
    populateCategorySelect();
    initCategoryCustom();
    initIngredientBuilder();
    initInstructionBuilder();
    initTags();
    initImageUpload();
    initForm();
    initViewModal();

    document.getElementById('ingredientSuggestions')?.remove();
    const datalist = document.createElement('datalist');
    datalist.id = 'ingredientSuggestions';
    datalist.innerHTML = INGREDIENT_SUGGESTIONS.map((i) => `<option value="${i}">`).join('');
    document.body.appendChild(datalist);
  }

  return { init, openAdd, openEdit, openView };
})();

/* ------------------------- Print ------------------------- */
const PrintRecipe = (() => {
  function print(r, servings) {
    if (!r) return;
    const scaled = Recipes.scaleIngredients(r.ingredients || [], r.servings || 1, servings || r.servings);
    const area = document.getElementById('printArea');
    area.innerHTML = `
      <h1>${rkEscapeHTML(r.name)}</h1>
      <p class="print-meta">${rkEscapeHTML(r.category)} · Prep ${rkFormatTime(r.prepTime)} · Cook ${rkFormatTime(r.cookTime)} · Serves ${servings || r.servings} · ${r.difficulty}</p>
      ${r.description ? `<p class="print-desc">${rkEscapeHTML(r.description)}</p>` : ''}
      <h2>Ingredients</h2>
      <ul>${scaled.map((i) => `<li>${i.qty ?? ''} ${rkEscapeHTML(i.unit || '')} ${rkEscapeHTML(i.name)}${i.note ? ` (${rkEscapeHTML(i.note)})` : ''}</li>`).join('')}</ul>
      <h2>Instructions</h2>
      <ol>${(r.instructions || []).map((s) => `<li>${rkEscapeHTML(s.text)}${s.timerMinutes ? ` (${s.timerMinutes} min)` : ''}</li>`).join('')}</ol>
      ${r.notes ? `<h2>Notes</h2><p>${rkEscapeHTML(r.notes)}</p>` : ''}
    `;
    window.print();
  }
  return { print };
})();
