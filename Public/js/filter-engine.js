/**
 * Workspacemodo — Client-Side Multi-Faceted Filter Engine with URL Sync
 * public/js/filter-engine.js
 *
 * Filters the workspace catalog by Role, Budget Tier, and Aesthetic Vibe
 * with zero page reloads. Active filter state is synced to URL query params
 * via history.replaceState for deep-linkable inbound links (e.g. from
 * Pinterest pins: ?role=developer&vibe=warm-wood).
 *
 * Performance:
 *   - Loaded with `defer` (never render-blocking)
 *   - DOM updates batched in a single innerHTML rebuild (< 16ms for < 50 items)
 *   - No virtual DOM, no framework, no dependencies
 *   - CLS-safe: grid container has min-height; cards use aspect-ratio thumbnails
 *
 * Affiliate:
 *   - Outbound links route through /go/{slug}?placement=filtered_grid
 *   - affiliate-beacon.js auto-detects and tracks clicks via data-placement
 *   - Filter changes are logged to /api/track-click for analytics
 */
(function () {
  "use strict";

  var setupsData = [];
  var activeFilters = {
    role: "all",
    budget: "all",
    aesthetic: "all",
  };

  // --- DOM references (cached on init) -------------------------------------
  var roleSelect, budgetSelect, aestheticSelect;
  var resetBtn, emptyResetBtn;
  var chipsContainer, chipsList;
  var gridContainer, emptyState, countDisplay;

  // --- Facet label maps ----------------------------------------------------
  var VIBE_MAP = {
    "warm-wood": "Warm Wood",
    "dark-mode": "Dark Mode",
    "minimalist-white": "Minimalist White",
    cyberpunk: "Cyberpunk",
  };

  var BUDGET_MAP = {
    budget: "Under $1,000",
    mid: "$1,000 – $3,000",
    endgame: "$3,000+",
  };

  // --- Init -----------------------------------------------------------------
  function init() {
    roleSelect = document.getElementById("filter-role");
    budgetSelect = document.getElementById("filter-budget");
    aestheticSelect = document.getElementById("filter-aesthetic");
    resetBtn = document.getElementById("filter-reset-btn");
    emptyResetBtn = document.getElementById("empty-reset-btn");
    chipsContainer = document.getElementById("active-chips-container");
    chipsList = document.getElementById("chips-list");
    gridContainer = document.getElementById("setups-grid");
    emptyState = document.getElementById("empty-state");
    countDisplay = document.getElementById("results-count");

    // Bail if the filter section isn't on this page
    if (!gridContainer || !roleSelect) return;

    fetch("/data/setups.json", { cache: "force-cache" })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        setupsData = Array.isArray(data) ? data : [data];

        // Read initial filter state from URL (deep-link support)
        readUrlParams();

        // Wire up event listeners
        roleSelect.addEventListener("change", function (e) {
          setFilter("role", e.target.value);
        });
        budgetSelect.addEventListener("change", function (e) {
          setFilter("budget", e.target.value);
        });
        aestheticSelect.addEventListener("change", function (e) {
          setFilter("aesthetic", e.target.value);
        });

        resetBtn.addEventListener("click", resetAllFilters);
        if (emptyResetBtn) {
          emptyResetBtn.addEventListener("click", resetAllFilters);
        }

        // Listen for browser back/forward navigation
        window.addEventListener("popstate", function () {
          readUrlParams();
          applyFilters();
        });

        // Initial render
        applyFilters();
      })
      .catch(function (err) {
        console.error("[filter-engine] Failed to load setups catalog:", err);
        if (countDisplay) {
          countDisplay.textContent = "Unable to load setups";
        }
      });
  }

  // --- Read URL params → activeFilters + sync dropdowns --------------------
  function readUrlParams() {
    var params = new URLSearchParams(window.location.search);

    if (params.has("role")) activeFilters.role = params.get("role");
    if (params.has("budget")) activeFilters.budget = params.get("budget");

    // Support both "aesthetic" and legacy "vibe" query param
    if (params.has("aesthetic")) {
      activeFilters.aesthetic = params.get("aesthetic");
    } else if (params.has("vibe")) {
      activeFilters.aesthetic = params.get("vibe");
    }

    // Sync select dropdowns to reflect URL state
    if (roleSelect) roleSelect.value = activeFilters.role;
    if (budgetSelect) budgetSelect.value = activeFilters.budget;
    if (aestheticSelect) aestheticSelect.value = activeFilters.aesthetic;
  }

  // --- Set a single filter, sync URL, re-render ----------------------------
  function setFilter(key, value) {
    activeFilters[key] = value;
    syncUrlParams();
    applyFilters();
    logFilterChange(key, value);
  }

  // --- Sync active filters to URL query params (replaceState) --------------
  function syncUrlParams() {
    var params = new URLSearchParams();

    if (activeFilters.role !== "all") params.set("role", activeFilters.role);
    if (activeFilters.budget !== "all") params.set("budget", activeFilters.budget);
    if (activeFilters.aesthetic !== "all") params.set("aesthetic", activeFilters.aesthetic);

    var newQuery = params.toString()
      ? "?" + params.toString()
      : window.location.pathname;

    window.history.replaceState({}, "", newQuery + window.location.hash);
  }

  // --- Reset all filters to "all" ------------------------------------------
  function resetAllFilters() {
    activeFilters.role = "all";
    activeFilters.budget = "all";
    activeFilters.aesthetic = "all";

    if (roleSelect) roleSelect.value = "all";
    if (budgetSelect) budgetSelect.value = "all";
    if (aestheticSelect) aestheticSelect.value = "all";

    syncUrlParams();
    applyFilters();
  }

  // --- Apply filters and render --------------------------------------------
  function applyFilters() {
    var filtered = setupsData.filter(function (item) {
      if (activeFilters.role !== "all" && item.role !== activeFilters.role)
        return false;
      if (activeFilters.budget !== "all" && item.budgetTier !== activeFilters.budget)
        return false;
      if (
        activeFilters.aesthetic !== "all" &&
        item.aesthetic !== activeFilters.aesthetic
      )
        return false;
      return true;
    });

    renderGrid(filtered);
    renderChips();
    updateCounter(filtered.length, setupsData.length);
  }

  // --- Render the grid of setup cards --------------------------------------
  function renderGrid(items) {
    // Use DocumentFragment for batch DOM insertion (single reflow)
    var frag = document.createDocumentFragment();

    if (items.length === 0) {
      gridContainer.style.display = "none";
      gridContainer.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    gridContainer.style.display = "grid";
    if (emptyState) emptyState.style.display = "none";

    items.forEach(function (setup) {
      var card = document.createElement("article");
      card.className = "setup-card";

      var badgesHtml =
        '<div class="card-badges">' +
          '<span class="badge-tag">' + esc(capitalize(setup.role)) + "</span>" +
          '<span class="badge-tag">' + esc(formatVibe(setup.aesthetic)) + "</span>" +
          '<span class="badge-tag badge-budget">' + esc(formatBudget(setup.budgetTier)) + "</span>" +
        "</div>";

      var gearHtml = setup.featuredGear
        ? "<strong>Key Gear:</strong> " + esc(setup.featuredGear.join(" • "))
        : "";

      var priceHtml = setup.budgetAmount
        ? "Est. ~$" + setup.budgetAmount.toLocaleString()
        : "";

      card.innerHTML =
        '<div class="card-thumb-wrap">' +
          "<picture>" +
            '<source srcset="' + esc(setup.image.webp) + '" type="image/webp">' +
            '<img src="' + esc(setup.image.fallback) + '" ' +
              'alt="' + esc(setup.title) + '" ' +
              'width="' + esc(setup.image.width) + '" ' +
              'height="' + esc(setup.image.height) + '" ' +
              'class="card-thumb" ' +
              'loading="lazy" ' +
              'decoding="async" />' +
          "</picture>" +
        "</div>" +
        '<div class="card-body">' +
          badgesHtml +
          '<h3 class="setup-title">' + esc(setup.title) + "</h3>" +
          '<p class="gear-list">' + gearHtml + "</p>" +
          '<div class="setup-footer">' +
            '<span class="setup-price">' + esc(priceHtml) + "</span>" +
            '<a href="' + esc(setup.primaryLink) + '" ' +
              'target="_blank" ' +
              'rel="sponsored noopener noreferrer" ' +
              'class="card-cta" ' +
              'data-placement="filtered_grid">' +
              "Explore Gear \u2197" +
            "</a>" +
          "</div>" +
        "</div>";

      frag.appendChild(card);
    });

    // Single innerHTML swap — one reflow, < 16ms for small catalogs
    gridContainer.innerHTML = "";
    gridContainer.appendChild(frag);
  }

  // --- Render active filter chips with remove buttons ----------------------
  function renderChips() {
    if (!chipsList || !chipsContainer) return;
    chipsList.innerHTML = "";

    var activeEntries = Object.entries(activeFilters).filter(function (entry) {
      return entry[1] !== "all";
    });

    if (activeEntries.length === 0) {
      chipsContainer.style.display = "none";
      if (resetBtn) resetBtn.style.display = "none";
      return;
    }

    chipsContainer.style.display = "flex";
    if (resetBtn) resetBtn.style.display = "block";

    activeEntries.forEach(function (entry) {
      var key = entry[0];
      var val = entry[1];
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip-pill";
      chip.setAttribute(
        "aria-label",
        "Remove filter: " + formatChipLabel(key, val)
      );
      chip.innerHTML = esc(formatChipLabel(key, val)) + " \u2715";
      chip.addEventListener("click", function () {
        setFilter(key, "all");
        var sel = document.getElementById("filter-" + key);
        if (sel) sel.value = "all";
      });
      chipsList.appendChild(chip);
    });
  }

  // --- Update results counter (aria-live for screen readers) ---------------
  function updateCounter(count, total) {
    if (!countDisplay) return;
    if (count === total) {
      countDisplay.textContent = "Showing all " + total + " setups";
    } else {
      countDisplay.textContent =
        "Showing " + count + " of " + total + " setups";
    }
  }

  // --- Log filter change telemetry to beacon endpoint -----------------------
  function logFilterChange(facet, value) {
    try {
      var payload = JSON.stringify({
        event: "filter_changed",
        facet: facet,
        value: value,
        referrer: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track-click", payload);
      }
    } catch (err) {
      // Swallow — telemetry failure must never break UX
    }
  }

  // --- Utility helpers ------------------------------------------------------
  function esc(str) {
    var d = document.createElement("div");
    d.textContent = String(str);
    return d.innerHTML;
  }

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
  }

  function formatVibe(vibe) {
    return VIBE_MAP[vibe] || vibe;
  }

  function formatBudget(tier) {
    return BUDGET_MAP[tier] || tier;
  }

  function formatChipLabel(key, val) {
    if (key === "aesthetic") return formatVibe(val);
    if (key === "budget") return formatBudget(val);
    return capitalize(val);
  }

  // --- Self-boot on DOM ready ----------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
