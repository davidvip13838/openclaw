/**
 * Screen 8: Setup Complete 🎉
 * Simple celebration screen that funnels the user into the dashboard.
 */

export async function renderComplete(container) {
  container.innerHTML = `
    <div class="completion-icon">🎉</div>
    <div class="completion-title">Setup Complete!</div>
    <div class="completion-subtitle">
      Your configuration has been saved and the gateway is running.<br/>
      You can manage everything from the dashboard.
    </div>

    <div class="status-list">
      <div class="status-item">
        <div class="status-icon success">✅</div>
        <div class="status-info">
          <div class="status-name">Configuration Saved</div>
          <div class="status-detail">~/.openclaw/openclaw.json is ready</div>
        </div>
      </div>
      <div class="status-item">
        <div class="status-icon success">✅</div>
        <div class="status-info">
          <div class="status-name">Gateway Running</div>
          <div class="status-detail">Persistent daemon installed via launchd</div>
        </div>
      </div>
    </div>

    <div class="btn-group" style="justify-content: center; margin-top: 24px;">
      <button class="btn btn-primary" id="btn-go-dashboard">Go to Dashboard</button>
    </div>

    <p style="text-align: center; margin-top: 16px; font-size: 13px; color: var(--text-muted);">
      The gateway will keep running in the background, even after you close this app.
    </p>
  `;

  document.getElementById("btn-go-dashboard").addEventListener("click", () => {
    window.location.reload(); // Mode router detects setup → loads dashboard
  });
}
