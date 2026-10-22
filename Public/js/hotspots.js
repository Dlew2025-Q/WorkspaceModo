/**
 * Workspacemodo — Interactive Setup Hotspot Engine
 * public/js/hotspots.js
 *
 * Renders percentage-locked hotspot pins over a responsive image, shows
 * floating gear cards on desktop (hover/focus) and a bottom sheet on mobile
 * (tap), and wires outbound links through the existing /go/{slug} KV
 * redirect engine with affiliate-beacon.js auto-tracking.
 *
 * Loaded non-render-blocking via <script ... defer>.
 */
(function () {
  "use strict";

  // --- Touch / pointer detection -------------------------------------------
  var isTouch =
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window;

  // --- Fetch the setup data -------------------------------------------------
  function getSetupData() {
    if (typeof window.SETUP_DATA !== "undefined") {
      return Promise.resolve(window.SETUP_DATA);
    }
    return fetch("/data/setups.json", { cache: "force-cache" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        // Handle both single-object (legacy) and array (catalog) formats
        if (Array.isArray(data)) {
          return data.find(function (s) { return s.hotspots; }) || data[0] || null;
        }
        return data;
      })
      .catch(function () { return null; });
  }

  // --- Escape HTML to prevent injection from data --------------------------
  function esc(str) {
    var d = document.createElement("div");
    d.textContent = String(str);
    return d.innerHTML;
  }

  // --- Build affiliate URL --------------------------------------------------
  function affiliateUrl(slug, setupId) {
    return (
      "/go/" +
      encodeURIComponent(slug) +
      "?placement=hotspot&subid=" +
      encodeURIComponent(setupId)
    );
  }

  // --- Render pins ----------------------------------------------------------
  function renderHotspots(container, data) {
    var frag = document.createDocumentFragment();

    data.hotspots.forEach(function (spot) {
      var pin = document.createElement("div");
      pin.className = "hotspot-pin";
      pin.id = spot.id;
      pin.style.left = spot.x + "%";
      pin.style.top = spot.y + "%";

      if (spot.x < 25) pin.setAttribute("data-align-x", "left");
      if (spot.x > 75) pin.setAttribute("data-align-x", "right");
      if (spot.y < 30) pin.setAttribute("data-align-y", "top");

      pin.setAttribute("tabindex", "0");
      pin.setAttribute("role", "button");
      pin.setAttribute("aria-label", spot.name + " (" + spot.price + ")");
      pin.setAttribute("aria-expanded", "false");

      var badgeHtml = spot.badge
        ? '<span class="card-badge">' + esc(spot.badge) + "</span>"
        : "";

      pin.innerHTML =
        '<div class="pin-bullet" aria-hidden="true">+</div>' +
        '<div class="hotspot-card" role="dialog" aria-modal="false">' +
          '<div class="card-header">' +
            '<span class="card-category">' + esc(spot.category) + "</span>" +
            badgeHtml +
          "</div>" +
          '<h4 class="card-title">' + esc(spot.name) + "</h4>" +
          '<div class="card-footer">' +
            '<span class="card-price">' + esc(spot.price) + "</span>" +
            '<a href="' + affiliateUrl(spot.slug, data.id) + '" ' +
              'target="_blank" ' +
              'rel="sponsored noopener noreferrer" ' +
              'class="card-cta" ' +
              'data-placement="hotspot">' +
              "Check Deal \u2197" +
            "</a>" +
          "</div>" +
        "</div>";

      pin.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        if (isTouch) {
          openSheet(spot, data);
          return;
        }
        var wasActive = pin.classList.contains("is-active");
        closeAllPins();
        if (!wasActive) {
          pin.classList.add("is-active");
          pin.setAttribute("aria-expanded", "true");
        }
      });

      pin.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isTouch) {
            openSheet(spot, data);
          } else {
            pin.click();
          }
        } else if (e.key === "Escape") {
          pin.classList.remove("is-active");
          pin.setAttribute("aria-expanded", "false");
          pin.focus();
        }
      });

      frag.appendChild(pin);
    });

    container.appendChild(frag);
  }

  // --- Close all active pins ------------------------------------------------
  function closeAllPins() {
    document.querySelectorAll(".hotspot-pin.is-active").forEach(function (p) {
      p.classList.remove("is-active");
      p.setAttribute("aria-expanded", "false");
    });
  }

  // --- Mobile bottom sheet --------------------------------------------------
  var sheetEl = null;
  var backdropEl = null;

  function ensureSheet() {
    if (sheetEl) return;

    backdropEl = document.createElement("div");
    backdropEl.className = "hotspot-sheet-backdrop";
    backdropEl.addEventListener("click", closeSheet);

    sheetEl = document.createElement("div");
    sheetEl.className = "hotspot-sheet";
    sheetEl.setAttribute("role", "dialog");
    sheetEl.setAttribute("aria-modal", "true");
    sheetEl.setAttribute("aria-label", "Gear details");
    sheetEl.innerHTML =
      '<button class="sheet-close" aria-label="Close details">\u00d7</button>' +
      '<div class="sheet-handle" aria-hidden="true"></div>' +
      '<div class="sheet-body"></div>';

    sheetEl.querySelector(".sheet-close").addEventListener("click", closeSheet);
    document.body.appendChild(backdropEl);
    document.body.appendChild(sheetEl);
  }

  function openSheet(spot, data) {
    ensureSheet();
    var body = sheetEl.querySelector(".sheet-body");
    var badgeHtml = spot.badge
      ? '<span class="card-badge">' + esc(spot.badge) + "</span>"
      : "";
    body.innerHTML =
      '<div class="card-header">' +
        '<span class="card-category">' + esc(spot.category) + "</span>" +
        badgeHtml +
      "</div>" +
      '<h4 class="card-title" style="font-size:18px;margin:8px 0;">' +
        esc(spot.name) +
      "</h4>" +
      '<div class="card-footer" style="border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">' +
        '<span class="card-price" style="font-size:18px;">' + esc(spot.price) + "</span>" +
        '<a href="' + affiliateUrl(spot.slug, data.id) + '" ' +
          'target="_blank" ' +
          'rel="sponsored noopener noreferrer" ' +
          'class="card-cta" ' +
          'data-placement="hotspot">' +
          "Check Deal \u2197" +
        "</a>" +
      "</div>";

    requestAnimationFrame(function () {
      backdropEl.classList.add("is-open");
      sheetEl.classList.add("is-open");
      sheetEl.querySelector(".sheet-close").focus();
    });
  }

  function closeSheet() {
    if (!sheetEl) return;
    backdropEl.classList.remove("is-open");
    sheetEl.classList.remove("is-open");
  }

  // --- Global listeners -----------------------------------------------------
  function setupGlobalListeners() {
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".hotspot-pin")) closeAllPins();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (sheetEl && sheetEl.classList.contains("is-open")) {
          closeSheet();
        } else {
          closeAllPins();
        }
      }
    });

    window.matchMedia("(pointer: coarse)").addEventListener("change", function (m) {
      isTouch = m.matches;
    });
  }

  // --- Image load → remove loading state (CLS guard) -----------------------
  function markImageLoaded(viewport) {
    var img = viewport.querySelector(".hotspot-bg-image");
    if (!img) return;
    function done() { viewport.classList.remove("is-loading"); }
    if (img.complete && img.naturalWidth > 0) done();
    else img.addEventListener("load", done, { once: true });
  }

  // --- Init -----------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    var container = document.getElementById("hotspots-layer");
    var viewport = document.getElementById("hotspot-container");
    if (!container) return;

    if (viewport) viewport.classList.add("is-loading");

    getSetupData().then(function (data) {
      if (!data || !data.hotspots) {
        console.warn("[hotspots] No setup data found.");
        return;
      }
      renderHotspots(container, data);
      setupGlobalListeners();
      if (viewport) markImageLoaded(viewport);
    });
  });
})();
