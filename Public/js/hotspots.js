/**
 * Workspacemodo — Interactive Setup Hotspot Tour
 * Renders clickable hotspots over the annotated desk setup image.
 * Desktop: hover reveals tooltip; Mobile/Touch: tap toggles tooltip.
 */
(function () {
  "use strict";

  const HOTSPOTS = [
    {
      id: "monitor-light",
      x: 50, y: 12,
      label: "Monitor Light Bar",
      desc: "Reduces eye strain with asymmetric lighting. Top pick: BenQ ScreenBar Halo.",
      slug: "benq-screenbar",
      placement: "hotspot_tour"
    },
    {
      id: "keyboard",
      x: 38, y: 62,
      label: "Mechanical Keyboard",
      desc: "Tactile feedback for long typing sessions. Top pick: Keychron Q1 Pro.",
      slug: "keychron-q1",
      placement: "hotspot_tour"
    },
    {
      id: "chair",
      x: 85, y: 75,
      label: "Ergonomic Chair",
      desc: "Posture support for all-day comfort. Top pick: Herman Miller Aeron.",
      slug: "herman-miller-aeron",
      placement: "hotspot_tour"
    },
    {
      id: "mic",
      x: 68, y: 35,
      label: "Podcast Mic",
      desc: "Studio-quality audio for calls & content. Top pick: Shure MV7+.",
      slug: "shure-mv7",
      placement: "hotspot_tour"
    },
    {
      id: "desk-shelf",
      x: 20, y: 40,
      label: "Desk Shelf / Riser",
      desc: "Raises monitor to eye level. Top pick: Grovemade Walnut Shelf.",
      slug: "walnut-shelf",
      placement: "hotspot_tour"
    }
  ];

  document.addEventListener("DOMContentLoaded", function () {
    const stage = document.getElementById("hotspot-stage");
    if (!stage) return;

    const img = stage.querySelector("img");
    if (!img) return;

    // Ensure stage is positioned for hotspot overlay
    stage.style.position = "relative";
    stage.style.display = "inline-block";

    HOTSPOTS.forEach(function (spot) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "hotspot-dot";
      dot.setAttribute("aria-label", spot.label + " — " + spot.desc);
      dot.style.position = "absolute";
      dot.style.left = spot.x + "%";
      dot.style.top = spot.y + "%";
      dot.style.transform = "translate(-50%, -50%)";

      // Tooltip
      const tip = document.createElement("span");
      tip.className = "hotspot-tooltip";
      tip.setAttribute("role", "tooltip");
      tip.innerHTML =
        "<strong>" + spot.label + "</strong><br>" + spot.desc +
        '<br><a href="/go/' + spot.slug + "?placement=" + spot.placement +
        '" target="_blank" rel="sponsored noopener noreferrer">View Deal ↗</a>';
      dot.appendChild(tip);

      // Toggle on click/tap (mobile + keyboard)
      dot.addEventListener("click", function (e) {
        e.stopPropagation();
        // Close other open tooltips
        stage.querySelectorAll(".hotspot-dot.is-open").forEach(function (d) {
          if (d !== dot) d.classList.remove("is-open");
        });
        dot.classList.toggle("is-open");
      });

      stage.appendChild(dot);
    });

    // Close tooltips when clicking elsewhere
    document.addEventListener("click", function () {
      stage.querySelectorAll(".hotspot-dot.is-open").forEach(function (d) {
        d.classList.remove("is-open");
      });
    });

    // Inject hotspot styles
    const style = document.createElement("style");
    style.textContent = `
      .hotspot-dot {
        width: 22px; height: 22px; border-radius: 50%;
        background: rgba(56,189,248,0.85); border: 2px solid #fff;
        cursor: pointer; padding: 0; z-index: 5;
        box-shadow: 0 0 0 4px rgba(56,189,248,0.25);
        animation: hotspot-pulse 2s infinite;
      }
      .hotspot-dot:focus-visible { outline: 2px solid #38bdf8; outline-offset: 3px; }
      .hotspot-tooltip {
        position: absolute; bottom: calc(100% + 10px); left: 50%;
        transform: translateX(-50%);
        background: #0f172a; color: #f1f5f9;
        border: 1px solid rgba(56,189,248,0.3); border-radius: 10px;
        padding: 12px 16px; width: 240px; font-size: 13px; line-height: 1.5;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5); z-index: 10;
        opacity: 0; visibility: hidden; pointer-events: none;
        transition: opacity 0.2s ease, visibility 0.2s ease;
      }
      .hotspot-tooltip a {
        display: inline-block; margin-top: 8px; color: #38bdf8;
        font-weight: 700; text-decoration: underline;
      }
      .hotspot-dot.is-open .hotspot-tooltip,
      .hotspot-dot:hover .hotspot-tooltip {
        opacity: 1; visibility: visible; pointer-events: auto;
      }
      @keyframes hotspot-pulse {
        0%,100% { box-shadow: 0 0 0 4px rgba(56,189,248,0.25); }
        50% { box-shadow: 0 0 0 8px rgba(56,189,248,0.08); }
      }
    `;
    document.head.appendChild(style);
  });
})();
