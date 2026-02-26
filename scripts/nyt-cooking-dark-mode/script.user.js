// ==UserScript==
// @name        NYT Cooking Dark Mode
// @match       https://cooking.nytimes.com/*
// @version     1.0.0
// @description Applies a dark color scheme to NYT Cooking pages.
// ==/UserScript==

(function nytCookingDarkMode() {
  "use strict";

  const STYLE_ID = "oz-nyt-cooking-dark-mode";
  const warnings = [];

  // ── Helpers ────────────────────────────────────────────────────────────

  function isUsableNode(node) {
    return node != null && node.isConnected;
  }

  function queryFirst(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (isUsableNode(el)) return el;
      } catch (_) {
        /* skip invalid selectors */
      }
    }
    return null;
  }

  function safeMutate(name, fn) {
    try {
      fn();
      return { ok: true };
    } catch (err) {
      const msg = `[oz-dark-mode] ${name}: ${err.message}`;
      warnings.push(msg);
      return { ok: false, warning: msg };
    }
  }

  function waitFor(condition, { timeoutMs = 5000, intervalMs = 200 } = {}) {
    return new Promise((resolve) => {
      if (condition()) return resolve(true);
      let elapsed = 0;
      const timer = setInterval(() => {
        elapsed += intervalMs;
        if (condition()) {
          clearInterval(timer);
          resolve(true);
        } else if (elapsed >= timeoutMs) {
          clearInterval(timer);
          resolve(false);
        }
      }, intervalMs);
    });
  }

  // ── Dark-mode CSS ─────────────────────────────────────────────────────
  // Colors derived from typical NYT Cooking branding, inverted to dark tones.
  // Uses CSS custom properties and broad selectors to survive DOM drift.

  const DARK_CSS = `
    /* ── Base surface & text ─────────────────────────────── */
    html, body {
      background-color: #1a1a1a !important;
      color: #e0e0e0 !important;
    }

    /* ── Major containers ────────────────────────────────── */
    header,
    nav,
    footer,
    main,
    section,
    aside,
    [class*="Container"],
    [class*="container"],
    [class*="Wrapper"],
    [class*="wrapper"],
    [class*="Page"],
    [class*="page"],
    [data-testid],
    [class*="RecipeCard"],
    [class*="recipeCard"],
    [class*="recipe-card"],
    [class*="Card"],
    [class*="card"],
    [class*="Panel"],
    [class*="panel"],
    [class*="Modal"],
    [class*="modal"],
    [class*="Drawer"],
    [class*="drawer"],
    [class*="Banner"],
    [class*="banner"],
    [class*="Hero"],
    [class*="hero"],
    [class*="TopBar"],
    [class*="topbar"],
    [class*="NavigationBar"],
    [class*="navigationbar"],
    [class*="SiteHeader"],
    [class*="siteheader"] {
      background-color: #1e1e1e !important;
      color: #e0e0e0 !important;
    }

    /* ── Recipe box grid items ───────────────────────────── */
    [class*="collection"],
    [class*="Collection"],
    [class*="RecipeBox"],
    [class*="recipebox"],
    [class*="recipe-box"],
    [class*="Shelf"],
    [class*="shelf"] {
      background-color: #252525 !important;
      color: #e0e0e0 !important;
    }

    /* ── Cards / tiles ───────────────────────────────────── */
    article,
    [class*="Tile"],
    [class*="tile"],
    [class*="Feed"],
    [class*="feed"] {
      background-color: #2a2a2a !important;
      color: #e0e0e0 !important;
      border-color: #3a3a3a !important;
    }

    /* ── Text elements ───────────────────────────────────── */
    h1, h2, h3, h4, h5, h6 {
      color: #f0f0f0 !important;
    }

    p, span, li, td, th, label, figcaption, blockquote {
      color: #d0d0d0 !important;
    }

    a {
      color: #8ab4f8 !important;
    }

    a:visited {
      color: #c58af9 !important;
    }

    /* ── Inputs / form elements ──────────────────────────── */
    input,
    textarea,
    select {
      background-color: #2a2a2a !important;
      color: #e0e0e0 !important;
      border-color: #555 !important;
    }

    input::placeholder,
    textarea::placeholder {
      color: #888 !important;
    }

    button,
    [role="button"] {
      background-color: #333 !important;
      color: #e0e0e0 !important;
      border-color: #555 !important;
    }

    /* ── Borders & dividers ──────────────────────────────── */
    hr {
      border-color: #3a3a3a !important;
    }

    [class*="Divider"],
    [class*="divider"],
    [class*="Border"],
    [class*="border"] {
      border-color: #3a3a3a !important;
    }

    /* ── Images: prevent blinding white backgrounds ─────── */
    img {
      opacity: 0.90;
    }

    /* ── SVG icons ────────────────────────────────────────── */
    svg {
      fill: currentColor;
    }

    /* ── Dropdowns / menus ───────────────────────────────── */
    [class*="Dropdown"],
    [class*="dropdown"],
    [class*="Menu"],
    [class*="menu"],
    [class*="Popover"],
    [class*="popover"],
    [class*="Tooltip"],
    [class*="tooltip"] {
      background-color: #2a2a2a !important;
      color: #e0e0e0 !important;
      border-color: #3a3a3a !important;
    }

    /* ── Scrollbar (Webkit) ──────────────────────────────── */
    ::-webkit-scrollbar {
      width: 8px;
      background-color: #1a1a1a;
    }
    ::-webkit-scrollbar-thumb {
      background-color: #555;
      border-radius: 4px;
    }

    /* ── Reduce harsh box-shadows ────────────────────────── */
    * {
      box-shadow: none !important;
    }
  `;

  // ── Steps ─────────────────────────────────────────────────────────────

  function stepInjectStylesheet() {
    return safeMutate("inject-stylesheet", () => {
      // Idempotency: remove existing sheet first
      const existing = document.getElementById(STYLE_ID);
      if (isUsableNode(existing)) {
        existing.remove();
      }

      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = DARK_CSS;

      const target = queryFirst(["head", "html"]);
      if (!target) {
        warnings.push("[oz-dark-mode] No <head> or <html> found; cannot inject stylesheet.");
        return;
      }
      target.appendChild(style);
    });
  }

  function stepSetColorSchemeMeta() {
    return safeMutate("color-scheme-meta", () => {
      let meta = document.querySelector('meta[name="color-scheme"]');
      if (!isUsableNode(meta)) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "color-scheme");
        const head = queryFirst(["head"]);
        if (head) head.appendChild(meta);
      }
      if (isUsableNode(meta)) {
        meta.setAttribute("content", "dark");
      }
    });
  }

  function stepSetBodyAttribute() {
    return safeMutate("body-attribute", () => {
      const body = queryFirst(["body"]);
      if (isUsableNode(body)) {
        body.setAttribute("data-oz-dark-mode", "true");
      }
    });
  }

  // ── Main ──────────────────────────────────────────────────────────────

  async function main() {
    // Wait for <body> to exist (handles very early injection)
    await waitFor(() => document.body != null, { timeoutMs: 8000, intervalMs: 100 });

    const steps = [
      stepInjectStylesheet,
      stepSetColorSchemeMeta,
      stepSetBodyAttribute,
    ];

    for (const step of steps) {
      step();
    }

    // Re-apply after potential late renders / SPA transitions
    const observer = new MutationObserver(() => {
      if (!document.getElementById(STYLE_ID)) {
        stepInjectStylesheet();
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    if (warnings.length > 0) {
      console.warn("[oz-dark-mode] Completed with warnings:", warnings);
    } else {
      console.info("[oz-dark-mode] Dark mode applied successfully.");
    }
  }

  main();
})();
