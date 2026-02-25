// ==UserScript==
// @name        MongoDB Light Theme
// @description Forces a light color scheme on www.mongodb.com
// @match       https://www.mongodb.com/*
// @run-at      document-idle
// ==/UserScript==

(function mongodbLightTheme() {
  "use strict";

  const STYLE_ID = "oz-mongodb-light-theme";

  // Guard: do not inject twice on repeated runs
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const css = `
    /* ── Base overrides ─────────────────────────────────── */
    html, body {
      background-color: #ffffff !important;
      color: #1a1a2e !important;
    }

    /* ── Dark section backgrounds → white / near-white ── */
    [class*="dark"],
    [data-theme="dark"],
    section, header, footer, nav, main, div, article, aside {
      background-color: inherit !important;
    }

    /* Catch common MongoDB hero / banner sections */
    [style*="background-color: #00"] ,
    [style*="background-color: #0e"] ,
    [style*="background-color: #1a"] ,
    [style*="background-color: #11"] ,
    [style*="background-color: #001"] ,
    [style*="background: #00"]  ,
    [style*="background: #0e"]  ,
    [style*="background: #1a"]  ,
    [style*="background: #11"]  ,
    [style*="background: rgb(0,"]  ,
    [style*="background: rgb(17,"]  ,
    [style*="background-color: rgb(0,"]  ,
    [style*="background-color: rgb(17,"] {
      background-color: #f5f6f7 !important;
    }

    /* ── Text color normalization ────────────────────── */
    h1, h2, h3, h4, h5, h6 {
      color: #1a1a2e !important;
    }

    p, li, span, a, td, th, label, figcaption, blockquote, cite, small, strong, em, b, i {
      color: #2d2d3f !important;
    }

    a:hover {
      color: #00684a !important;
    }

    /* ── MongoDB green accent preservation ───────────── */
    a[class*="button"],
    button,
    [role="button"] {
      /* Keep branded green buttons readable on light bg */
      color: #ffffff !important;
      background-color: #00684a !important;
      border-color: #00684a !important;
    }

    /* Secondary / outline buttons */
    a[class*="button"][class*="secondary"],
    button[class*="secondary"],
    [class*="outline"] {
      color: #00684a !important;
      background-color: transparent !important;
      border-color: #00684a !important;
    }

    /* ── Navigation ──────────────────────────────────── */
    nav, nav * {
      background-color: #ffffff !important;
      color: #1a1a2e !important;
    }

    nav a {
      color: #2d2d3f !important;
    }

    /* ── Footer ──────────────────────────────────────── */
    footer, footer * {
      background-color: #f0f1f2 !important;
      color: #2d2d3f !important;
    }

    /* ── Cards / panels ──────────────────────────────── */
    [class*="card"],
    [class*="Card"],
    [class*="panel"],
    [class*="Panel"],
    [class*="tile"],
    [class*="Tile"] {
      background-color: #ffffff !important;
      color: #2d2d3f !important;
      border-color: #e0e0e0 !important;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08) !important;
    }

    /* ── Code blocks ─────────────────────────────────── */
    pre, code, [class*="code"] {
      background-color: #f5f6f7 !important;
      color: #1a1a2e !important;
    }

    /* ── Inputs ──────────────────────────────────────── */
    input, select, textarea {
      background-color: #ffffff !important;
      color: #1a1a2e !important;
      border-color: #c0c0c0 !important;
    }

    /* ── SVG / icon color inversion where needed ─────── */
    svg:not([class*="logo"]) {
      color: #2d2d3f !important;
    }

    /* ── Images: do not invert logos/photos, only
         decorative dark background SVGs if any ───────── */

    /* ── Scrollbar (Webkit) ──────────────────────────── */
    ::-webkit-scrollbar {
      background: #f5f6f7 !important;
    }
    ::-webkit-scrollbar-thumb {
      background: #c0c0c0 !important;
      border-radius: 4px;
    }
  `;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);

  // Also set color-scheme meta so the browser UI matches
  let meta = document.querySelector('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "color-scheme";
    document.head.appendChild(meta);
  }
  meta.content = "light";
})();
