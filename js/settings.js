/* ==========================================================================
   settings.js — user preferences, backup/restore, reset
   ========================================================================== */

const SettingsView = (() => {
  function applyAnimationsPref(enabled) {
    document.documentElement.classList.toggle('rk-no-animations', !enabled);
  }

  function render() {
    const s = Storage.getSettings();
    const themeRadio = document.querySelector(`input[name="settingsTheme"][value="${s.theme}"]`);
    if (themeRadio) themeRadio.checked = true;
    document.querySelectorAll('[data-accent-option]').forEach((el) => {
      el.classList.toggle('active', el.dataset.accentOption === s.accent);
    });
    const unitSel = document.getElementById('settingsDefaultUnit');
    if (unitSel) {
      unitSel.innerHTML = MEASUREMENTS.map((m) => `<option value="${m}" ${m === s.defaultUnit ? 'selected' : ''}>${m}</option>`).join('');
    }
    const servingsInput = document.getElementById('settingsDefaultServings');
    if (servingsInput) servingsInput.value = s.defaultServings;
    const animToggle = document.getElementById('settingsAnimations');
    if (animToggle) animToggle.checked = s.animations;
    const autoSaveToggle = document.getElementById('settingsAutoSave');
    if (autoSaveToggle) autoSaveToggle.checked = s.autoSave;

    const stats = Recipes.stats();
    const el = document.getElementById('settingsStorageInfo');
    if (el) {
      let bytes = 0;
      try { bytes = new Blob([localStorage.getItem(Storage.KEYS.RECIPES) || '']).size; } catch (e) { /* noop */ }
      el.textContent = `${stats.total} recipes · ~${(bytes / 1024).toFixed(1)} KB stored`;
    }
  }

  function save(patch) {
    const s = Object.assign({}, Storage.getSettings(), patch);
    Storage.saveSettings(s);
    return s;
  }

  function init() {
    document.querySelectorAll('input[name="settingsTheme"]').forEach((r) => {
      r.addEventListener('change', () => {
        const theme = r.value;
        save({ theme });
        Storage.saveTheme(theme);
        ThemeManager.apply(theme);
        Toast.show(`Theme set to ${theme}`, 'success', 1600);
      });
    });

    document.querySelectorAll('[data-accent-option]').forEach((el) => {
      el.addEventListener('click', () => {
        const accent = el.dataset.accentOption;
        save({ accent });
        ThemeManager.applyAccent(accent);
        document.querySelectorAll('[data-accent-option]').forEach((o) => o.classList.remove('active'));
        el.classList.add('active');
        Toast.show('Accent color updated', 'success', 1600);
      });
    });

    document.getElementById('settingsDefaultUnit')?.addEventListener('change', (e) => save({ defaultUnit: e.target.value }));
    document.getElementById('settingsDefaultServings')?.addEventListener('change', (e) => save({ defaultServings: Number(e.target.value) || 1 }));
    document.getElementById('settingsAnimations')?.addEventListener('change', (e) => {
      save({ animations: e.target.checked });
      applyAnimationsPref(e.target.checked);
    });
    document.getElementById('settingsAutoSave')?.addEventListener('change', (e) => save({ autoSave: e.target.checked }));

    document.getElementById('settingsExportBtn')?.addEventListener('click', () => {
      const data = Storage.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipe-keeper-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.show('Backup exported', 'success');
    });

    document.getElementById('settingsImportInput')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const ok = await Confirm.ask({
          title: 'Import backup?',
          message: 'This will replace your current recipes, shopping list, and planner with the contents of this file.',
          okText: 'Import',
          okClass: 'btn-warning',
        });
        if (ok) {
          Storage.importAll(data);
          Toast.show('Backup imported successfully', 'success');
          document.dispatchEvent(new CustomEvent('rk:recipes-changed'));
          render();
        }
      } catch (err) {
        Toast.show('That file could not be read as a backup', 'danger');
      }
      e.target.value = '';
    });

    document.getElementById('settingsResetBtn')?.addEventListener('click', async () => {
      const ok = await Confirm.ask({
        title: 'Reset all data?',
        message: 'This permanently deletes every recipe, list, and setting stored on this device.',
        okText: 'Reset everything',
        okClass: 'btn-danger',
      });
      if (ok) {
        Storage.resetAll();
        Toast.show('All data has been reset', 'danger');
        setTimeout(() => location.reload(), 900);
      }
    });
  }

  return { init, render };
})();
