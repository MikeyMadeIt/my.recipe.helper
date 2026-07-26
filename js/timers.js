/* ==========================================================================
   timers.js — multiple simultaneous cooking countdown timers
   ========================================================================== */

const Timers = (() => {
  const active = new Map(); // id -> { label, endsAt, remaining, intervalId, paused }
  let dock;
  let audioCtx;

  function beep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) { /* audio not available */ }
  }

  function formatRemaining(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function render() {
    if (!dock) return;
    dock.classList.toggle('d-none', active.size === 0);
    dock.innerHTML = [...active.entries()].map(([id, t]) => `
      <div class="rk-timer-card ${t.remaining <= 0 ? 'rk-timer-done' : ''}" data-timer-id="${id}">
        <div class="rk-timer-info">
          <strong>${formatRemaining(t.remaining)}</strong>
          <span>${rkEscapeHTML(t.label)}</span>
        </div>
        <div class="rk-timer-actions">
          <button type="button" class="btn btn-sm rk-btn-icon rk-ripple" data-timer-toggle="${id}">
            <i class="bi ${t.paused ? 'bi-play-fill' : 'bi-pause-fill'}"></i>
          </button>
          <button type="button" class="btn btn-sm rk-btn-icon rk-btn-danger rk-ripple" data-timer-stop="${id}">
            <i class="bi bi-stop-fill"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  function tick(id) {
    const t = active.get(id);
    if (!t || t.paused) return;
    t.remaining = t.endsAt - Date.now();
    if (t.remaining <= 0) {
      t.remaining = 0;
      clearInterval(t.intervalId);
      beep();
      Toast.show(`⏰ Timer done: ${t.label}`, 'warning', 6000);
      if (window.Notification && Notification.permission === 'granted') {
        try { new Notification('Timer done', { body: t.label }); } catch (e) { /* noop */ }
      }
    }
    render();
  }

  function start(minutes, label) {
    if (!minutes || minutes <= 0) return;
    const id = rkUid('timer');
    const durationMs = minutes * 60 * 1000;
    const t = {
      label: label || `${minutes} min timer`,
      endsAt: Date.now() + durationMs,
      remaining: durationMs,
      paused: false,
    };
    t.intervalId = setInterval(() => tick(id), 1000);
    active.set(id, t);
    render();
    Toast.show(`Timer started: ${minutes} min`, 'info', 1800);
  }

  function toggle(id) {
    const t = active.get(id);
    if (!t) return;
    if (t.paused) {
      t.endsAt = Date.now() + t.remaining;
      t.intervalId = setInterval(() => tick(id), 1000);
      t.paused = false;
    } else {
      clearInterval(t.intervalId);
      t.paused = true;
    }
    render();
  }

  function stop(id) {
    const t = active.get(id);
    if (t) clearInterval(t.intervalId);
    active.delete(id);
    render();
  }

  function init() {
    dock = document.getElementById('timerDock');
    dock?.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('[data-timer-toggle]');
      const stopBtn = e.target.closest('[data-timer-stop]');
      if (toggleBtn) toggle(toggleBtn.dataset.timerToggle);
      if (stopBtn) stop(stopBtn.dataset.timerStop);
    });
    if (window.Notification && Notification.permission === 'default') {
      // Ask quietly; ignored if the user dismisses it.
      Notification.requestPermission().catch(() => {});
    }
  }

  return { init, start, toggle, stop };
})();
