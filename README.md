# Recipe Keeper

A personal, offline-first recipe keeper. Pure HTML/CSS/JS, no backend, no build step — everything is stored in your browser's `localStorage`.

## ⚠️ Important: run it from a local web server, not by double-clicking the file

If you just double-click `index.html`, it opens with a `file://` address. Browsers restrict two things on `file://` pages:

1. **Saved data isn't reliable** — some browsers won't persist `localStorage` for local files at all, so your recipes can appear to "reset" every time you reopen the page.
2. **The app can't be installed** and the offline service worker can't register — both require a real `http://` or `https://` address.

The fix takes 10 seconds: serve the folder locally instead. Pick whichever you have installed:

**Python (already on most Macs/Linux):**
```bash
cd recipe-keeper
python3 -m http.server 8080
```
Then open **http://localhost:8080** in your browser.

**Node.js:**
```bash
cd recipe-keeper
npx serve .
```

**VS Code:** install the "Live Server" extension, right-click `index.html`, choose "Open with Live Server".

Once it's running on `http://localhost:...`, everything works as expected:
- Recipes, favorites, the meal planner, and the shopping list all persist across refreshes and browser restarts.
- An **Install App** button appears in the navbar (Chrome/Edge/Android) — or use your browser's "Add to Home Screen" (iOS Safari) / "Install app" menu option — to add Recipe Keeper to your device like a native app.
- After the first visit, a service worker caches the app so it keeps working with no internet connection at all.

The app also shows a banner automatically if it detects it's running somewhere your data won't be saved.

## Data & backups

All data lives in your browser's `localStorage` for whichever origin you load the app from (e.g. `http://localhost:8080`). It does **not** sync between browsers or devices, and clearing your browser's site data will erase it. Use **Settings → Export Backup** regularly to save a JSON file you can restore later with **Settings → Import Backup**.

## Project structure

```
index.html
manifest.json
sw.js
css/
  style.css
  responsive.css
  animations.css
js/
  storage.js     — localStorage persistence
  recipes.js     — recipe data model & CRUD
  search.js      — instant search
  filters.js     — filtering & sorting
  modal.js       — add/edit/view recipe modals, print
  planner.js     — weekly meal planner
  shopping.js    — shopping list
  settings.js    — preferences, backup/restore
  timers.js      — cooking timers
  cookmode.js    — distraction-free cook mode
  app.js         — app shell, theme, toasts, dashboard
assets/icons/    — app icons for install/manifest
```
