// ==OzScript==
// @id          theatlantic-headline-themes
// @version     1.0.0
// @match       https://www.theatlantic.com/
// @match       https://www.theatlantic.com
// @description Analyze today's headlines on The Atlantic for recurring themes and display a summary overlay.
// ==/OzScript==

(function () {
  "use strict";

  const OVERLAY_ID = "oz-headline-themes-overlay";

  // Guard: do not re-inject if already present.
  if (document.getElementById(OVERLAY_ID)) return;

  // ---------------------------------------------------------------------------
  // 1. Collect headlines
  // ---------------------------------------------------------------------------

  /**
   * Gather visible headline text from the page.  The Atlantic renders
   * headlines in <h2>, <h3>, and <h4> elements, often wrapped in <a> tags.
   * We also inspect any elements with common headline-like aria-roles or
   * data attributes as a fallback.
   */
  function collectHeadlines() {
    const selectors = [
      "h1 a",
      "h2 a",
      "h3 a",
      "h4 a",
      "h2",
      "h3",
      "[data-testid*='headline']",
      "[class*='headline']",
      "[class*='Headline']",
      "[role='heading']",
    ];

    const seen = new Set();
    const headlines = [];

    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (!els || els.length === 0) continue;

      for (const el of els) {
        const text = (el.textContent || "").trim();
        if (text.length < 8 || text.length > 300) continue; // skip noise
        const normalised = text.toLowerCase();
        if (seen.has(normalised)) continue;
        seen.add(normalised);
        headlines.push(text);
      }
    }

    return headlines;
  }

  // ---------------------------------------------------------------------------
  // 2. Theme extraction (client-side keyword clustering)
  // ---------------------------------------------------------------------------

  /** Common English stop-words to ignore during analysis. */
  const STOP_WORDS = new Set([
    "a","about","above","after","again","against","all","am","an","and","any",
    "are","aren't","as","at","be","because","been","before","being","below",
    "between","both","but","by","can","can't","could","couldn't","did","didn't",
    "do","does","doesn't","doing","don't","down","during","each","few","for",
    "from","further","get","got","had","hadn't","has","hasn't","have","haven't",
    "having","he","her","here","hers","herself","him","himself","his","how",
    "i","if","in","into","is","isn't","it","its","itself","just","let","like",
    "may","me","might","more","most","must","my","myself","new","no","nor","not",
    "now","of","off","on","once","one","only","or","other","our","ours",
    "ourselves","out","over","own","same","she","should","shouldn't","so",
    "some","such","than","that","the","their","theirs","them","themselves",
    "then","there","these","they","this","those","through","to","too","under",
    "until","up","us","very","was","wasn't","we","were","weren't","what","when",
    "where","which","while","who","whom","why","will","with","won't","would",
    "wouldn't","you","your","yours","yourself","yourselves","also","already",
    "another","back","been","even","every","first","going","goes","gone","good",
    "great","how's","it's","know","last","look","make","many","much","need",
    "never","next","nothing","old","people","really","right","said","say","says",
    "she's","since","still","take","tell","that's","there's","they're","think",
    "time","two","want","way","well","what's","who's","work","world","year",
    "years","long","come","made","part","something","thing","things","those",
    "went","whether","whole","keep","left","man","men","put","read","set",
    "small","three","use","used","using","very","what","will","with",
  ]);

  /**
   * Tokenise text into lowercase words, removing stop-words and short tokens.
   */
  function tokenise(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z\s'-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  }

  /**
   * Build a frequency map from an array of headlines and return the top
   * `limit` keywords.
   */
  function topKeywords(headlines, limit = 30) {
    const freq = {};
    for (const h of headlines) {
      for (const w of tokenise(h)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    }
    return Object.entries(freq)
      .filter(([, count]) => count >= 2) // must appear in 2+ headlines
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  /**
   * Group keywords into broad themes.  Each theme is defined by a label and a
   * set of seed keywords.  Headlines matching any seed are assigned to that
   * theme.  Un-matched headlines go into an "Other" bucket.
   */
  const THEME_SEEDS = [
    { label: "Politics & Government", seeds: ["trump","biden","president","congress","senate","democrat","republican","election","vote","voter","political","politics","governor","legislation","law","policy","campaign","gop","liberal","conservative","justice","court","supreme","impeach","administration","white","house","executive","federal","government","bill","amendment"] },
    { label: "Economy & Business", seeds: ["economy","economic","market","stock","inflation","trade","tariff","tax","budget","debt","bank","business","company","companies","corporate","jobs","employment","wage","workers","labor","recession","growth","finance","financial","money","dollar","investment","industry","prices"] },
    { label: "Technology", seeds: ["tech","technology","ai","artificial","intelligence","software","data","digital","internet","cyber","app","robot","algorithm","silicon","computing","machine","learning","chip","semiconductor","startup","social","media","platform","privacy"] },
    { label: "Climate & Environment", seeds: ["climate","environment","environmental","warming","carbon","emissions","energy","fossil","renewable","solar","wind","pollution","wildfire","weather","drought","flood","ocean","species","conservation","sustainability"] },
    { label: "Health & Science", seeds: ["health","medical","covid","vaccine","virus","pandemic","disease","drug","hospital","doctor","patient","research","science","scientific","study","mental","brain","cancer","treatment","fda"] },
    { label: "Culture & Society", seeds: ["culture","book","film","movie","music","art","race","racism","identity","gender","women","education","school","college","university","religion","family","children","community","social","history","housing","immigration","immigrant","migrants","border"] },
    { label: "International", seeds: ["ukraine","russia","china","europe","nato","war","military","defense","foreign","international","global","israel","gaza","iran","africa","asia","middle","east","diplomacy","sanctions","nuclear","conflict"] },
  ];

  function classifyHeadlines(headlines) {
    const themes = THEME_SEEDS.map((t) => ({
      label: t.label,
      seeds: new Set(t.seeds),
      matched: [],
    }));
    const other = [];

    for (const h of headlines) {
      const tokens = new Set(tokenise(h));
      let matched = false;
      for (const theme of themes) {
        for (const tok of tokens) {
          if (theme.seeds.has(tok)) {
            theme.matched.push(h);
            matched = true;
            break;
          }
        }
      }
      if (!matched) other.push(h);
    }

    // Sort themes by number of matched headlines descending.
    themes.sort((a, b) => b.matched.length - a.matched.length);

    return { themes: themes.filter((t) => t.matched.length > 0), other };
  }

  // ---------------------------------------------------------------------------
  // 3. Render overlay
  // ---------------------------------------------------------------------------

  function renderOverlay(headlines, classification, keywords) {
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;

    // Styles — scoped to overlay to avoid affecting the page.
    overlay.style.cssText = [
      "position:fixed",
      "top:16px",
      "right:16px",
      "width:380px",
      "max-height:85vh",
      "overflow-y:auto",
      "background:#1a1a2e",
      "color:#e0e0e0",
      "font-family:system-ui,-apple-system,sans-serif",
      "font-size:13px",
      "line-height:1.5",
      "border-radius:12px",
      "box-shadow:0 8px 32px rgba(0,0,0,0.45)",
      "z-index:2147483647",
      "padding:20px",
    ].join(";");

    let html = "";

    // Header
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">`;
    html += `<strong style="font-size:16px;color:#fff">📰 Headline Theme Analysis</strong>`;
    html += `<button id="oz-theme-close" style="background:none;border:none;color:#888;font-size:20px;cursor:pointer;padding:0 4px" title="Close">×</button>`;
    html += `</div>`;

    // Summary line
    html += `<p style="margin:0 0 12px;color:#aaa">${headlines.length} headline${headlines.length !== 1 ? "s" : ""} detected</p>`;

    // Themes
    for (const theme of classification.themes) {
      const pct = ((theme.matched.length / headlines.length) * 100).toFixed(0);
      html += `<div style="margin-bottom:14px">`;
      html += `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">`;
      html += `<span style="font-weight:600;color:#8ecae6">${theme.label}</span>`;
      html += `<span style="color:#888;font-size:12px">${theme.matched.length} article${theme.matched.length !== 1 ? "s" : ""} (${pct}%)</span>`;
      html += `</div>`;
      // Progress bar
      html += `<div style="height:6px;border-radius:3px;background:#333;margin-bottom:6px">`;
      html += `<div style="width:${pct}%;height:100%;border-radius:3px;background:#8ecae6"></div>`;
      html += `</div>`;
      // Show up to 3 example headlines
      const examples = theme.matched.slice(0, 3);
      for (const ex of examples) {
        html += `<div style="padding-left:8px;border-left:2px solid #333;margin-bottom:4px;color:#bbb;font-size:12px">${escapeHtml(truncate(ex, 100))}</div>`;
      }
      if (theme.matched.length > 3) {
        html += `<div style="font-size:11px;color:#666;padding-left:8px">+${theme.matched.length - 3} more</div>`;
      }
      html += `</div>`;
    }

    if (classification.other.length > 0) {
      html += `<div style="margin-bottom:14px">`;
      html += `<span style="font-weight:600;color:#999">Other / Uncategorized</span>`;
      html += `<span style="color:#888;font-size:12px;margin-left:8px">${classification.other.length}</span>`;
      html += `</div>`;
    }

    // Top keywords
    if (keywords.length > 0) {
      html += `<div style="margin-top:8px;border-top:1px solid #333;padding-top:10px">`;
      html += `<div style="font-weight:600;color:#fff;margin-bottom:6px;font-size:12px">Top Keywords</div>`;
      html += `<div style="display:flex;flex-wrap:wrap;gap:4px">`;
      for (const [word, count] of keywords.slice(0, 15)) {
        html += `<span style="background:#2a2a4a;padding:2px 8px;border-radius:10px;font-size:11px;color:#ccc">${escapeHtml(word)} <span style="color:#666">${count}</span></span>`;
      }
      html += `</div></div>`;
    }

    // Footer
    html += `<div style="margin-top:12px;text-align:center;font-size:10px;color:#555">Generated by Oz · site-scoped · idempotent</div>`;

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // Close button handler
    const closeBtn = document.getElementById("oz-theme-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => overlay.remove());
    }
  }

  /** Escape HTML entities to prevent injection from headline text. */
  function escapeHtml(str) {
    const el = document.createElement("span");
    el.textContent = str;
    return el.innerHTML;
  }

  /** Truncate a string to `max` characters with an ellipsis. */
  function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + "…" : str;
  }

  // ---------------------------------------------------------------------------
  // 4. Execute
  // ---------------------------------------------------------------------------

  const headlines = collectHeadlines();
  if (headlines.length === 0) return; // nothing to analyse

  const classification = classifyHeadlines(headlines);
  const keywords = topKeywords(headlines);

  renderOverlay(headlines, classification, keywords);
})();
