// ==OzScript==
// @id          theatlantic-dark-theme
// @version     1.0.0
// @match       *://www.theatlantic.com/*
// @description Apply a dark color scheme to The Atlantic website.
// ==/OzScript==

(function () {
  "use strict";

  const SCRIPT_ID = "theatlantic-dark-theme";
  const STYLE_ID = `${SCRIPT_ID}__injected-style`;

  // ---------------------------------------------------------------------------
  // 1. Shared helpers
  // ---------------------------------------------------------------------------

  /** Accumulates non-fatal warnings for completion reporting. */
  const warnings = [];

  function warn(step, msg) {
    const text = `[${SCRIPT_ID}] ${step}: ${msg}`;
    warnings.push(text);
    console.warn(text);
  }

  /** Returns the first element matched by an ordered list of selectors. */
  function queryFirst(selectors, root = document) {
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (_) {
        // invalid selector – skip
      }
    }
    return null;
  }

  /** Check that a node is usable for mutation. */
  function isUsableNode(node) {
    return node != null && node.isConnected;
  }

  /**
   * Bounded wait for a condition.
   * Resolves `true` when `conditionFn()` is truthy, `false` on timeout.
   */
  function waitFor(conditionFn, { timeoutMs = 5000, intervalMs = 200 } = {}) {
    return new Promise((resolve) => {
      if (conditionFn()) return resolve(true);
      const start = Date.now();
      const timer = setInterval(() => {
        if (conditionFn()) {
          clearInterval(timer);
          return resolve(true);
        }
        if (Date.now() - start >= timeoutMs) {
          clearInterval(timer);
          return resolve(false);
        }
      }, intervalMs);
    });
  }

  /**
   * Wrap a DOM mutation in try/catch; record warning on failure.
   * Returns { ok, warning? }.
   */
  function safeMutate(name, fn) {
    try {
      fn();
      return { ok: true };
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      warn(name, msg);
      return { ok: false, warning: msg };
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Dark-theme CSS
  // ---------------------------------------------------------------------------

  const DARK_CSS = `
    /* ── Base dark background & text ───────────────────────────────────────── */
    html, body {
      background-color: #1a1a1a !important;
      color: #d4d4d4 !important;
    }

    /* Broad container / section overrides */
    article, section, aside, nav, header, footer, main, div, span, p, li, td, th,
    figure, figcaption, blockquote, details, summary, form, fieldset, legend,
    .c-article, .c-article__body, .c-article__header,
    [class*="ArticleBody"], [class*="article-body"],
    [class*="NavBar"], [class*="navbar"], [class*="nav-bar"],
    [class*="Footer"], [class*="footer"],
    [class*="Header"], [class*="header"],
    [class*="Card"], [class*="card"],
    [class*="Banner"], [class*="banner"],
    [class*="Recirc"], [class*="recirc"],
    [class*="Promo"], [class*="promo"],
    [class*="Sidebar"], [class*="sidebar"],
    [data-section-title],
    [role="main"], [role="banner"], [role="navigation"], [role="contentinfo"] {
      background-color: inherit !important;
      color: inherit !important;
    }

    /* Links */
    a, a:visited {
      color: #6db3f2 !important;
    }
    a:hover, a:focus {
      color: #93c9ff !important;
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      color: #e8e8e8 !important;
    }

    /* Input / form elements */
    input, textarea, select, button {
      background-color: #2a2a2a !important;
      color: #d4d4d4 !important;
      border-color: #444 !important;
    }

    /* Code / pre */
    pre, code {
      background-color: #2a2a2a !important;
      color: #c8d3d5 !important;
    }

    /* Tables */
    table, tr, td, th {
      background-color: #1f1f1f !important;
      color: #d4d4d4 !important;
      border-color: #444 !important;
    }

    /* Preserve images, videos, and media – do NOT invert or dim them */
    img, video, picture, canvas, svg, iframe,
    [role="img"] {
      /* leave untouched */
    }

    /* Slightly brighten images that are used as background decorations */
    [style*="background-image"] {
      filter: brightness(0.85) !important;
    }

    /* Override bright inline backgrounds that sites sometimes set */
    [style*="background-color: #fff"],
    [style*="background-color: white"],
    [style*="background: #fff"],
    [style*="background: white"],
    [style*="background-color:#fff"],
    [style*="background-color:white"],
    [style*="background:#fff"],
    [style*="background:white"],
    [style*="background-color: rgb(255"],
    [style*="background-color:rgb(255"] {
      background-color: #1a1a1a !important;
    }

    /* Ensure scrollbar blends */
    ::-webkit-scrollbar {
      background: #1a1a1a;
      width: 10px;
    }
    ::-webkit-scrollbar-thumb {
      background: #555;
      border-radius: 5px;
    }

    /* Reduce harsh box-shadows */
    * {
      box-shadow: none !important;
    }

    /* ── Atlantic-specific overrides ──────────────────────────────────────── */
    /* Top navigation bar */
    [class*="NavigationBar"], [class*="navigation-bar"],
    [class*="SiteNav"], [class*="site-nav"],
    [id*="nav"], [id*="Nav"] {
      background-color: #111 !important;
      color: #d4d4d4 !important;
    }

    /* Article cards / teasers */
    [class*="ArticleCard"], [class*="article-card"],
    [class*="ContentCard"], [class*="content-card"],
    [class*="Tease"], [class*="tease"],
    [class*="Lead"], [class*="lead"] {
      background-color: #222 !important;
      color: #d4d4d4 !important;
    }

    /* Paywall / gate overlays */
    [class*="Paywall"], [class*="paywall"],
    [class*="Gate"], [class*="gate"],
    [class*="Meter"], [class*="meter"] {
      background-color: #1a1a1a !important;
      color: #d4d4d4 !important;
    }

    /* Newsletter / promo banners */
    [class*="Newsletter"], [class*="newsletter"],
    [class*="Signup"], [class*="signup"] {
      background-color: #222 !important;
      color: #d4d4d4 !important;
    }

    /* Sticky / fixed bars */
    [class*="StickyBar"], [class*="sticky-bar"],
    [class*="FixedBar"], [class*="fixed-bar"] {
      background-color: #111 !important;
    }

    /* Borders that look too bright */
    hr {
      border-color: #333 !important;
    }
  `;

  // ---------------------------------------------------------------------------
  // 3. Steps
  // ---------------------------------------------------------------------------

  /** Step: ensure <head> is available. */
  async function stepEnsureHead() {
    const ready = await waitFor(() => document.head, {
      timeoutMs: 5000,
      intervalMs: 100,
    });
    if (!ready) {
      return { ok: false, warning: "document.head not available within timeout" };
    }
    return { ok: true };
  }

  /** Step: inject the dark-theme stylesheet (idempotent). */
  function stepInjectStyle() {
    // Idempotency: remove a previously injected style if present.
    const existing = document.getElementById(STYLE_ID);
    if (isUsableNode(existing)) {
      existing.remove();
    }

    return safeMutate("injectStyle", () => {
      const head = document.head;
      if (!isUsableNode(head)) {
        throw new Error("document.head disappeared before injection");
      }
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = DARK_CSS;
      head.appendChild(style);
    });
  }

  /** Step: set color-scheme meta hint so browser chrome cooperates. */
  function stepSetColorScheme() {
    return safeMutate("setColorScheme", () => {
      let meta = queryFirst([
        'meta[name="color-scheme"]',
        'meta[name="theme-color"]',
      ]);

      if (meta && meta.name === "color-scheme") {
        meta.content = "dark";
        return;
      }

      // Insert a new <meta name="color-scheme" content="dark">
      const head = document.head;
      if (!isUsableNode(head)) return;
      meta = document.createElement("meta");
      meta.name = "color-scheme";
      meta.content = "dark";
      head.appendChild(meta);
    });
  }

  /** Step: force html element class / attribute for downstream CSS that keys on it. */
  function stepSetHtmlDarkAttribute() {
    return safeMutate("setHtmlDarkAttribute", () => {
      const html = document.documentElement;
      if (!isUsableNode(html)) return;
      html.setAttribute(`data-${SCRIPT_ID}`, "active");
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Orchestrator
  // ---------------------------------------------------------------------------

  async function main() {
    const results = [];

    const headResult = await stepEnsureHead();
    results.push({ step: "ensureHead", ...headResult });
    if (!headResult.ok) {
      warn("main", "Aborting: head element not available.");
      return;
    }

    results.push({ step: "injectStyle", ...stepInjectStyle() });
    results.push({ step: "setColorScheme", ...stepSetColorScheme() });
    results.push({
      step: "setHtmlDarkAttribute",
      ...stepSetHtmlDarkAttribute(),
    });

    // Summary
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      console.warn(
        `[${SCRIPT_ID}] Completed with ${failed.length} warning(s):`,
        failed
      );
    } else {
      console.info(`[${SCRIPT_ID}] Dark theme applied successfully.`);
    }
  }

  // Kick off
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main, { once: true });
  } else {
    main();
  }
})();
