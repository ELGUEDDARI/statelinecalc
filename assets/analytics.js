/* Google Analytics 4 - statelinecalc.com
   Property created 2026-08-22. Measurement ID G-XK0HYXJH0E.

   Google hands you this snippet inline. Inline script is blocked by our
   Content-Security-Policy, and we are not adding 'unsafe-inline' to make
   one tag work — that would disable the protection site-wide. So the
   snippet lives here, as a file, and the CSP allows exactly two things:
   googletagmanager.com to serve the library, and the analytics endpoints
   to receive the beacons. Nothing else.

   Loading (audit perf 2026-10-22): gtag.js is 177 KB gzip, 82 % of the bytes
   of the home page, and it used to compete with the page for bandwidth.
   It is now fetched only AFTER the window 'load' event, and then on the
   first interaction (scroll, touch, click, key) or after 4 seconds, whichever
   comes first. The gtag() calls below are queued in dataLayer straight away,
   so the page_view that config triggers still goes out once the library
   arrives. The <script> tag no longer sits in the page HTML; if an older
   page still carries one, we do not add a second.

   What this does NOT send: anything the visitor types. The calculator
   never emits an event carrying a salary, and it never will. The claim on
   the page is "nothing you type leaves your browser" — that claim has to
   stay literally true. */

window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag("js", new Date());
gtag("config", "G-XK0HYXJH0E");

(function () {
  "use strict";
  var SRC = "https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E";
  var EVENTS = ["scroll", "touchstart", "pointerdown", "click", "keydown"];
  var charge = false, pret = document.readyState === "complete", timer = null;

  function dejaPresent() {
    return !!document.querySelector('script[src^="https://www.googletagmanager.com/gtag/js"]');
  }

  function charger() {
    if (charge) return;
    charge = true;
    EVENTS.forEach(function (e) { window.removeEventListener(e, declencher, true); });
    if (timer) clearTimeout(timer);
    if (dejaPresent()) return;
    var s = document.createElement("script");
    s.async = true;
    s.src = SRC;
    document.head.appendChild(s);
  }

  /* An interaction before 'load' is remembered, and acted on at 'load'. */
  var interagi = false;
  function declencher() {
    interagi = true;
    if (pret) charger();
  }

  EVENTS.forEach(function (e) {
    window.addEventListener(e, declencher, { capture: true, passive: true });
  });

  function auLoad() {
    pret = true;
    if (interagi) { charger(); return; }
    /* No 4 s wait: a visitor who leaves earlier would never be counted.
       Idle time after 'load' keeps gtag off the critical path, and the
       1.5 s cap bounds the loss to visitors who leave almost at once. */
    if (window.requestIdleCallback) window.requestIdleCallback(charger, { timeout: 1500 });
    else timer = setTimeout(charger, 1500);
  }

  if (pret) auLoad();
  else window.addEventListener("load", auLoad);
})();
