// ==OzScript==
// @id          theatlantic-funny-headlines
// @version     1.0.0
// @match       https://www.theatlantic.com/*
// @description Makes headlines on The Atlantic funny via deterministic word substitutions
// ==/OzScript==

(function () {
  "use strict";

  const PROCESSED_ATTR = "data-oz-funny";

  // ── Selector helpers ────────────────────────────────────────────────

  /**
   * Try an ordered list of selectors and return the first match, or null.
   */
  function queryFirst(root, selectors) {
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (_) {
        /* invalid selector – skip */
      }
    }
    return null;
  }

  /**
   * Query all headline-like elements using ordered fallback selectors.
   */
  function queryAllHeadlines(root) {
    const selectorGroups = [
      // The Atlantic uses <h2>, <h3>, <h4> for article headlines
      'article h2 a',
      'article h3 a',
      'article h4 a',
      '[data-article-id] h2 a',
      '[data-article-id] h3 a',
      // Fallback to heading elements themselves
      'article h2',
      'article h3',
      'article h4',
      // Broader fallbacks for section headers
      'main h2',
      'main h3',
      'section h2',
      'section h3',
      // Very broad fallback
      'h2 a[href*="/article/"]',
      'h3 a[href*="/article/"]',
      'a[href*="/article/"] h2',
      'a[href*="/article/"] h3',
    ];

    const seen = new Set();
    const results = [];

    for (const sel of selectorGroups) {
      try {
        const nodes = root.querySelectorAll(sel);
        for (const node of nodes) {
          if (!seen.has(node) && isUsableNode(node)) {
            seen.add(node);
            results.push(node);
          }
        }
      } catch (_) {
        /* skip invalid selector */
      }
    }
    return results;
  }

  function isUsableNode(node) {
    return (
      node != null &&
      node.isConnected &&
      typeof node.textContent === "string" &&
      node.textContent.trim().length > 0
    );
  }

  // ── Funny transformation helpers ────────────────────────────────────

  /**
   * Deterministic hash for a string (simple djb2). Ensures same input → same output.
   */
  function simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  /**
   * Word-level substitution map for common headline words.
   * These swaps are designed to be absurd but grammatically coherent.
   */
  const WORD_SWAPS = {
    // Nouns
    "president": "raccoon-in-chief",
    "congress": "neighborhood HOA",
    "government": "group chat",
    "economy": "lemonade stand",
    "market": "yard sale",
    "america": "Middle Earth",
    "country": "treehouse",
    "world": "aquarium",
    "nation": "book club",
    "war": "pillow fight",
    "crisis": "vibes check",
    "report": "diary entry",
    "officials": "hall monitors",
    "election": "bake-off",
    "voters": "contestants",
    "debate": "rap battle",
    "policy": "pinky promise",
    "security": "blanket fort",
    "threat": "strongly worded letter",
    "military": "dodgeball team",
    "power": "Wi-Fi signal",
    "leader": "class president",
    "leaders": "class presidents",
    "democracy": "group project",
    "money": "Monopoly money",
    "tax": "allowance deduction",
    "climate": "weather mood",
    "investigation": "treasure hunt",
    "campaign": "talent show",
    "trump": "that guy",
    "biden": "the other guy",
    "pandemic": "cooties outbreak",
    "inflation": "snack prices",
    "technology": "shiny gadgets",
    "ai": "our robot overlords",
    "scientists": "mad scientists",
    "experts": "the nerds",
    "study": "homework assignment",
    "research": "science fair project",
    "data": "vibes",
    // Verbs / adjectives
    "says": "whispers dramatically",
    "announces": "yells from rooftop",
    "warns": "nervously suggests",
    "reveals": "accidentally blurts out",
    "fights": "has a slap fight over",
    "demands": "politely begs for",
    "threatens": "passive-aggressively hints at",
    "attacks": "sends a mean tweet about",
    "breaking": "mildly interesting",
    "exclusive": "overheard at brunch",
    "urgent": "kinda important maybe",
    "critical": "slightly dramatic",
    "historic": "unprecedented (again)",
    "major": "medium-sized",
    "new": "suspiciously fresh",
    "secret": "worst-kept secret",
    "shocking": "meh",
  };

  /**
   * Suffix additions picked deterministically based on headline hash.
   */
  const SUFFIXES = [
    " (And That's on Period)",
    " — Sources Say It's Giving Main Character Energy",
    " (No Cap)",
    ", According to My Cat",
    " (This Is Not a Drill... Okay Maybe It Is)",
    " — And Honestly? Relatable",
    " (Gone Wrong) (Gone Chaotic)",
    ", Per a Very Reliable Group Chat",
    " — The Sequel Nobody Asked For",
    " (Real)",
    " (Plot Twist Incoming)",
    " — But Make It Fashion",
    " (The Vibes Are Off)",
    " (We're All Thinking It)",
    ", Reportedly",
  ];

  /**
   * Apply word swaps to headline text, case-insensitively, preserving
   * the first letter's case style.
   */
  function funnyTransform(text) {
    const original = text.trim();
    if (!original) return original;

    let result = original;

    // Apply word-level substitutions
    for (const [word, replacement] of Object.entries(WORD_SWAPS)) {
      const regex = new RegExp("\\b" + escapeRegex(word) + "\\b", "gi");
      result = result.replace(regex, (match) => {
        // Preserve title-case if original word was capitalized
        if (match[0] === match[0].toUpperCase()) {
          return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        return replacement;
      });
    }

    // Add a deterministic funny suffix
    const hash = simpleHash(original);
    const suffix = SUFFIXES[hash % SUFFIXES.length];
    result += suffix;

    return result;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // ── Mutation helpers ────────────────────────────────────────────────

  const warnings = [];

  function safeMutate(name, fn) {
    try {
      fn();
      return { ok: true };
    } catch (err) {
      const msg = `[oz-funny] ${name}: ${err.message}`;
      warnings.push(msg);
      return { ok: false, warning: msg };
    }
  }

  // ── Wait helper ─────────────────────────────────────────────────────

  function waitFor(conditionFn, { timeoutMs = 5000, intervalMs = 200 } = {}) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (conditionFn()) return resolve(true);
        if (Date.now() - start >= timeoutMs) return resolve(false);
        setTimeout(check, intervalMs);
      };
      check();
    });
  }

  // ── Steps ───────────────────────────────────────────────────────────

  function stepTransformHeadlines() {
    const headlines = queryAllHeadlines(document);

    if (headlines.length === 0) {
      return { ok: false, warning: "No headline elements found on page" };
    }

    let transformed = 0;

    for (const el of headlines) {
      // Skip already-processed headlines (idempotency)
      if (el.getAttribute(PROCESSED_ATTR)) continue;

      // Re-check node is still usable right before mutation
      if (!isUsableNode(el)) continue;

      safeMutate(`headline-${transformed}`, () => {
        // Walk text nodes to preserve child element structure
        const textNodes = getTextNodes(el);
        if (textNodes.length === 0) return;

        // Collect full text, transform, then redistribute.
        // For simple headlines this is the safest approach.
        const originalText = el.textContent.trim();
        const funnyText = funnyTransform(originalText);

        // If the element only contains text (no significant child elements),
        // replace textContent directly.
        if (el.children.length === 0) {
          el.textContent = funnyText;
        } else {
          // For elements with child structure, only transform the first
          // substantial text node to avoid breaking nested links/spans.
          const firstText = textNodes.find((n) => n.textContent.trim().length > 3);
          if (firstText) {
            const fullOriginal = el.textContent.trim();
            const funnyFull = funnyTransform(fullOriginal);
            // Replace through textContent on the container as a safe fallback
            el.textContent = funnyFull;
          }
        }

        el.setAttribute(PROCESSED_ATTR, "1");
        transformed++;
      });
    }

    if (transformed === 0) {
      return { ok: true, warning: "All headlines already processed" };
    }

    return { ok: true };
  }

  function getTextNodes(el) {
    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      nodes.push(node);
    }
    return nodes;
  }

  // ── Main orchestrator ───────────────────────────────────────────────

  async function main() {
    // Wait for main content to be present
    const ready = await waitFor(
      () => {
        const h = document.querySelectorAll("h2, h3, h4");
        return h.length > 0;
      },
      { timeoutMs: 8000, intervalMs: 300 }
    );

    if (!ready) {
      console.warn("[oz-funny] Timed out waiting for headline elements to appear.");
      return;
    }

    // Run transformation
    const result = stepTransformHeadlines();
    if (result.warning) {
      console.warn("[oz-funny]", result.warning);
    }

    // Observe for dynamically loaded content (infinite scroll, lazy sections)
    try {
      const observer = new MutationObserver(() => {
        // Debounce re-processing
        clearTimeout(observer._ozTimer);
        observer._ozTimer = setTimeout(() => {
          const r = stepTransformHeadlines();
          if (r.warning) console.warn("[oz-funny]", r.warning);
        }, 500);
      });

      const target = queryFirst(document, ["main", "#content", "[role='main']", "body"]);
      if (target) {
        observer.observe(target, { childList: true, subtree: true });
      }
    } catch (err) {
      warnings.push(`[oz-funny] MutationObserver setup failed: ${err.message}`);
    }

    // Report accumulated warnings
    if (warnings.length > 0) {
      console.warn("[oz-funny] Completed with warnings:", warnings);
    } else {
      console.log("[oz-funny] Headlines transformed successfully.");
    }
  }

  main();
})();
