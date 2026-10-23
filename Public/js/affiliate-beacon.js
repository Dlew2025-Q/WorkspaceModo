/**
 * Workspacemodo — Affiliate Beacon
 * Captures outbound affiliate clicks and promo interactions via sendBeacon.
 * Non-blocking; degrades gracefully if Beacon API is unavailable.
 */
(function () {
  "use strict";

  const BEACON_ENDPOINT = "/api/track-click";

  /**
   * Send a tracking beacon. Uses sendBeacon for non-blocking delivery;
   * falls back to fetch with keepalive, then to a no-op.
   */
  function track(payload) {
    const data = JSON.stringify({
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
      page: window.location.pathname,
      referrer: document.referrer || "direct"
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(BEACON_ENDPOINT, data);
        return;
      }
    } catch (e) {
      /* sendBeacon can throw in rare edge cases — fall through */
    }

    try {
      fetch(BEACON_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true
      }).catch(function () {});
    } catch (e) {
      /* network unavailable — silently drop */
    }
  }

  /**
   * Intercept clicks on affiliate links (rel="sponsored" or href starting with /go/).
   */
  document.addEventListener("click", function (e) {
    const link = e.target.closest('a[href^="/go/"]');
    if (!link) return;

    const url = new URL(link.href, window.location.origin);
    const slug = url.pathname.replace("/go/", "");
    const params = url.searchParams;

    track({
      event: "affiliate_click",
      slug: slug,
      placement: params.get("placement") || "unknown",
      subid: params.get("subid") || "none",
      label: link.textContent.trim().slice(0, 60)
    });
  });

  /**
   * Track page visibility / engagement on unload.
   */
  window.addEventListener("pagehide", function () {
    track({
      event: "page_leave",
      dwellTime: Math.round(performance.now())
    });
  });

  // Expose for other scripts to call directly
  window.WorkspaceModoBeacon = { track: track };
})();
