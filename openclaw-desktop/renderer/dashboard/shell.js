/**
 * Dashboard Shell — Sidebar + View Container
 * Loaded when the user has already completed setup.
 */

import { renderStatusView } from "./views/status.js";

const views = [
  { id: "status", label: "Status", icon: "🏠", render: renderStatusView },
];

let currentView = "status";

export async function loadDashboard(container) {
  container.innerHTML = `
    <div class="dashboard">
      <nav class="dashboard-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-logo">🐾</span>
          <span class="sidebar-title">OpenClaw</span>
        </div>
        <div class="sidebar-nav" id="sidebar-nav"></div>
        <div class="sidebar-footer">
          <button class="sidebar-btn" id="btn-open-web" title="Open Web Dashboard">
            🌐 Web Dashboard
          </button>
          <button class="sidebar-btn" id="btn-rerun-wizard" title="Re-run Setup Wizard">
            ⚙️ Re-run Setup
          </button>
        </div>
      </nav>
      <main class="dashboard-main" id="dashboard-view"></main>
    </div>
  `;

  // Build sidebar nav items
  const nav = document.getElementById("sidebar-nav");
  for (const view of views) {
    const item = document.createElement("button");
    item.className = `sidebar-nav-item${view.id === currentView ? " active" : ""}`;
    item.dataset.view = view.id;
    item.innerHTML = `<span class="nav-icon">${view.icon}</span><span class="nav-label">${view.label}</span>`;
    item.addEventListener("click", () => switchView(view.id));
    nav.appendChild(item);
  }

  // Footer buttons
  document.getElementById("btn-open-web").addEventListener("click", () => {
    window.openclaw.openExternal("http://localhost:18789");
  });

  document.getElementById("btn-rerun-wizard").addEventListener("click", () => {
    window.location.reload(); // Will re-detect and load wizard after config delete
  });

  // Load the default view
  await switchView(currentView);

  // Listen for status updates from background poller
  window.openclaw.onGatewayStatus((status) => {
    const event = new CustomEvent("gateway:status-update", { detail: status });
    window.dispatchEvent(event);
  });
}

async function switchView(viewId) {
  currentView = viewId;

  // Update sidebar active state
  document.querySelectorAll(".sidebar-nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === viewId);
  });

  // Render the view
  const viewContainer = document.getElementById("dashboard-view");
  const view = views.find((v) => v.id === viewId);
  if (view) {
    viewContainer.innerHTML = "";
    await view.render(viewContainer);
  }
}
