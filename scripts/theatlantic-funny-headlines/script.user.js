// ==OzScript==
// @id          theatlantic-funny-headlines
// @version     1.0.0
// @match       https://www.theatlantic.com/*
// @description Makes headlines on The Atlantic funny by appending humorous editorial commentary.
// ==/OzScript==

(function () {
  'use strict';

  const MARKER_ATTR = 'data-oz-funny';

  // ── Humorous suffixes applied deterministically via simple hash ──

  const FUNNY_SUFFIXES = [
    ' (and Nobody Saw It Coming, Except Everyone)',
    ' — But in a Quirky Way',
    ' (Sent from My iPhone)',
    ' (This Time It\'s Personal)',
    ': A Love Story',
    ' (Gone Wrong)',
    ' — The Musical',
    ', According to My Cat',
    ' (Citation Needed)',
    ' (No, Seriously)',
    ' — Now With 50% More Drama',
    ', But Make It Fashion',
    ' (You Won\'t Believe What Happens Next)',
    ' — An Oral History',
    ', Explained With Sock Puppets',
    ' (A Memoir)',
    ' — The Sequel Nobody Asked For',
    ', But Funnier',
    ' (Allegedly)',
    ' — A Cautionary Tale',
  ];

  // ── Helpers ──

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function queryFirst(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch {
        // invalid selector, skip
      }
    }
    return null;
  }

  function queryAllHeadlines() {
    // Ordered from most-stable to least-stable selectors for The Atlantic headlines.
    const candidateSelectors = [
      'h2[data-testid]',
      'h3[data-testid]',
      'h4[data-testid]',
      'article h2',
      'article h3',
      'article h4',
      '[data-article-id] h2',
      '[data-article-id] h3',
      'main h2',
      'main h3',
      'main h4',
      'h2 a',
      'h3 a',
    ];

    const seen = new Set();
    const results = [];

    for (const sel of candidateSelectors) {
      try {
        const nodes = document.querySelectorAll(sel);
        for (const node of nodes) {
          // For anchor selectors, prefer the parent heading element if available.
          const target =
            node.tagName === 'A' && /^H[1-6]$/.test(node.parentElement?.tagName)
              ? node.parentElement
              : node;

          if (!seen.has(target) && isUsableNode(target)) {
            seen.add(target);
            results.push(target);
          }
        }
      } catch {
        // invalid selector, skip
      }
    }

    return results;
  }

  function isUsableNode(node) {
    return (
      node != null &&
      node.isConnected &&
      node.textContent.trim().length > 0 &&
      !node.hasAttribute(MARKER_ATTR)
    );
  }

  function waitFor(conditionFn, { timeoutMs = 5000, intervalMs = 200 } = {}) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const result = conditionFn();
        if (result) {
          resolve(result);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          resolve(null);
          return;
        }
        setTimeout(check, intervalMs);
      };
      check();
    });
  }

  function safeMutate(name, fn) {
    try {
      fn();
      return { ok: true };
    } catch (err) {
      return { ok: false, warning: `${name}: ${err.message}` };
    }
  }

  function getSuffix(text) {
    const idx = simpleHash(text) % FUNNY_SUFFIXES.length;
    return FUNNY_SUFFIXES[idx];
  }

  // ── Steps ──

  function applyFunnyHeadlines() {
    const headlines = queryAllHeadlines();
    const warnings = [];
    let applied = 0;

    for (const el of headlines) {
      // Re-check usability immediately before mutation.
      if (!isUsableNode(el)) continue;

      const originalText = el.textContent.trim();
      if (!originalText) continue;

      const suffix = getSuffix(originalText);

      const result = safeMutate(`headline[${applied}]`, () => {
        // Find the deepest text-bearing element to append to,
        // or fall back to the heading itself.
        const textNode = findDeepestTextNode(el);
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          textNode.textContent = textNode.textContent.trimEnd() + suffix;
        } else {
          el.textContent = originalText + suffix;
        }
        el.setAttribute(MARKER_ATTR, '1');
      });

      if (result.ok) {
        applied++;
      } else {
        warnings.push(result.warning);
      }
    }

    return { applied, warnings };
  }

  function findDeepestTextNode(el) {
    // Walk child nodes to find the last non-empty text node (typically the headline text).
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.textContent.trim().length > 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    let last = null;
    while (walker.nextNode()) {
      last = walker.currentNode;
    }
    return last;
  }

  // ── Main orchestrator ──

  async function main() {
    // Wait for at least one headline to appear in the DOM.
    await waitFor(
      () => {
        const headlines = queryAllHeadlines();
        return headlines.length > 0 ? true : null;
      },
      { timeoutMs: 8000, intervalMs: 300 },
    );

    const { applied, warnings } = applyFunnyHeadlines();

    if (warnings.length > 0) {
      console.warn('[oz:theatlantic-funny-headlines] Warnings:', warnings);
    }
    console.log(`[oz:theatlantic-funny-headlines] Applied to ${applied} headline(s).`);

    // Observe for late-loaded headlines (infinite scroll, SPA navigation).
    observeDynamicHeadlines();
  }

  function observeDynamicHeadlines() {
    try {
      const observer = new MutationObserver(() => {
        const headlines = queryAllHeadlines();
        if (headlines.length > 0) {
          applyFunnyHeadlines();
        }
      });

      const target = document.querySelector('main') || document.body;
      if (target) {
        observer.observe(target, { childList: true, subtree: true });
      }
    } catch (err) {
      console.warn('[oz:theatlantic-funny-headlines] Observer setup failed:', err.message);
    }
  }

  main();
})();
