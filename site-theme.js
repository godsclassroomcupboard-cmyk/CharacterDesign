/**
 * site-theme.js — Aurabot shared theme engine
 * Drop <script src="site-theme.js"></script> in the <head> of every page.
 * Reads theme settings from localStorage and applies them immediately
 * (before paint) so there is no flash of un-themed content.
 */

(function () {
  const STORAGE_KEY = 'aurabot_theme';

  const DEFAULTS = {
    // Colours (CSS custom properties)
    colorNavy:     '#1A1D3A',
    colorPurple:   '#6C5CE7',
    colorPink:     '#E84393',
    colorLavender: '#A29BFE',
    colorLightBg:  '#EAE7FC',

    // Typography
    bodyFont:      'Nunito',
    headingFont:   'Baloo 2',

    // Images (data-URLs or empty string = use built-in SVG)
    logoDataUrl:       '',   // login screen logo
    mascotDataUrl:     '',   // student dashboard mascot
    adminBgDataUrl:    '',   // admin topbar image (optional)
    teacherBgDataUrl:  '',   // teacher topbar image (optional)
    studentBgDataUrl:  '',   // student sidebar logo area (optional)
  };

  /** Load saved theme, merging with defaults */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : { ...DEFAULTS };
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  /** Save a full theme object */
  function save(theme) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  }

  /** Apply CSS variables + font links to current document */
  function apply(theme) {
    const r = document.documentElement;
    r.style.setProperty('--navy',      theme.colorNavy);
    r.style.setProperty('--purple',    theme.colorPurple);
    r.style.setProperty('--pink',      theme.colorPink);
    r.style.setProperty('--lavender',  theme.colorLavender);
    r.style.setProperty('--light-bg',  theme.colorLightBg);

    // Google Fonts — only inject if names differ from defaults
    _injectFont(theme.bodyFont,    'body-font-link',    '400;600;700;800;900');
    _injectFont(theme.headingFont, 'heading-font-link', '700;800;900');

    // Apply font-families once DOM is ready
    const applyFonts = () => {
      document.body.style.fontFamily = `'${theme.bodyFont}', sans-serif`;
      document.querySelectorAll('.font-heading, [class*="Baloo"], .logo-title, .topbar-title, .stat-num')
        .forEach(el => { el.style.fontFamily = `'${theme.headingFont}', cursive`; });
    };
    if (document.body) applyFonts();
    else document.addEventListener('DOMContentLoaded', applyFonts);

    // Images
    _applyImages(theme);
  }

  function _injectFont(name, id, weights) {
    if (!name || name === 'Nunito' && id === 'body-font-link') return;
    if (!name || name === 'Baloo 2' && id === 'heading-font-link') return;
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    const encoded = encodeURIComponent(name).replace(/%20/g, '+');
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@${weights}&display=swap`;
  }

  function _applyImages(theme) {
    const apply = () => {
      // Login screen logo
      if (theme.logoDataUrl) {
        document.querySelectorAll('.logo-icon-img').forEach(el => {
          el.src = theme.logoDataUrl; el.style.display = 'block';
        });
        document.querySelectorAll('.logo-icon-svg').forEach(el => el.style.display = 'none');
      }

      // Mascot (student dashboard) — syncs with the key index.html already reads
      if (theme.mascotDataUrl) {
        try { localStorage.setItem('mascot_dataurl', theme.mascotDataUrl); } catch(_) {}
        document.querySelectorAll('.mascot-custom-img').forEach(el => {
          el.src = theme.mascotDataUrl; el.style.display = 'block';
        });
        document.querySelectorAll('.mascot-default-svg').forEach(el => el.style.display = 'none');
        // Directly update the student page's existing img elements if present
        ['mascot-img-char','mascot-img-map'].forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.src = theme.mascotDataUrl; el.style.display = 'block'; }
        });
        const setup = document.getElementById('mascot-setup-char');
        if (setup) setup.style.display = 'none';
      }

      // Optional page-header images
      if (theme.adminBgDataUrl)   _setBgImage('#admin-header-img',   theme.adminBgDataUrl);
      if (theme.teacherBgDataUrl) _setBgImage('#teacher-header-img', theme.teacherBgDataUrl);
      if (theme.studentBgDataUrl) _setBgImage('#student-header-img', theme.studentBgDataUrl);
    };

    if (document.body) apply();
    else document.addEventListener('DOMContentLoaded', apply);
  }

  function _setBgImage(selector, dataUrl) {
    const el = document.querySelector(selector);
    if (el) { el.src = dataUrl; el.style.display = 'block'; }
  }

  // ── Public API ──────────────────────────────────────────────
  window.AurabotTheme = {
    DEFAULTS,
    STORAGE_KEY,
    load,
    save,
    apply,
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('mascot_dataurl');
      apply({ ...DEFAULTS });
    },
    /** Merge a partial update and re-apply */
    update(patch) {
      const current = load();
      const next = Object.assign({}, current, patch);
      save(next);
      apply(next);
      return next;
    },
  };

  // Apply immediately on script load
  apply(load());
})();
