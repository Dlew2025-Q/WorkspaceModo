/**
 * Workspacemodo — Affiliate Click Beacon (Performance Optimized)
 *
 * Changes from Step 8 → Step 9:
 *   - Loaded with `defer` (never render-blocking)
 *   - Uses requestIdleCallback for non-critical initialization
 *   - Minimal footprint (< 2KB gzipped)
 *   - No external dependencies
 *   - Passive event listener (no scroll/interaction jank)
 */

(function () {
  "use strict";

  var BEACON_ENDPOINT = "/api/track-click";

  // Defer initialization until browser is idle (improves INP)
  function init() {
    document.addEventListener("click", handleClick, { passive: true, capture: true });
  }

  function getPlacement(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.getAttribute("data-placement")) return node.getAttribute("data-placement");
      node = node.parentElement;
    }
    return "dealgrid";
  }

  function getCampaign(el) {
    var explicit = el.getAttribute("data-campaign");
    if (explicit) return explicit;
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("utm_campaign") || "organic";
  }

  function handleClick(e) {
    var link = e.target.closest && e.target.closest("a");
    if (!link) return;

    var href = link.getAttribute("href") || "";
    if (href.indexOf("/go/") === -1) return;

    var linkUrl;
    try {
      linkUrl = new URL(link.href, window.location.origin);
    } catch (err) {
      return;
    }

    if (linkUrl.pathname.indexOf("/go/") !== 0) return;

    var slug = linkUrl.pathname.replace(/^\/go\//, "").replace(/\/$/, "");
    var payload = {
      event: "affiliate_click_client",
      slug: slug,
      placement: getPlacement(link),
      campaign: getCampaign(link),
      subid: linkUrl.searchParams.get("subid") || linkUrl.searchParams.get("ascsubtag") || "web_direct",
      referrer: window.location.pathname,
      timestamp: new Date().toISOString(),
    };

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(BEACON_ENDPOINT, JSON.stringify(payload));
      } else {
        fetch(BEACON_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(function () {});
      }
    } catch (err) {
      // Swallow — beacon failure must never break UX
    }
  }

  if ("requestIdleCallback" in window) {
    requestIdleCallback(init, { timeout: 2000 });
  } else {
    init();
  }
})();
