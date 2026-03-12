/**
 * Dashboard View: Gateway Status
 * Shows gateway health, connected channels, and quick actions.
 */

let isRestarting = false;

export async function renderStatusView(container) {
  container.innerHTML = `
    <div class="dashboard-view-header">
      <h1 class="dashboard-title">Gateway Status</h1>
      <p class="dashboard-subtitle" id="status-subtitle">Checking…</p>
    </div>

    <div class="status-cards" id="status-cards">
      <div class="dash-card" id="card-gateway">
        <div class="dash-card-header">
          <span class="dash-card-icon" id="gateway-icon">⏳</span>
          <span class="dash-card-title">Gateway</span>
        </div>
        <div class="dash-card-value" id="gateway-status">Checking…</div>
        <div class="dash-card-detail" id="gateway-detail"></div>
      </div>

      <div class="dash-card" id="card-channels">
        <div class="dash-card-header">
          <span class="dash-card-icon">💬</span>
          <span class="dash-card-title">Channels</span>
        </div>
        <div class="dash-card-value" id="channels-count">—</div>
        <div class="dash-card-detail" id="channels-detail"></div>
      </div>

      <div class="dash-card" id="card-model">
        <div class="dash-card-header">
          <span class="dash-card-icon">🤖</span>
          <span class="dash-card-title">Model</span>
        </div>
        <div class="dash-card-value" id="model-name">—</div>
        <div class="dash-card-detail" id="model-detail"></div>
      </div>
    </div>

    <div class="quick-actions">
      <h2 class="section-label">Quick Actions</h2>
      <div class="action-row">
        <button class="btn btn-primary" id="btn-start-gateway" style="display:none;">
          ▶️ Start Gateway
        </button>
        <button class="btn btn-secondary" id="btn-restart-gateway">
          🔄 Restart
        </button>
        <button class="btn btn-secondary" id="btn-open-chat">
          💬 Open Chat
        </button>
        <button class="btn btn-secondary" id="btn-clear-sessions" style="margin-left: auto;">
          🗑️ Clear Sessions
        </button>
      </div>
    </div>
  `;

  // Bind quick actions
  document.getElementById("btn-start-gateway").addEventListener("click", startGateway);
  document.getElementById("btn-restart-gateway").addEventListener("click", restartGateway);
  document.getElementById("btn-clear-sessions").addEventListener("click", clearSessions);
  document.getElementById("btn-open-chat").addEventListener("click", () => {
    window.openclaw.openExternal("http://localhost:18789/chat");
  });

  // Listen for background poller updates — skip during restart
  window.addEventListener("gateway:status-update", (e) => {
    if (!isRestarting) updateUI(e.detail);
  });

  // Initial check
  const status = await window.openclaw.gateway.status();
  updateUI(status);
}

function updateUI(status) {
  const icon = document.getElementById("gateway-icon");
  const statusEl = document.getElementById("gateway-status");
  const detailEl = document.getElementById("gateway-detail");
  const subtitleEl = document.getElementById("status-subtitle");
  const startBtn = document.getElementById("btn-start-gateway");
  const channelsCount = document.getElementById("channels-count");
  const channelsDetail = document.getElementById("channels-detail");
  const modelName = document.getElementById("model-name");
  const modelDetail = document.getElementById("model-detail");

  if (status.running) {
    icon.textContent = "✅";
    statusEl.textContent = "Running";
    statusEl.className = "dash-card-value status-running";
    detailEl.textContent = `Port ${status.port || 18789}`;
    subtitleEl.textContent = "Everything looks good";
    subtitleEl.className = "dashboard-subtitle text-success";
    startBtn.style.display = "none";
  } else if (!isRestarting) {
    // Only show "Stopped" + Start button if we're NOT mid-restart
    icon.textContent = "❌";
    statusEl.textContent = "Stopped";
    statusEl.className = "dash-card-value status-stopped";
    detailEl.textContent = "Not responding";
    subtitleEl.textContent = "Gateway is not running";
    subtitleEl.className = "dashboard-subtitle text-error";
    startBtn.style.display = "";
  }

  // Channels info
  if (status.channels && status.channels.length > 0) {
    channelsCount.textContent = status.channels.length;
    channelsDetail.textContent = status.channels.join(", ");
  } else {
    channelsCount.textContent = status.running ? "0" : "—";
    channelsDetail.textContent = status.running ? "No channels configured" : "";
  }

  // Model info
  if (status.model) {
    modelName.textContent = status.model;
    modelDetail.textContent = status.provider || "";
  } else if (status.config) {
    modelName.textContent = status.config.model || "Default";
    modelDetail.textContent = "";
  }
}

async function startGateway() {
  const btn = document.getElementById("btn-start-gateway");
  btn.disabled = true;
  btn.textContent = "Starting…";

  await window.openclaw.gateway.start();
  await new Promise((r) => setTimeout(r, 3000));

  const status = await window.openclaw.gateway.status();
  updateUI(status);
  btn.disabled = false;
  btn.textContent = "▶️ Start Gateway";
}

async function restartGateway() {
  const btn = document.getElementById("btn-restart-gateway");
  const icon = document.getElementById("gateway-icon");
  const statusEl = document.getElementById("gateway-status");
  const subtitleEl = document.getElementById("status-subtitle");

  // Lock UI — prevents poller from flashing Start button during brief downtime
  isRestarting = true;
  btn.disabled = true;
  btn.textContent = "🔄 Restarting…";
  icon.textContent = "🔄";
  statusEl.textContent = "Restarting…";
  statusEl.className = "dash-card-value";
  subtitleEl.textContent = "Restarting gateway…";
  subtitleEl.className = "dashboard-subtitle";

  await window.openclaw.gateway.restart();
  await new Promise((r) => setTimeout(r, 3000));

  // Get status first, THEN unlock — prevents poller from sneaking in
  const status = await window.openclaw.gateway.status();
  updateUI(status);
  isRestarting = false;
  btn.disabled = false;
  btn.textContent = "🔄 Restart";
}

async function clearSessions() {
  const btn = document.getElementById("btn-clear-sessions");

  // Confirmation — second click to confirm
  if (!btn.dataset.confirm) {
    btn.dataset.confirm = "true";
    btn.textContent = "⚠️ Confirm Clear?";
    btn.classList.add("btn-danger");
    setTimeout(() => {
      btn.dataset.confirm = "";
      btn.textContent = "🗑️ Clear Sessions";
      btn.classList.remove("btn-danger");
    }, 3000);
    return;
  }

  btn.disabled = true;
  btn.textContent = "Clearing…";
  btn.classList.remove("btn-danger");

  const result = await window.openclaw.sessions.clear();

  if (result.success) {
    // Restart gateway so it picks up clean state
    isRestarting = true;
    btn.textContent = "Cleared! Restarting…";

    // Update status card to show restarting
    document.getElementById("gateway-icon").textContent = "🔄";
    document.getElementById("gateway-status").textContent = "Restarting…";
    document.getElementById("gateway-status").className = "dash-card-value";
    document.getElementById("status-subtitle").textContent = "Sessions cleared, restarting gateway…";
    document.getElementById("status-subtitle").className = "dashboard-subtitle";

    await window.openclaw.gateway.restart();
    await new Promise((r) => setTimeout(r, 3000));
    const status = await window.openclaw.gateway.status();
    updateUI(status);
    isRestarting = false;
    btn.textContent = "🗑️ Clear Sessions";
  } else {
    btn.textContent = "❌ Failed";
    setTimeout(() => { btn.textContent = "🗑️ Clear Sessions"; }, 2000);
  }

  btn.disabled = false;
  btn.dataset.confirm = "";
}
