// ==UserScript==
// @name        oz-dark-theme
// @description Apply a dark colour scheme to any page using CSS filter inversion.
// @match       *://*/*
// @run-at      document-start
// ==/UserScript==

(function darkTheme() {
  'use strict';

  const MARKER = 'data-oz-dark-theme';

  // Guard: bail out if script already ran on this document.
  if (document.documentElement.hasAttribute(MARKER)) {
    return;
  }
  document.documentElement.setAttribute(MARKER, '1');

  var STYLE_ID = 'oz-dark-theme-style';

  // Guard: bail out if stylesheet already exists (e.g. hot-reload).
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  var css = [
    /* Invert the entire page and shift hue back so colours stay recognisable. */
    'html[' + MARKER + '] {',
    '  filter: invert(1) hue-rotate(180deg) !important;',
    '  background-color: #111 !important;',
    '}',
    /* Re-invert media so images, videos and canvases look normal. */
    'html[' + MARKER + '] img,',
    'html[' + MARKER + '] picture,',
    'html[' + MARKER + '] video,',
    'html[' + MARKER + '] canvas,',
    'html[' + MARKER + '] svg image,',
    'html[' + MARKER + '] [style*="background-image"] {',
    '  filter: invert(1) hue-rotate(180deg) !important;',
    '}',
    /* Tone down very bright backgrounds that survive inversion. */
    'html[' + MARKER + '] body {',
    '  background-color: #111 !important;',
    '}'
  ].join('\n');

  function inject() {
    // Double-check in case another execution path beat us here.
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  // Inject as early as possible.
  if (document.head) {
    inject();
  } else {
    // `document.head` may not exist yet at document-start; wait for it.
    var observer = new MutationObserver(function () {
      if (document.head) {
        observer.disconnect();
        inject();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  }
})();
