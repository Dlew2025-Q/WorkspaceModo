/**
 * Workspacemodo Leaderboard Engine & 1-Click Discount Voucher Copy
 * Tasks 13 + 14 — Trending Gear Index, Category Tabs, Promo Code Clipboard
 */
document.addEventListener("DOMContentLoaded", () => {
  const listContainer = document.getElementById("leaderboard-list");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const filterCount = document.getElementById("filter-count");

  let allLeaderboardItems = [];

  // 1. Fetch Leaderboard Data
  fetch("/data/leaderboard-deals.json")
    .then(res => res.json())
    .then(data => {
      allLeaderboardItems = data.trendingGear || [];
      renderLeaderboard(allLeaderboardItems);
    })
    .catch(err => console.error("Error loading leaderboard:", err));

  // 2. Render Leaderboard Rows
  function renderLeaderboard(items) {
    if (!listContainer) return;
    listContainer.innerHTML = "";

    if (filterCount) {
      filterCount.textContent = `Showing ${items.length} of ${allLeaderboardItems.length} trending items`;
    }

    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "leaderboard-item";
      row.setAttribute("role", "article");
      row.setAttribute("aria-label", `Rank ${index + 1}: ${item.name}`);

      // Verified / Exclusive badge logic
      const verifiedBadge = item.promoCode
        ? `<span class="item-badge verified" aria-label="Verified today">✓ Verified Today</span>`
        : `<span class="item-badge exclusive" aria-label="Exclusive partner deal">Exclusive Partner Deal</span>`;

      row.innerHTML = `
        <div class="rank-badge" aria-label="Rank ${index + 1}">#${index + 1}</div>
        <div class="item-info">
          <div class="item-top-row">
            <span class="item-title">${item.name}</span>
            <span class="item-category-tag">• ${item.category}</span>
          </div>
          <div class="item-meta">
            ★ ${item.rating} (${item.reviews} reviews) • 🔥 ${item.weeklyClicks.toLocaleString()} views this week
          </div>
          ${verifiedBadge}
        </div>
        <div class="promo-box">
          <span class="discount-tag">${item.discount}</span>
          ${item.promoCode ? `
            <button
              type="button"
              class="promo-copy-btn"
              data-code="${item.promoCode}"
              title="Click to copy promo code ${item.promoCode}"
              aria-label="Copy promo code ${item.promoCode}"
            >
              <span>${item.promoCode}</span> 📋
            </button>
          ` : ''}
        </div>
        <div class="leaderboard-actions">
          <a
            href="${item.affiliateUrl}"
            target="_blank"
            rel="sponsored noopener noreferrer"
            class="card-cta"
            data-placement="trending_leaderboard"
            aria-label="Claim deal for ${item.name}"
          >
            Claim Deal ↗
          </a>
        </div>
      `;
      listContainer.appendChild(row);
    });

    attachCopyHandlers();
  }

  // 3. Category Tab Filtering
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      const category = btn.dataset.category;
      if (category === "all") {
        renderLeaderboard(allLeaderboardItems);
      } else {
        const filtered = allLeaderboardItems.filter(i =>
          i.category.toLowerCase().includes(category.toLowerCase())
        );
        renderLeaderboard(filtered);
      }
    });
  });

  // 4. 1-Click Promo Code Copy Handler
  function attachCopyHandlers() {
    document.querySelectorAll(".promo-copy-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const code = btn.dataset.code;
        if (!code) return;

        try {
          await navigator.clipboard.writeText(code);
          const originalText = btn.innerHTML;
          btn.classList.add("copied");
          btn.innerHTML = `<span>Copied! ✓</span>`;

          // Track promo copy in beacon (non-blocking)
          if (navigator.sendBeacon) {
            navigator.sendBeacon(
              "/api/track-click",
              JSON.stringify({
                event: "promo_copied",
                code: code,
                timestamp: new Date().toISOString()
              })
            );
          }

          setTimeout(() => {
            btn.classList.remove("copied");
            btn.innerHTML = originalText;
          }, 2000);
        } catch (err) {
          console.error("Clipboard copy failed:", err);
        }
      });

      // Keyboard accessibility: Enter key already triggers click on <button>
      // but ensure focus-visible styling is clear (handled in CSS)
    });
  }
});
