// ==UserScript==
// @name        Oz Dark Theme
// @match       https://oz.warp.dev/*
// @description Applies a dark theme to the Oz dashboard (oz.warp.dev).
// ==/UserScript==

(function () {
  'use strict';

  const STYLE_ID = 'oz-dark-theme-override';

  // Guard: avoid duplicate injection on repeated runs.
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const css = `
    /* ===== Oz Dark Theme ===== */

    /* Root overrides */
    html, body {
      background-color: #121212 !important;
      color: #e0e0e0 !important;
      color-scheme: dark !important;
    }

    /* Primary surface / nav */
    .bg-primary,
    nav,
    [class*="bg-primary"] {
      background-color: #1a1a1a !important;
    }

    .bg-primary_hover:hover,
    [class*="bg-primary_hover"]:hover {
      background-color: #252525 !important;
    }

    /* Main content area */
    main,
    main > div {
      background-color: #121212 !important;
    }

    /* Cards and containers */
    [class*="bg-white"],
    [class*="bg-gray-50"],
    [class*="bg-gray-100"] {
      background-color: #1e1e1e !important;
    }

    [class*="bg-gray-200"] {
      background-color: #2a2a2a !important;
    }

    /* Borders */
    [class*="border-border"],
    [class*="border-secondary"],
    [class*="border-r"],
    [class*="border-b"] {
      border-color: #333333 !important;
    }

    /* Text colors */
    [class*="text-fg-primary"],
    [class*="text-primary"],
    .text-sm,
    span, p, div, a, td, th, li, label, h1, h2, h3, h4, h5, h6 {
      color: #e0e0e0 !important;
    }

    [class*="text-fg-secondary"],
    [class*="text-secondary"],
    [class*="text-tertiary"],
    [class*="text-fg-quaternary"] {
      color: #a0a0a0 !important;
    }

    [class*="text-fg-quaternary_hover"]:hover {
      color: #cccccc !important;
    }

    /* Links */
    a {
      color: #6db3f2 !important;
    }

    a:hover {
      color: #90caf9 !important;
    }

    /* Buttons */
    button,
    [role="button"] {
      background-color: #2a2a2a !important;
      color: #e0e0e0 !important;
      border-color: #444444 !important;
    }

    button:hover,
    [role="button"]:hover {
      background-color: #363636 !important;
    }

    /* Brand / accent buttons – preserve brand color */
    button[class*="bg-blue"],
    button[class*="bg-brand"],
    [class*="bg-blue-500"],
    [class*="bg-blue-600"] {
      background-color: #1565c0 !important;
      color: #ffffff !important;
    }

    button[class*="bg-blue"]:hover,
    button[class*="bg-brand"]:hover {
      background-color: #1976d2 !important;
    }

    /* Tables / rows */
    tr, thead, tbody {
      background-color: #1e1e1e !important;
      border-color: #333333 !important;
    }

    tr:hover {
      background-color: #262626 !important;
    }

    th {
      background-color: #1a1a1a !important;
      color: #a0a0a0 !important;
    }

    /* Inputs / selects */
    input, textarea, select {
      background-color: #2a2a2a !important;
      color: #e0e0e0 !important;
      border-color: #444444 !important;
    }

    input::placeholder,
    textarea::placeholder {
      color: #888888 !important;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #1a1a1a;
    }

    ::-webkit-scrollbar-thumb {
      background: #444444;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #555555;
    }

    /* Badges / status chips */
    [class*="bg-red"] {
      background-color: #b71c1c !important;
      color: #ffcdd2 !important;
    }

    [class*="bg-green"] {
      background-color: #1b5e20 !important;
      color: #c8e6c9 !important;
    }

    [class*="bg-yellow"],
    [class*="bg-amber"] {
      background-color: #f57f17 !important;
      color: #fff9c4 !important;
    }

    /* SVG icons – inherit current text color */
    svg {
      color: inherit !important;
    }

    /* Dropdown / popover / dialog overlays */
    [role="dialog"],
    [role="menu"],
    [role="listbox"],
    [data-radix-popper-content-wrapper],
    [class*="popover"],
    [class*="dropdown"] {
      background-color: #1e1e1e !important;
      border-color: #333333 !important;
      color: #e0e0e0 !important;
    }

    /* Toast overrides (Sonner) */
    [data-sonner-toaster] {
      --normal-bg: #1e1e1e !important;
      --normal-border: #333333 !important;
      --normal-text: #e0e0e0 !important;
    }

    /* Avatar ring – keep visible */
    [data-avatar] {
      outline-color: #444444 !important;
    }

    /* Ensure code / pre blocks are dark */
    pre, code {
      background-color: #1a1a1a !important;
      color: #c5c8c6 !important;
    }
  `;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
})();
