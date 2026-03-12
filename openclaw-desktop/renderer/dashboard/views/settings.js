/**
 * Dashboard View: Settings
 * Danger Zone with full reset + type-to-confirm modal.
 */

export async function renderSettingsView(container) {
  container.innerHTML = `
    <div class="dashboard-view-header">
      <h1 class="dashboard-title">Settings</h1>
      <p class="dashboard-subtitle">Manage your OpenClaw installation</p>
    </div>

    <div class="danger-zone">
      <h2 class="danger-zone-title">⚠️ Danger Zone</h2>

      <div class="danger-zone-card">
        <div class="danger-zone-info">
          <h3 class="danger-zone-heading">🗑️ Uninstall OpenClaw</h3>
          <p class="danger-zone-desc">
            Removes all configuration, sessions, API keys, and stops the gateway daemon.
            The CLI will also be uninstalled. You can re-run setup from this app anytime.
          </p>
        </div>
        <button class="btn btn-danger-outline" id="btn-reset">
          Uninstall
        </button>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div class="modal-overlay hidden" id="reset-modal">
      <div class="modal">
        <h2 class="modal-title">⚠️ Uninstall OpenClaw?</h2>
        <div class="modal-body">
          <p>This will <strong>permanently delete</strong>:</p>
          <ul class="modal-list">
            <li>Gateway daemon (stopped + removed)</li>
            <li>Configuration (~/.openclaw/)</li>
            <li>All sessions and chat history</li>
            <li>API keys and auth profiles</li>
            <li>OpenClaw CLI (npm global)</li>
          </ul>
          <p class="modal-hint">
            To reconfigure OpenClaw, restart this app or open it anytime in the future.
            The setup wizard will guide you through installation again.
          </p>
          <label class="modal-label" for="confirm-input">
            Type <strong>uninstall</strong> to confirm:
          </label>
          <input
            type="text"
            id="confirm-input"
            class="input-field modal-input"
            placeholder="Type uninstall"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="btn-cancel-reset">Cancel</button>
          <button class="btn btn-danger-solid" id="btn-confirm-reset" disabled>
            Uninstall
          </button>
        </div>
      </div>
    </div>

    <!-- Post-Reset Completion -->
    <div class="reset-complete hidden" id="reset-complete">
      <div class="completion-icon">✅</div>
      <h1 class="completion-title" style="background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        OpenClaw has been reset
      </h1>
      <p class="completion-subtitle">
        To reconfigure OpenClaw, restart this app or open it anytime in the future.<br/>
        The setup wizard will guide you through installation again.
      </p>
      <div class="btn-group" style="justify-content: center; margin-top: 24px;">
        <button class="btn btn-primary" id="btn-restart-app">
          🔄 Restart App
        </button>
      </div>
    </div>
  `;

  // Bind events
  document.getElementById("btn-reset").addEventListener("click", openModal);
  document.getElementById("btn-cancel-reset").addEventListener("click", closeModal);
  document.getElementById("btn-confirm-reset").addEventListener("click", executeReset);

  const confirmInput = document.getElementById("confirm-input");
  const confirmBtn = document.getElementById("btn-confirm-reset");

  confirmInput.addEventListener("input", () => {
    confirmBtn.disabled = confirmInput.value.trim().toLowerCase() !== "uninstall";
  });

  // Close modal on overlay click
  document.getElementById("reset-modal").addEventListener("click", (e) => {
    if (e.target.id === "reset-modal") closeModal();
  });
}

function openModal() {
  document.getElementById("reset-modal").classList.remove("hidden");
  document.getElementById("confirm-input").value = "";
  document.getElementById("btn-confirm-reset").disabled = true;
  setTimeout(() => document.getElementById("confirm-input").focus(), 100);
}

function closeModal() {
  document.getElementById("reset-modal").classList.add("hidden");
}

async function executeReset() {
  const confirmBtn = document.getElementById("btn-confirm-reset");
  const cancelBtn = document.getElementById("btn-cancel-reset");
  const input = document.getElementById("confirm-input");

  confirmBtn.disabled = true;
  cancelBtn.disabled = true;
  input.disabled = true;
  confirmBtn.textContent = "Uninstalling…";

  const result = await window.openclaw.uninstall.reset();

  closeModal();

  if (result.success) {
    // Take over the entire app — kill sidebar, dashboard, everything
    const app = document.getElementById("app");
    app.className = ""; // Remove dashboard-mode class
    app.style.cssText = "height: 100%; padding-top: 38px; display: flex; align-items: center; justify-content: center;";
    app.innerHTML = `
      <div id="screen-container" style="width: 100%; max-width: 720px; padding: 0 40px; text-align: center;">
        <div class="completion-icon">✅</div>
        <h1 class="completion-title" style="background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          OpenClaw has been uninstalled
        </h1>
        <p class="completion-subtitle">
          All configuration, sessions, and the gateway daemon have been removed.<br/><br/>
          To set up OpenClaw again, click below or open this app anytime in the future.<br/>
          The setup wizard will guide you through installation.
        </p>
        <div class="btn-group" style="justify-content: center; margin-top: 24px;">
          <button class="btn btn-primary" id="btn-rerun-setup">
            🔄 Re-run Setup
          </button>
        </div>
      </div>
    `;

    document.getElementById("btn-rerun-setup").addEventListener("click", () => {
      window.location.reload();
    });
  } else {
    // Show what failed
    const failed = result.steps.filter((s) => !s.success);
    alert(`Reset partially failed:\n${failed.map((s) => `${s.scope}: ${s.error}`).join("\n")}`);

    confirmBtn.disabled = false;
    cancelBtn.disabled = false;
    input.disabled = false;
    confirmBtn.textContent = "Uninstall";
  }
}
