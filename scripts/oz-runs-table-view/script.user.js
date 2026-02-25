// ==UserScript==
// @name        Oz Runs – Table View
// @match       https://oz.warp.dev/runs*
// @description Converts the main runs list into a table layout with columns for status, run ID, message, and timestamps.
// @version     1.0.0
// @run-at      document-idle
// ==/UserScript==

(function ozRunsTableView() {
  "use strict";

  const SCRIPT_ID = "oz-runs-table-view";
  const STYLE_ID = SCRIPT_ID + "-style";
  const TABLE_ATTR = "data-" + SCRIPT_ID;

  // ── Guard: bail if we already ran ──────────────────────────────
  if (document.querySelector("[" + TABLE_ATTR + "]")) return;

  // ── Locate the runs list container ─────────────────────────────
  // The page renders runs inside <main> as a series of <a> link-cards.
  // We look for the first scrollable main region and find the list of
  // run-card links that point to /runs/<id>.
  function getRunCards() {
    return Array.from(
      document.querySelectorAll('main a[href^="/runs/"]')
    ).filter(function (a) {
      // Only top-level run links (not nested icons/buttons)
      return a.closest("main") && a.getAttribute("href").match(/^\/runs\/[a-zA-Z0-9_-]+$/);
    });
  }

  function extractText(el) {
    return el ? el.textContent.trim() : "";
  }

  // ── Build table from existing cards ────────────────────────────
  function buildTable() {
    var cards = getRunCards();
    if (cards.length === 0) return;

    // Determine the common parent that holds all run cards.
    var listParent = cards[0].parentElement;
    if (!listParent) return;

    // If we already injected, bail.
    if (listParent.querySelector("[" + TABLE_ATTR + "]")) return;

    // ── Parse card data ────────────────────────────────────────
    var rows = cards.map(function (card) {
      var href = card.getAttribute("href") || "";
      var spans = card.querySelectorAll("span");
      var texts = Array.from(spans).map(extractText).filter(Boolean);

      // Heuristic: first colored badge-like span is status, rest is metadata.
      var statusEl = card.querySelector(
        '[class*="bg-red"], [class*="bg-green"], [class*="bg-yellow"], [class*="bg-blue"], [class*="bg-amber"], [class*="bg-orange"], [class*="bg-gray"]'
      );
      var status = statusEl ? extractText(statusEl) : (texts[0] || "—");

      // Try to pull a run-id from the href
      var runIdMatch = href.match(/\/runs\/([a-zA-Z0-9_-]+)$/);
      var runId = runIdMatch ? runIdMatch[1] : "";

      // Remaining visible text after status becomes the message / description
      var message = texts
        .filter(function (t) { return t !== status && t !== runId; })
        .join(" · ") || "—";

      // Look for a <time> or datetime-like element
      var timeEl = card.querySelector("time");
      var timestamp = timeEl
        ? (timeEl.getAttribute("datetime") || extractText(timeEl))
        : "";

      return {
        href: href,
        status: status,
        runId: runId,
        message: message,
        timestamp: timestamp,
        originalCard: card,
      };
    });

    // ── Inject styles (once) ───────────────────────────────────
    if (!document.getElementById(STYLE_ID)) {
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = [
        "." + SCRIPT_ID + "-table {",
        "  width: 100%;",
        "  border-collapse: collapse;",
        "  table-layout: fixed;",
        "  font-size: 13px;",
        "  line-height: 1.4;",
        "}",
        "." + SCRIPT_ID + "-table th,",
        "." + SCRIPT_ID + "-table td {",
        "  padding: 8px 12px;",
        "  text-align: left;",
        "  border-bottom: 1px solid #333;",
        "  overflow: hidden;",
        "  text-overflow: ellipsis;",
        "  white-space: nowrap;",
        "}",
        "." + SCRIPT_ID + "-table th {",
        "  font-weight: 600;",
        "  position: sticky;",
        "  top: 0;",
        "  z-index: 1;",
        "}",
        "." + SCRIPT_ID + "-table tbody tr {",
        "  cursor: pointer;",
        "  transition: background-color 0.1s ease;",
        "}",
        "." + SCRIPT_ID + "-table tbody tr:hover {",
        "  background-color: rgba(255,255,255,0.04) !important;",
        "}",
        "." + SCRIPT_ID + "-table a {",
        "  text-decoration: none;",
        "  color: inherit !important;",
        "}",
        "." + SCRIPT_ID + "-table col.col-status  { width: 100px; }",
        "." + SCRIPT_ID + "-table col.col-runid   { width: 220px; }",
        "." + SCRIPT_ID + "-table col.col-message  { width: auto; }",
        "." + SCRIPT_ID + "-table col.col-time     { width: 180px; }",
      ].join("\n");
      document.head.appendChild(style);
    }

    // ── Create table ───────────────────────────────────────────
    var table = document.createElement("table");
    table.className = SCRIPT_ID + "-table";
    table.setAttribute(TABLE_ATTR, "");

    // Col groups
    var colgroup = document.createElement("colgroup");
    ["col-status", "col-runid", "col-message", "col-time"].forEach(function (c) {
      var col = document.createElement("col");
      col.className = c;
      colgroup.appendChild(col);
    });
    table.appendChild(colgroup);

    // Header
    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    ["Status", "Run ID", "Message", "Time"].forEach(function (label) {
      var th = document.createElement("th");
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Body
    var tbody = document.createElement("tbody");
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.addEventListener("click", function () {
        window.location.href = row.href;
      });

      var tdStatus = document.createElement("td");
      // Preserve the original badge element if possible
      var badgeEl = row.originalCard.querySelector(
        '[class*="bg-red"], [class*="bg-green"], [class*="bg-yellow"], [class*="bg-blue"], [class*="bg-amber"], [class*="bg-orange"], [class*="bg-gray"]'
      );
      if (badgeEl) {
        tdStatus.appendChild(badgeEl.cloneNode(true));
      } else {
        tdStatus.textContent = row.status;
      }
      tr.appendChild(tdStatus);

      var tdRunId = document.createElement("td");
      var runLink = document.createElement("a");
      runLink.href = row.href;
      runLink.textContent = row.runId;
      runLink.title = row.runId;
      tdRunId.appendChild(runLink);
      tr.appendChild(tdRunId);

      var tdMsg = document.createElement("td");
      tdMsg.textContent = row.message;
      tdMsg.title = row.message;
      tr.appendChild(tdMsg);

      var tdTime = document.createElement("td");
      tdTime.textContent = row.timestamp;
      tr.appendChild(tdTime);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    // ── Replace the card list with the table ───────────────────
    // Hide original cards and insert table before them.
    cards.forEach(function (card) {
      card.style.display = "none";
    });
    listParent.insertBefore(table, listParent.firstChild);
  }

  // ── Observe for SPA navigation / lazy-loaded content ─────────
  var observer = new MutationObserver(function () {
    // Re-check: if table is gone (SPA navigated away and back) rebuild.
    if (!document.querySelector("[" + TABLE_ATTR + "]")) {
      buildTable();
    }
  });

  // Initial build (with a small delay for client-side hydration)
  setTimeout(function () {
    buildTable();
    observer.observe(document.querySelector("main") || document.body, {
      childList: true,
      subtree: true,
    });
  }, 500);
})();
