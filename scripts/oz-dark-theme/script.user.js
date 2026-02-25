// ==UserScript==
// @name        Oz Dark Theme
// @namespace   dev.warp.oz.dark-theme
// @version     1.0.0
// @description Applies a dark color scheme to oz.warp.dev pages.
// @match       https://oz.warp.dev/*
// @run-at      document-start
// ==/UserScript==

(function ozDarkTheme() {
  "use strict";

  const STYLE_ID = "oz-dark-theme-style";

  // Guard: do not inject twice (idempotent on repeated runs).
  if (document.getElementById(STYLE_ID)) return;

  const css = `
    /* ===== Oz Dark Theme ===== */

    /* Base surface & text */
    html, body {
      background-color: #0d1117 !important;
      color: #c9d1d9 !important;
    }

    /* Generic light backgrounds → dark */
    .bg-primary,
    .bg-white,
    [class*="bg-gray-50"],
    [class*="bg-gray-100"],
    [class*="bg-gray-200"] {
      background-color: #161b22 !important;
    }

    .bg-primary_hover:hover,
    [class*="hover\\:bg-primary_hover"]:hover,
    [class*="hover\\:bg-gray-200"]:hover {
      background-color: #1c2128 !important;
    }

    /* Slightly elevated surfaces (cards, panels) */
    [class*="bg-secondary"],
    [class*="bg-gray-300"],
    [class*="bg-surface"] {
      background-color: #1c2128 !important;
    }

    /* Navigation sidebar */
    nav.flex {
      background-color: #0d1117 !important;
      border-color: #30363d !important;
    }

    /* Borders */
    [class*="border-border"],
    [class*="border-secondary"],
    .border-r,
    .border-b {
      border-color: #30363d !important;
    }

    /* Primary text */
    .text-fg-primary,
    [class*="text-primary"],
    [class*="text-gray-900"],
    [class*="text-gray-800"],
    [class*="text-gray-700"] {
      color: #c9d1d9 !important;
    }

    /* Secondary / tertiary text */
    .text-tertiary,
    .text-fg-quaternary,
    [class*="text-gray-600"],
    [class*="text-gray-500"],
    [class*="text-secondary"],
    [class*="text-tertiary"],
    [class*="text-quaternary"] {
      color: #8b949e !important;
    }

    .text-fg-quaternary_hover:hover,
    [class*="hover\\:text-fg-quaternary_hover"]:hover {
      color: #c9d1d9 !important;
    }

    /* Links */
    a {
      color: #58a6ff !important;
    }
    a:hover {
      color: #79c0ff !important;
    }
    /* Keep nav icon links from turning blue */
    nav a {
      color: inherit !important;
    }

    /* Buttons – primary */
    button[class*="bg-blue"],
    [class*="bg-brand"],
    [class*="btn-primary"] {
      background-color: #238636 !important;
      color: #ffffff !important;
    }

    /* Buttons – secondary / ghost */
    button[class*="bg-gray"],
    button[class*="bg-secondary"],
    [class*="btn-secondary"] {
      background-color: #21262d !important;
      color: #c9d1d9 !important;
      border-color: #30363d !important;
    }

    /* Table rows & striped lists */
    tr, li, [role="row"] {
      border-color: #21262d !important;
    }
    tr:nth-child(even), [role="row"]:nth-child(even) {
      background-color: #161b22 !important;
    }
    tr:hover, [role="row"]:hover {
      background-color: #1c2128 !important;
    }

    /* Inputs & selects */
    input, textarea, select, [role="combobox"] {
      background-color: #0d1117 !important;
      color: #c9d1d9 !important;
      border-color: #30363d !important;
    }
    input::placeholder, textarea::placeholder {
      color: #484f58 !important;
    }

    /* Status badges — keep colors readable */
    [class*="bg-red"],
    [class*="bg-error"] {
      background-color: #da3633 !important;
      color: #ffffff !important;
    }
    [class*="bg-green"],
    [class*="bg-success"] {
      background-color: #238636 !important;
      color: #ffffff !important;
    }
    [class*="bg-yellow"],
    [class*="bg-warning"] {
      background-color: #9e6a03 !important;
      color: #ffffff !important;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #0d1117;
    }
    ::-webkit-scrollbar-thumb {
      background: #30363d;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #484f58;
    }

    /* Toasts (sonner) */
    [data-sonner-toaster][data-sonner-theme="light"] {
      --normal-bg: #161b22 !important;
      --normal-border: #30363d !important;
      --normal-text: #c9d1d9 !important;
    }

    /* Misc overrides for white/light explicitly set */
    [style*="background-color: rgb(255, 255, 255)"],
    [style*="background-color: white"],
    [style*="background: white"],
    [style*="background: rgb(255, 255, 255)"] {
      background-color: #161b22 !important;
    }

    [style*="color: rgb(0, 0, 0)"],
    [style*="color: black"] {
      color: #c9d1d9 !important;
    }

    /* Avatar ring contrast fix */
    [data-avatar="true"] {
      outline-color: #30363d !important;
    }

    /* Code / pre blocks */
    pre, code {
      background-color: #0d1117 !important;
      color: #c9d1d9 !important;
    }

    /* Dialog / modal overlays */
    [role="dialog"],
    [class*="modal"],
    [class*="popover"],
    [class*="dropdown"] {
      background-color: #161b22 !important;
      border-color: #30363d !important;
      color: #c9d1d9 !important;
    }
  `;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;

  // Inject as early as possible to reduce flash of light theme.
  (document.head || document.documentElement).appendChild(style);
})();
