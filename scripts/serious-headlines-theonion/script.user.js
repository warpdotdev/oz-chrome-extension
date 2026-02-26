// ==OzScript==
// @id          serious-headlines-theonion
// @version     1.0.0
// @match       https://theonion.com/*
// @description Make all headlines on The Onion appear serious and credible.
// ==/OzScript==

(function () {
  'use strict';

  const SCRIPT_ID = 'serious-headlines-theonion';
  const PROCESSED_ATTR = `data-${SCRIPT_ID}-processed`;
  const warnings = [];

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  function isUsableNode(node) {
    return node != null && node.isConnected && node.nodeType === Node.ELEMENT_NODE;
  }

  function queryFirst(selectors, root) {
    const base = root || document;
    for (const sel of selectors) {
      try {
        const el = base.querySelector(sel);
        if (isUsableNode(el)) return el;
      } catch (_) {
        // invalid selector – skip
      }
    }
    return null;
  }

  function queryAllHeadlines(root) {
    const base = root || document;
    // The Onion uses <h2>, <h3>, <h4> for article headlines, and
    // .wp-block-post-title for the main featured post title.
    // Also include generic heading links inside article cards.
    const selectors = [
      'h1.wp-block-post-title',
      'h2.wp-block-post-title',
      'h2.wp-block-heading',
      'h3.wp-block-heading',
      'article h2 a',
      'article h3 a',
      'article h4 a',
      'h2 a[rel="bookmark"]',
      'h3 a[rel="bookmark"]',
      '.post-title',
      '.entry-title',
      '.entry-title a',
    ];
    const seen = new Set();
    const results = [];
    for (const sel of selectors) {
      try {
        base.querySelectorAll(sel).forEach((el) => {
          if (isUsableNode(el) && !seen.has(el) && !el.hasAttribute(PROCESSED_ATTR)) {
            seen.add(el);
            results.push(el);
          }
        });
      } catch (_) {
        // skip invalid selector
      }
    }
    // Fallback: grab any heading inside <main> or <body> that looks like a link headline
    if (results.length === 0) {
      try {
        const container = base.querySelector('main') || base.body || base;
        container.querySelectorAll('h1, h2, h3, h4').forEach((el) => {
          if (isUsableNode(el) && !seen.has(el) && !el.hasAttribute(PROCESSED_ATTR)) {
            const text = (el.textContent || '').trim();
            if (text.length > 5 && text.length < 300) {
              seen.add(el);
              results.push(el);
            }
          }
        });
      } catch (_) {
        // skip
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Headline rewriting logic
  // ---------------------------------------------------------------------------

  /**
   * Applies a series of deterministic text transforms to make a satirical
   * headline read as a straight, serious news headline.
   *
   * Because we cannot call an external API from a content script, we use
   * pattern-based heuristics that cover The Onion's common comedic devices:
   *   - hyperbolic qualifiers
   *   - absurd specificity
   *   - editorializing / scare quotes
   *   - comedic attribution
   *   - profanity / slang
   */
  function makeSerious(text) {
    if (!text || typeof text !== 'string') return text;

    let s = text.trim();
    const original = s;

    // 1. Remove scare quotes around individual words/phrases
    s = s.replace(/[''](.*?)['']/g, '$1');
    s = s.replace(/[""](.*?)[""]/g, '$1');

    // 2. Replace hyperbolic qualifiers with measured alternatives
    const hyperboleMap = [
      [/\bAbsolutely\s+/gi, ''],
      [/\bLiterally\s+/gi, ''],
      [/\bTotally\s+/gi, ''],
      [/\bCompletely\s+/gi, ''],
      [/\bInsanely\s+/gi, 'Notably '],
      [/\bHorrifyingly\s+/gi, 'Concerning '],
      [/\bTerrifyingly\s+/gi, 'Alarmingly '],
      [/\bHeartbreakingly\s+/gi, 'Regrettably '],
      [/\bBrutally\s+/gi, 'Frankly '],
      [/\bDisgustingly\s+/gi, 'Remarkably '],
      [/\bPathetically\s+/gi, 'Modestly '],
      [/\bHilariously\s+/gi, 'Unexpectedly '],
      [/\bNation['']?s\s+/gi, "Nation's "],
      [/\bArea\s+Man\b/gi, 'Local Resident'],
      [/\bArea\s+Woman\b/gi, 'Local Resident'],
      [/\bArea\s+Teen\b/gi, 'Local Teenager'],
      [/\bArea\s+Dad\b/gi, 'Local Father'],
      [/\bArea\s+Mom\b/gi, 'Local Mother'],
      [/\bArea\s+Child\b/gi, 'Local Child'],
      [/\bHoly\s+Shit\b/gi, 'Breaking News'],
      [/\bHoly\s+Fuck\b/gi, 'Breaking News'],
      [/\bWhat\s+The\s+Fuck\b/gi, 'Unexpected Development'],
      [/\bNo\s+Fucking\s+Way\b/gi, 'Surprising Turn'],
      [/\bFucking\s+/gi, ''],
      [/\bShitty\s+/gi, 'Substandard '],
      [/\bShit\b/gi, 'Situation'],
      [/\bDumbass\b/gi, 'Individual'],
      [/\bDumbasses\b/gi, 'Individuals'],
      [/\bBullshit\b/gi, 'Misinformation'],
      [/\bGoddamn\s*/gi, ''],
      [/\bFreaking\s+/gi, ''],
      [/\bFreakin['']?\s+/gi, ''],
    ];

    for (const [pattern, replacement] of hyperboleMap) {
      s = s.replace(pattern, replacement);
    }

    // 3. Remove trailing editorial asides like ", Sources Say" or ", Report Confirms"
    s = s.replace(/,\s*(Sources?\s+Say|Report\s+Confirms?|Experts?\s+Say|Nation\s+Reports?|Everyone\s+Agrees?|Officials?\s+Say|Study\s+Finds?)\s*$/i, '');

    // 4. Normalize double/trailing spaces introduced by replacements
    s = s.replace(/\s{2,}/g, ' ').trim();

    // 5. Ensure first letter is capitalized after transforms
    if (s.length > 0) {
      s = s.charAt(0).toUpperCase() + s.slice(1);
    }

    // 6. If nothing changed, apply a light formality pass: remove leading
    //    colloquial starters like "Report:", "Study:", "God:" when they look
    //    like satirical attribution rather than real sourcing.
    if (s === original) {
      s = s.replace(/^(God|Christ|Jesus|Sweet\s+Lord|Oh\s+God)\s*:\s*/i, '');
      s = s.replace(/\s{2,}/g, ' ').trim();
      if (s.length > 0) {
        s = s.charAt(0).toUpperCase() + s.slice(1);
      }
    }

    return s;
  }

  // ---------------------------------------------------------------------------
  // Mutation wrapper
  // ---------------------------------------------------------------------------

  function safeMutate(name, fn) {
    try {
      fn();
      return { ok: true };
    } catch (err) {
      const msg = `[${SCRIPT_ID}] ${name}: ${err && err.message ? err.message : err}`;
      warnings.push(msg);
      return { ok: false, warning: msg };
    }
  }

  // ---------------------------------------------------------------------------
  // Core step: process all visible headlines
  // ---------------------------------------------------------------------------

  function processHeadlines() {
    const headlines = queryAllHeadlines(document);
    if (headlines.length === 0) {
      return { ok: true, warning: 'No unprocessed headlines found on page.' };
    }
    let processed = 0;
    for (const el of headlines) {
      safeMutate('rewrite-headline', () => {
        // Re-check usability before write
        if (!isUsableNode(el)) return;
        if (el.hasAttribute(PROCESSED_ATTR)) return;

        // Walk direct text nodes so we don't clobber child elements (images, spans, etc.)
        const textNodes = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent && node.textContent.trim().length > 0) {
            textNodes.push(node);
          }
        }

        if (textNodes.length === 0) {
          // Fallback: use textContent directly if no discrete text nodes
          const original = el.textContent || '';
          const serious = makeSerious(original);
          if (serious !== original) {
            el.textContent = serious;
            processed++;
          }
        } else {
          for (const tn of textNodes) {
            const original = tn.textContent || '';
            const serious = makeSerious(original);
            if (serious !== original) {
              tn.textContent = serious;
              processed++;
            }
          }
        }

        el.setAttribute(PROCESSED_ATTR, '1');
      });
    }
    return { ok: true, warning: processed === 0 ? 'Headlines found but none required changes.' : undefined };
  }

  // ---------------------------------------------------------------------------
  // Bounded wait helper
  // ---------------------------------------------------------------------------

  function waitFor(conditionFn, { timeoutMs = 5000, intervalMs = 200 } = {}) {
    return new Promise((resolve) => {
      if (conditionFn()) {
        resolve(true);
        return;
      }
      const start = Date.now();
      const timer = setInterval(() => {
        if (conditionFn() || Date.now() - start >= timeoutMs) {
          clearInterval(timer);
          resolve(conditionFn());
        }
      }, intervalMs);
    });
  }

  // ---------------------------------------------------------------------------
  // Observe future DOM changes to handle lazy/infinite scroll
  // ---------------------------------------------------------------------------

  function observeNewHeadlines() {
    try {
      const target = document.querySelector('main') || document.body;
      if (!target) return;

      const observer = new MutationObserver(() => {
        processHeadlines();
      });

      observer.observe(target, { childList: true, subtree: true });
    } catch (err) {
      warnings.push(`[${SCRIPT_ID}] observer setup failed: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Main orchestrator
  // ---------------------------------------------------------------------------

  async function main() {
    // Step 1: Wait for at least one heading to appear
    const hasHeadings = await waitFor(
      () => document.querySelectorAll('h1, h2, h3, h4').length > 0,
      { timeoutMs: 8000, intervalMs: 300 },
    );

    if (!hasHeadings) {
      warnings.push(`[${SCRIPT_ID}] Timed out waiting for headlines to render.`);
    }

    // Step 2: Process existing headlines
    const result = processHeadlines();
    if (result.warning) {
      warnings.push(result.warning);
    }

    // Step 3: Watch for dynamically loaded content
    observeNewHeadlines();

    // Step 4: Report
    if (warnings.length > 0) {
      console.warn(`[${SCRIPT_ID}] Completed with warnings:`, warnings);
    } else {
      console.log(`[${SCRIPT_ID}] All headlines processed successfully.`);
    }
  }

  // Entry – run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => main());
  } else {
    main();
  }
})();
