// Oz Site Customization Script
// ID: theatlantic-funny-headlines
// Version: 2.0.0
// Site: https://www.theatlantic.com/*
// Description: Replaces headlines on The Atlantic with funny parody versions.

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var PROCESSED_ATTR = "data-oz-funny-headline";
  var MIN_HEADLINE_LENGTH = 8;
  var OBSERVER_DEBOUNCE_MS = 250;
  var WAIT_TIMEOUT_MS = 4000;
  var WAIT_INTERVAL_MS = 200;

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  /**
   * Try an ordered list of CSS selectors and return the first matching element,
   * or null if none match.
   */
  function queryFirst(selectors, root) {
    root = root || document;
    for (var i = 0; i < selectors.length; i++) {
      try {
        var el = root.querySelector(selectors[i]);
        if (el) return el;
      } catch (_e) {
        // invalid selector in this browser – skip
      }
    }
    return null;
  }

  /**
   * Query all elements matching any of the given selectors.
   */
  function queryAll(selectors, root) {
    root = root || document;
    var results = [];
    for (var i = 0; i < selectors.length; i++) {
      try {
        var els = root.querySelectorAll(selectors[i]);
        for (var j = 0; j < els.length; j++) {
          results.push(els[j]);
        }
      } catch (_e) {
        // skip invalid selectors
      }
    }
    return results;
  }

  /**
   * Check that a node is usable for mutation: exists, is connected to the DOM,
   * and is an Element or Text node.
   */
  function isUsableNode(node) {
    return (
      node != null &&
      (typeof node.isConnected === "undefined" || node.isConnected) &&
      (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE)
    );
  }

  /**
   * Wait for a condition function to return a truthy value, with a bounded
   * timeout. Returns a Promise that resolves with the condition's result or
   * rejects on timeout.
   */
  function waitFor(conditionFn, opts) {
    var timeoutMs = (opts && opts.timeoutMs) || WAIT_TIMEOUT_MS;
    var intervalMs = (opts && opts.intervalMs) || WAIT_INTERVAL_MS;

    return new Promise(function (resolve, reject) {
      var elapsed = 0;
      var check = function () {
        var result;
        try {
          result = conditionFn();
        } catch (_e) {
          // condition threw – treat as not-yet-ready
        }
        if (result) {
          resolve(result);
          return;
        }
        elapsed += intervalMs;
        if (elapsed >= timeoutMs) {
          reject(new Error("waitFor timed out after " + timeoutMs + "ms"));
          return;
        }
        setTimeout(check, intervalMs);
      };
      check();
    });
  }

  /**
   * Wrap a named mutation in a try/catch. Returns { ok, warning? }.
   */
  function safeMutate(name, fn) {
    try {
      fn();
      return { ok: true };
    } catch (err) {
      var msg = "[oz] safeMutate(" + name + ") warning: " + (err && err.message ? err.message : err);
      console.warn(msg);
      return { ok: false, warning: msg };
    }
  }

  // ---------------------------------------------------------------------------
  // Deterministic hash for consistent transformation selection
  // ---------------------------------------------------------------------------

  function hashString(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  // ---------------------------------------------------------------------------
  // Funny headline transformations
  // ---------------------------------------------------------------------------

  var transformations = [
    // Dramatic parenthetical
    function (text) {
      var additions = [
        " (And No One Is Ready)",
        " (Experts Are Baffled)",
        " (Again?!)",
        " (But in a Fun Way)",
        " (You Won't Believe What Happens Next)",
        " (Sources: Trust Me, Bro)",
        " (Plot Twist Incoming)",
        " (Sent From My iPhone)",
      ];
      return text + additions[hashString(text) % additions.length];
    },
    // Absurd prefix
    function (text) {
      var prefixes = [
        "Wait, Seriously? ",
        "Breaking: Local Man Discovers ",
        "Scientists Confirm: ",
        "Exclusive: Your Cat Already Knew About ",
        "Hot Take: ",
        "Unpopular Opinion: ",
        "In a Shocking Turn of Events: ",
        "Area Grandma Reports: ",
      ];
      return prefixes[hashString(text) % prefixes.length] + text;
    },
    // Clickbait suffix
    function (text) {
      var suffixes = [
        " — and It's Hilarious",
        " — the Internet Has Thoughts",
        " — Millennials Are Somehow to Blame",
        " — and Honestly, Same",
        " — This Changes Everything",
        " — Here's Why That Matters for Your Lunch",
        " — Your Move, Science",
        " — and Twitter Is Losing It",
      ];
      return text + suffixes[hashString(text) % suffixes.length];
    },
    // Bureaucratic voice
    function (text) {
      var frames = [
        "Per My Last Email: ",
        "As Per the Prophecy: ",
        "HR Would Like to Remind You: ",
        "The Committee Has Decided: ",
        "According to My Horoscope: ",
        "The Algorithm Has Spoken: ",
        "Your Uber Driver Thinks: ",
      ];
      return frames[hashString(text) % frames.length] + text;
    },
    // Movie trailer voice
    function (text) {
      var frames = [
        "In a World Where " + text + "... One Person Dared to Click.",
        "This Summer: " + text + " — Rated PG-13.",
        "From the Studio That Brought You Nothing: " + text,
        text + " — The Movie. Coming Never.",
        "One Headline. One Chance. " + text,
      ];
      return frames[hashString(text) % frames.length];
    },
  ];

  function makeHeadlineFunny(originalText) {
    var trimmed = originalText.trim();
    if (!trimmed) return originalText;
    var hash = hashString(trimmed);
    var transform = transformations[hash % transformations.length];
    return transform(trimmed);
  }

  // ---------------------------------------------------------------------------
  // Headline selectors (ordered by expected stability)
  // ---------------------------------------------------------------------------

  var HEADLINE_SELECTORS = [
    '[data-testid*="Hed"]',
    '[class*="ArticleHed"]',
    '[class*="article-title"]',
    "article h2",
    "article h3",
    "h1",
    "h2",
    "h3",
    "h4",
  ];

  // Build `:not([data-oz-funny-headline])` variants to skip already-processed
  function unprocessedSelectors() {
    return HEADLINE_SELECTORS.map(function (s) {
      return s + ":not([" + PROCESSED_ATTR + "])";
    });
  }

  // ---------------------------------------------------------------------------
  // Core processing step
  // ---------------------------------------------------------------------------

  function processHeadlines() {
    var warnings = [];
    var elements = queryAll(unprocessedSelectors());

    if (!elements.length) {
      return { ok: true, warnings: warnings };
    }

    // De-duplicate (a node may match multiple selectors)
    var seen = new Set();
    var unique = [];
    for (var i = 0; i < elements.length; i++) {
      if (!seen.has(elements[i])) {
        seen.add(elements[i]);
        unique.push(elements[i]);
      }
    }

    unique.forEach(function (el) {
      if (!isUsableNode(el)) return;

      var text = el.textContent;
      if (!text || text.trim().length < MIN_HEADLINE_LENGTH) return;

      // Mark processed before mutating for idempotency
      el.setAttribute(PROCESSED_ATTR, "true");

      var result = safeMutate("headline:" + text.trim().slice(0, 40), function () {
        // Walk text nodes to preserve child element structure (links, spans, etc.)
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        var firstTextNode = null;
        var textNodes = [];
        var allText = "";

        while (walker.nextNode()) {
          var node = walker.currentNode;
          if (node.textContent && node.textContent.trim()) {
            textNodes.push(node);
            allText += node.textContent;
            if (!firstTextNode) firstTextNode = node;
          }
        }

        if (!firstTextNode || !isUsableNode(firstTextNode)) return;

        var funnyText = makeHeadlineFunny(allText);

        if (textNodes.length === 1) {
          firstTextNode.textContent = funnyText;
        } else {
          // Multi-node: place full transformed text in first node, clear rest
          firstTextNode.textContent = funnyText;
          for (var j = 1; j < textNodes.length; j++) {
            if (isUsableNode(textNodes[j])) {
              textNodes[j].textContent = "";
            }
          }
        }
      });

      if (!result.ok && result.warning) {
        warnings.push(result.warning);
      }
    });

    return { ok: true, warnings: warnings };
  }

  // ---------------------------------------------------------------------------
  // main() orchestrator
  // ---------------------------------------------------------------------------

  function main() {
    var warnings = [];

    // Step 1: Wait for body to be available (handles early injection)
    waitFor(function () {
      return document.body;
    }, { timeoutMs: WAIT_TIMEOUT_MS })
      .then(function () {
        // Step 2: Process headlines already in DOM
        var result = processHeadlines();
        if (result.warnings && result.warnings.length) {
          warnings = warnings.concat(result.warnings);
        }

        // Step 3: Observe for dynamically loaded content
        if (typeof MutationObserver !== "undefined") {
          var debounceTimer = null;
          var observer = new MutationObserver(function () {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
              var r = processHeadlines();
              if (r.warnings && r.warnings.length) {
                r.warnings.forEach(function (w) {
                  console.warn("[oz][theatlantic-funny-headlines]", w);
                });
              }
            }, OBSERVER_DEBOUNCE_MS);
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });
        }

        // Report accumulated warnings
        if (warnings.length) {
          console.warn(
            "[oz][theatlantic-funny-headlines] completed with " +
              warnings.length +
              " warning(s):",
            warnings
          );
        }
      })
      .catch(function (err) {
        // Unrecoverable: body never appeared
        console.error("[oz][theatlantic-funny-headlines] fatal:", err && err.message ? err.message : err);
      });
  }

  main();
})();
