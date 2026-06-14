/* SaafHawa — shared layout. Renders the top nav and the full footer
   (with team tag, partner lockups, civic theme line) on every page. */

(function () {
  "use strict";

  // ----- top nav -----
  function renderNav() {
    const slot = document.getElementById("nav-slot");
    if (!slot) return;
    const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const links = [
      { href: "index.html", label: "Home"   },
      { href: "app.html",   label: "Launch app" },
      { href: "about.html", label: "About"  },
    ];
    slot.innerHTML = `
      <nav class="nav">
        <a class="nav-brand" href="index.html">
          <svg class="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="19" fill="#0F7268"/>
            <path d="M9 24c4 0 4-3 8-3s4 3 8 3 4-3 6-3" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M11 17c3.3 0 3.3-2.4 6.6-2.4S21 17 24.3 17s3.3-2.4 5-2.4" stroke="#9FE3D2" stroke-width="2" stroke-linecap="round"/>
            <circle cx="28.5" cy="12.5" r="2.4" fill="#FFD66B"/>
          </svg>
          <span class="word">Saaf<b>Hawa</b></span>
        </a>
        <div class="nav-links">
          ${links.map(l => `
            <a class="nav-link${l.href === here ? " on" : ""}" href="${l.href}">${l.label}</a>
          `).join("")}
        </div>
      </nav>`;
  }

  // ----- avatar initials -----
  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join("");
  }
  // stable color from name
  function colorFor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return `hsl(${h}, 38%, 42%)`;
  }

  // ----- team section (used on About page) -----
  window.renderTeam = function (containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap || !window.SAAFHAWA_TEAM) return;
    wrap.innerHTML = window.SAAFHAWA_TEAM.map(m => `
      <div class="team-card">
        <div class="avatar" style="background:${colorFor(m.name)}">${initials(m.name)}</div>
        <div class="team-meta">
          <div class="team-name">${m.name}</div>
          <div class="team-role">${m.role}</div>
          <div class="team-bio">${m.bio || ""}</div>
          ${(m.links && (m.links.github || m.links.linkedin)) ? `
            <div class="team-links">
              ${m.links.github   ? `<a href="${m.links.github}"   target="_blank" rel="noopener">GitHub</a>`   : ""}
              ${m.links.linkedin ? `<a href="${m.links.linkedin}" target="_blank" rel="noopener">LinkedIn</a>` : ""}
            </div>` : ""}
        </div>
      </div>
    `).join("");
  };

  window.renderPartners = function (containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap || !window.SAAFHAWA_PARTNERS) return;
    wrap.innerHTML = window.SAAFHAWA_PARTNERS.map(p => `
      <div class="partner">
        <div class="partner-lockup">${p.name}</div>
        <div class="partner-role">${p.role}</div>
      </div>
    `).join("");
  };

  // ----- footer (rendered on every page) -----
  function renderFooter() {
    const slot = document.getElementById("footer-slot");
    if (!slot) return;
    const yr = new Date().getFullYear();
    const team = (window.SAAFHAWA_TEAM || []).map(m => m.name).join(" · ");
    slot.innerHTML = `
      <footer class="site-footer">
        <div class="foot-grid">
          <div class="foot-col">
            <div class="foot-brand">Saaf<b>Hawa</b> <span class="urdu">صاف ہوا</span></div>
            <p class="foot-tag">Air-quality data, turned into a decision you can act on — in your language.</p>
            <p class="foot-tiny">Themes: Technology for Civic Good · Open Data &amp; Access to Information</p>
          </div>
          <div class="foot-col">
            <div class="foot-head">Product</div>
            <a href="index.html">Home</a>
            <a href="app.html">Launch app</a>
            <a href="about.html">About &amp; team</a>
          </div>
          <div class="foot-col">
            <div class="foot-head">Built with</div>
            <span>FastAPI · Python</span>
            <span>Groq · Llama 3.3 70B</span>
            <span>WAQI open air data</span>
            <span>SQLite · Tailwind</span>
          </div>
          <div class="foot-col">
            <div class="foot-head">Team</div>
            <span>${team || "Team SaafHawa"}</span>
            <div class="foot-team-tag">AI for Civic Innovation Hackathon 2026</div>
          </div>
        </div>
        <div class="foot-base">
          <span>© ${yr} SaafHawa · Prototype. Health guidance is general; not a substitute for a doctor.</span>
        </div>
      </footer>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderNav();
    renderFooter();
  });
})();
