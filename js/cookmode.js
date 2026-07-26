/* ==========================================================================
   cookmode.js — distraction-free, step-by-step cooking mode
   ========================================================================== */

const CookMode = (() => {
  let recipe, stepIndex, wakeLock;
  let overlay, bsOffcanvasNav;

  function ingredientChecklistHTML() {
    return (recipe.ingredients || []).map((i) => `
      <label class="rk-check-item">
        <input type="checkbox" data-cook-ing="${i.id}">
        <span>${i.qty ?? ''} ${rkEscapeHTML(i.unit || '')} ${rkEscapeHTML(i.name)}</span>
      </label>`).join('') || '<p class="text-body-secondary">No ingredients listed.</p>';
  }

  function renderStep() {
    const steps = recipe.instructions || [];
    const total = steps.length;
    const step = steps[stepIndex];
    document.getElementById('cookModeProgress').style.width = `${((stepIndex + 1) / Math.max(total, 1)) * 100}%`;
    document.getElementById('cookModeCounter').textContent = total ? `Step ${stepIndex + 1} of ${total}` : 'No steps added';
    document.getElementById('cookModeTitle').textContent = recipe.name;

    const body = document.getElementById('cookModeStepBody');
    if (!step) {
      body.innerHTML = `<p class="rk-cook-step-text">This recipe has no instructions yet.</p>`;
    } else {
      body.innerHTML = `
        <p class="rk-cook-step-text">${rkEscapeHTML(step.text)}</p>
        ${step.image ? `<img src="${step.image}" class="rk-cook-step-img" alt="Step ${stepIndex + 1}">` : ''}
        ${step.timerMinutes ? `<button class="btn rk-btn-primary rk-ripple mt-3" data-cook-start-timer="${step.timerMinutes}"><i class="bi bi-stopwatch"></i> Start ${step.timerMinutes} min timer</button>` : ''}
      `;
    }
    document.getElementById('cookModePrevBtn').disabled = stepIndex === 0;
    document.getElementById('cookModeNextBtn').textContent = stepIndex >= total - 1 ? 'Finish' : 'Next Step';
  }

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) { /* wake lock unavailable or denied */ }
  }
  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }

  function open(id) {
    recipe = Recipes.getById(id);
    if (!recipe) return;
    stepIndex = 0;
    document.getElementById('cookModeIngredientList').innerHTML = ingredientChecklistHTML();
    renderStep();
    overlay.classList.remove('d-none');
    document.body.classList.add('rk-cookmode-open');
    requestAnimationFrame(() => overlay.classList.add('show'));
    requestWakeLock();
    Recipes.markCooked(id);
  }

  function close() {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.classList.add('d-none');
      document.body.classList.remove('rk-cookmode-open');
    }, 250);
    releaseWakeLock();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  function next() {
    const total = (recipe.instructions || []).length;
    if (stepIndex >= total - 1) { close(); Toast.show('Enjoy your meal! 🍽️', 'success'); return; }
    stepIndex++;
    renderStep();
  }
  function prev() {
    if (stepIndex > 0) { stepIndex--; renderStep(); }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      overlay.requestFullscreen?.().catch(() => Toast.show('Fullscreen is not available', 'warning'));
    } else {
      document.exitFullscreen();
    }
  }

  function init() {
    overlay = document.getElementById('cookModeOverlay');
    if (!overlay) return;
    document.getElementById('cookModeCloseBtn')?.addEventListener('click', close);
    document.getElementById('cookModeNextBtn')?.addEventListener('click', next);
    document.getElementById('cookModePrevBtn')?.addEventListener('click', prev);
    document.getElementById('cookModeFullscreenBtn')?.addEventListener('click', toggleFullscreen);
    document.getElementById('cookModeStepBody')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cook-start-timer]');
      if (btn) Timers.start(Number(btn.dataset.cookStartTimer), `${recipe.name} — step ${stepIndex + 1}`);
    });

    document.addEventListener('keydown', (e) => {
      if (overlay.classList.contains('d-none')) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') close();
    });
  }

  return { init, open, close };
})();
