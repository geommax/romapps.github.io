/* ═══════════════════════════════════════════════
   RomDynamics Internal App Hub — Application Logic
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Configuration ──
  // SHA-256 hash of the access token.  To change the token run:
  //   echo -n "YOUR_TOKEN" | shasum -a 256
  // Default token: "romdynamics2026"
  const TOKEN_HASH =
    'e9b87461c60b5e3840a3276425de88049e87bb8be8befc4e75c8cd9f5254f836';
  const SESSION_KEY = 'rom_auth_session';
  const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

  // ── DOM refs ──
  const $gate = document.getElementById('auth-gate');
  const $app = document.getElementById('app');
  const $authForm = document.getElementById('auth-form');
  const $authToken = document.getElementById('auth-token');
  const $authError = document.getElementById('auth-error');
  const $search = document.getElementById('search-input');
  const $filterBar = document.getElementById('filter-bar');
  const $main = document.getElementById('main-content');
  const $empty = document.getElementById('empty-state');
  const $lastUpdated = document.getElementById('last-updated');
  const $btnLogout = document.getElementById('btn-logout');

  let appData = null;
  let activeCategory = 'all';

  // ── Utility ──
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const days = Math.floor((now - date) / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? '1mo ago' : `${months}mo ago`;
  }

  // ── Auth ──
  function isSessionValid() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      if (session && Date.now() - session.ts < SESSION_TTL) return true;
    } catch (_) {}
    return false;
  }

  function createSession() {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }));
  }

  function destroySession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const token = $authToken.value.trim();
    if (!token) return;

    const hash = await sha256(token);
    const STRICT_MODE = true;

    if (STRICT_MODE && hash !== TOKEN_HASH) {
      $authError.hidden = false;
      $authToken.value = '';
      $authToken.focus();
      return;
    }

    createSession();
    showApp();
  }

  function handleLogout() {
    destroySession();
    $app.classList.remove('visible');

    setTimeout(() => {
      $app.hidden = true;
      $gate.hidden = false;
      window.scrollTo(0, 0);

      requestAnimationFrame(() => {
        $authToken.value = '';
        $authToken.focus();
      });
    }, 300);
  }

  function showApp() {
    // Animate auth gate out
    $gate.classList.add('fade-out');

    setTimeout(() => {
      $gate.hidden = true;
      $gate.classList.remove('fade-out');
      $app.hidden = false;
      window.scrollTo(0, 0);

      // Trigger app fade-in on next frame
      requestAnimationFrame(() => {
        $app.classList.add('visible');
      });

      loadData();
    }, 350);
  }

  // ── Data ──
  async function loadData() {
    try {
      const res = await fetch('data/apps.json?v=' + Date.now());
      appData = await res.json();
      $lastUpdated.textContent = `Updated ${timeAgo(appData.lastUpdated)}`;
      renderFilterChips();
      render();
    } catch (err) {
      console.error('Failed to load app data:', err);
      $main.innerHTML =
        '<p style="text-align:center;color:var(--c-red);padding:4rem 0;">Failed to load application data.</p>';
    }
  }

  // ── Filter chips ──
  function renderFilterChips() {
    const existing = $filterBar.querySelectorAll('[data-category]:not([data-category="all"])');
    existing.forEach((el) => el.remove());

    appData.categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = 'filter-chip';
      btn.dataset.category = cat.id;
      btn.textContent = `${cat.icon} ${cat.name}`;
      $filterBar.appendChild(btn);
    });
  }

  // ── Render ──
  function render() {
    const query = ($search.value || '').toLowerCase().trim();
    const filtered = appData.apps.filter((app) => {
      const matchCategory =
        activeCategory === 'all' || app.category === activeCategory;
      if (!matchCategory) return false;
      if (!query) return true;
      return (
        app.name.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.tags.some((t) => t.toLowerCase().includes(query)) ||
        app.category.toLowerCase().includes(query) ||
        app.version.toLowerCase().includes(query)
      );
    });

    if (filtered.length === 0) {
      $main.innerHTML = '';
      $empty.hidden = false;
      return;
    }

    $empty.hidden = true;

    // Group by category
    const groups = {};
    filtered.forEach((app) => {
      if (!groups[app.category]) groups[app.category] = [];
      groups[app.category].push(app);
    });

    // Render in category order
    let html = '';
    appData.categories.forEach((cat) => {
      const apps = groups[cat.id];
      if (!apps || apps.length === 0) return;
      html += `
        <section class="category-section" id="cat-${cat.id}">
          <div class="category-header">
            <span class="category-icon">${cat.icon}</span>
            <h2 class="category-title">${cat.name}</h2>
            <span class="category-count">${apps.length}</span>
          </div>
          <div class="app-grid">
            ${apps.map(renderCard).join('')}
          </div>
        </section>`;
    });

    $main.innerHTML = html;
  }

  function renderCard(app) {
    return `
      <article class="app-card" data-id="${app.id}">
        <div class="app-card-header">
          <span class="app-card-name">${highlight(app.name)}</span>
          <span class="app-card-version">${app.version}</span>
        </div>
        <p class="app-card-desc">${highlight(app.description)}</p>
        <div class="app-card-tags">
          ${app.tags.map((t) => `<span class="tag">${t}</span>`).join('')}
        </div>
        <div class="app-card-footer">
          <span class="status-badge status-${app.status}">${cap(app.status)}</span>
          <span class="app-card-date">Updated ${timeAgo(app.updatedAt)}</span>
          <a class="app-card-link" href="https://github.com/${app.repo}" target="_blank" rel="noopener">
            Repo →
          </a>
        </div>
      </article>`;
  }

  function highlight(text) {
    const query = ($search.value || '').trim();
    if (!query) return escapeHtml(text);
    const escaped = escapeRegExp(query);
    const re = new RegExp(`(${escaped})`, 'gi');
    return escapeHtml(text).replace(re, '<mark>$1</mark>');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ── Events ──
  $authForm.addEventListener('submit', handleLogin);
  $btnLogout.addEventListener('click', handleLogout);

  // Search
  let searchTimer;
  $search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 150);
  });

  // Keyboard shortcut: / to focus search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== $search && !$app.hidden) {
      e.preventDefault();
      $search.focus();
    }
    if (e.key === 'Escape' && document.activeElement === $search) {
      $search.value = '';
      $search.blur();
      render();
    }
  });

  // Filter chips (event delegation)
  $filterBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    activeCategory = chip.dataset.category;
    $filterBar.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    render();
  });

  // ── Init ──
  if (isSessionValid()) {
    // Returning session — skip animation, show app instantly
    $gate.hidden = true;
    $app.hidden = false;
    $app.classList.add('visible');
    loadData();
  }
})();
