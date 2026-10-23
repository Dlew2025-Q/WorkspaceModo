/**
 * Workspacemodo — Multi-Faceted Filter Engine
 * Filters the product grid by category, budget, and minimum rating.
 * Fetches from /data/products.json and renders accessible product cards.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const grid = document.getElementById("product-grid");
    const countEl = document.getElementById("filter-count");
    const categorySelect = document.getElementById("filter-category");
    const budgetSelect = document.getElementById("filter-budget");
    const ratingSelect = document.getElementById("filter-rating");

    if (!grid) return;

    let allProducts = [];

    // Fetch product data
    fetch("/data/products.json")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        allProducts = data.products || [];
        applyFilters();
      })
      .catch(function (err) {
        console.error("Error loading products:", err);
        grid.innerHTML = '<p class="filter-empty">Unable to load products. Please try again later.</p>';
      });

    // Attach change listeners
    [categorySelect, budgetSelect, ratingSelect].forEach(function (sel) {
      if (sel) sel.addEventListener("change", applyFilters);
    });

    function applyFilters() {
      const category = categorySelect ? categorySelect.value : "all";
      const maxBudget = budgetSelect ? parseInt(budgetSelect.value, 10) : 999999;
      const minRating = ratingSelect ? parseFloat(ratingSelect.value) : 0;

      const filtered = allProducts.filter(function (p) {
        const catMatch = category === "all" || p.category === category;
        const budgetMatch = p.price <= maxBudget;
        const ratingMatch = p.rating >= minRating;
        return catMatch && budgetMatch && ratingMatch;
      });

      renderGrid(filtered);
      updateCount(filtered.length, allProducts.length);
    }

    function renderGrid(items) {
      grid.innerHTML = "";

      if (items.length === 0) {
        grid.innerHTML = '<p class="filter-empty" role="status">No gear matches your filters. Try widening your criteria.</p>';
        return;
      }

      items.forEach(function (p) {
        const card = document.createElement("article");
        card.className = "product-card";
        card.setAttribute("role", "listitem");
        card.innerHTML = `
          <div class="card-image-wrap">
            <img
              src="${p.image}"
              alt="${p.name}"
              width="${p.imgWidth || 400}"
              height="${p.imgHeight || 300}"
              loading="lazy"
            />
          </div>
          <div class="card-body">
            <span class="card-category">${p.category}</span>
            <h3 class="card-name">${p.name}</h3>
            <div class="card-meta">
              <span class="card-rating">★ ${p.rating}</span>
              <span class="card-price">$${p.price.toLocaleString()}</span>
            </div>
            <a
              href="${p.affiliateUrl}"
              target="_blank"
              rel="sponsored noopener noreferrer"
              class="card-cta"
              data-placement="filter_engine"
              aria-label="View deal for ${p.name}"
            >
              View Deal ↗
            </a>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    function updateCount(shown, total) {
      if (!countEl) return;
      countEl.textContent = "Showing " + shown + " of " + total + " gear items";
    }

    // Inject filter engine styles
    const style = document.createElement("style");
    style.textContent = `
      .filter-section { max-width: 1200px; margin: 56px auto; padding: 0 20px; }
      .filter-section h2,
      .deal-section h2 { font-size: 28px; font-weight: 800; color: #fff; margin: 0 0 4px; }
      .section-subtitle { font-size: 14px; color: #94a3b8; margin: 0 0 24px; }
      .filter-controls { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
      .filter-label {
        display: flex; flex-direction: column; gap: 4px;
        font-size: 12px; font-weight: 600; color: #94a3b8;
      }
      .filter-label select {
        background: #0f172a; color: #f1f5f9; border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px; padding: 10px 14px; font-size: 14px; font-weight: 600;
        cursor: pointer; min-width: 160px;
      }
      .filter-label select:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }
      .product-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 20px; margin-top: 20px;
      }
      .product-card {
        background: #0f172a; border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px; overflow: hidden; transition: border-color 0.15s ease, transform 0.15s ease;
      }
      .product-card:hover { border-color: rgba(56,189,248,0.3); transform: translateY(-2px); }
      .card-image-wrap { width: 100%; aspect-ratio: 4/3; overflow: hidden; background: #1e293b; }
      .card-image-wrap img { width: 100%; height: 100%; object-fit: cover; }
      .card-body { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
      .card-category {
        font-size: 11px; text-transform: uppercase; color: #38bdf8;
        font-weight: 700; letter-spacing: 0.05em;
      }
      .card-name { font-size: 15px; font-weight: 700; color: #fff; margin: 0; }
      .card-meta { display: flex; justify-content: space-between; align-items: center; }
      .card-rating { font-size: 13px; color: #f59e0b; font-weight: 600; }
      .card-price { font-size: 16px; font-weight: 800; color: #34d399; }
      .filter-empty { color: #94a3b8; font-size: 14px; padding: 24px 0; }
      .deal-section { max-width: 1200px; margin: 56px auto; padding: 0 20px; }
    `;
    document.head.appendChild(style);
  });
})();
