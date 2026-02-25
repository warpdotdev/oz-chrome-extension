// ==UserScript==
// @name        oz-warp-dev-fuchsia-theme
// @description Applies a fuchsia colour theme to oz.warp.dev
// @match       https://oz.warp.dev/*
// @run-at      document-idle
// ==/UserScript==

(function () {
  "use strict";

  const STYLE_ID = "oz-fuchsia-theme";

  // Guard: avoid injecting twice on repeated runs
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    /* ---- Fuchsia theme overrides for oz.warp.dev ---- */

    /* Primary background tints */
    body,
    #root {
      background-color: #1a0a1a !important;
    }

    /* Navigation sidebar */
    nav {
      background-color: #2d0033 !important;
      border-color: #ff00ff40 !important;
    }

    /* Navigation links – default state */
    nav a {
      color: #e0a0e0 !important;
    }
    nav a:hover,
    nav a[class*="bg-gray"] {
      background-color: #4a0050 !important;
      color: #ff80ff !important;
    }

    /* Main content area */
    main {
      background-color: #1a0a1a !important;
    }

    /* Borders throughout */
    [class*="border-border"],
    [class*="border-secondary"],
    [class*="border-r"],
    [class*="border-b"] {
      border-color: #ff00ff30 !important;
    }

    /* Headings and primary text */
    h1, h2, h3, h4, h5, h6,
    [class*="font-semibold"],
    [class*="text-primary"],
    [class*="text-tertiary"] {
      color: #ff80ff !important;
    }

    /* Regular body text */
    p, span, div, td, th, li, a {
      color: #e8c0e8 !important;
    }

    /* Buttons – primary */
    button[class*="bg-brand"],
    button[class*="bg-blue"],
    [class*="bg-brand"],
    [role="button"][class*="bg-"] {
      background-color: #cc00cc !important;
      color: #fff !important;
    }
    button[class*="bg-brand"]:hover,
    button[class*="bg-blue"]:hover {
      background-color: #ff00ff !important;
    }

    /* Active/selected row or item */
    [class*="bg-gray-200"],
    [class*="bg-primary_hover"],
    tr:hover,
    [class*="hover\\:bg-"] {
      background-color: #3d0042 !important;
    }

    /* Badges / pills */
    [class*="bg-red"],
    [class*="bg-green"],
    [class*="bg-yellow"],
    [class*="bg-orange"] {
      filter: hue-rotate(300deg) saturate(1.3) !important;
    }

    /* Inputs and selects */
    input, select, textarea {
      background-color: #250030 !important;
      border-color: #ff00ff50 !important;
      color: #f0d0f0 !important;
    }
    input:focus, select:focus, textarea:focus {
      border-color: #ff00ff !important;
      outline-color: #ff00ff !important;
    }

    /* Links */
    a:hover {
      color: #ff40ff !important;
    }

    /* Scrollbar theming (Webkit) */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #1a0a1a;
    }
    ::-webkit-scrollbar-thumb {
      background: #80008080;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #cc00cc;
    }

    /* Table rows */
    table {
      border-color: #ff00ff30 !important;
    }
    tr {
      border-color: #ff00ff20 !important;
    }

    /* Cards / panels */
    [class*="rounded"] {
      border-color: #ff00ff25 !important;
    }

    /* Focus rings */
    *:focus-visible {
      outline-color: #ff00ff !important;
    }

    /* SVG icons pick up currentColor; tint nav icons */
    nav svg {
      color: inherit !important;
    }
  `;

  document.head.appendChild(style);
})();
