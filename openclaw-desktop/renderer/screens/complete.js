/**
 * Screen 8: Setup Complete 🎉
 * Shows context-aware status based on what's actually installed / running.
 */

export async function renderComplete(container) {
  container.innerHTML = `
    <div class="completion-icon">🎉</div>
    <div class="completion-title">Setup Complete!</div>
    <div class="completion-subtitle">
      Your configuration has been saved.
    </div>

    <div class="status-list" id="final-status"></div>
    <div id="action-area"></div>

    <p style="text-align: center; margin-top: 24px; font-size: 13px; color: var(--text-muted);">
      You can close this window anytime.
    </p>
  `;

  const statusList = document.getElementById("final-status");
  const actionArea = document.getElementById("action-area");

  // Check what's actually available
  const cliCheck = await window.openclaw.runCommand("which openclaw 2>/dev/null");
  const hasCli = cliCheck.exitCode === 0;

  // Inefficiency #5 fix: Use fetch() directly instead of spawning curl via shell
  let isRunning = false;
  try {
    const res = await fetch("http://localhost:18789/", { signal: AbortSignal.timeout(3000) });
    isRunning = res.status === 200 || res.status === 401 || res.status === 302;
  } catch {
    isRunning = false;
  }

  // Always show config saved
  statusList.innerHTML = `
    <div class="status-item">
      <div class="status-icon success">✅</div>
      <div class="status-info">
        <div class="status-name">Configuration Saved</div>
        <div class="status-detail">~/.openclaw/openclaw.json is ready</div>
      </div>
    </div>
  `;

  if (isRunning) {
    // ── BEST CASE: Gateway is up ────────────────────────
    statusList.innerHTML += `
      <div class="status-item">
        <div class="status-icon success">✅</div>
        <div class="status-info">
          <div class="status-name">Gateway Running</div>
          <div class="status-detail">ws://127.0.0.1:18789</div>
        </div>
      </div>
    `;

    actionArea.innerHTML = `
      <div class="btn-group" style="justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-primary" id="btn-open-dashboard">Open Dashboard</button>
        <button class="btn btn-secondary" id="btn-open-webchat">Start Chatting</button>
      </div>
    `;

    document.getElementById("btn-open-dashboard").addEventListener("click", () => {
      window.openclaw.openExternal("http://localhost:18789");
    });
    document.getElementById("btn-open-webchat").addEventListener("click", () => {
      window.openclaw.openExternal("http://localhost:18789/chat");
    });

  } else if (!hasCli) {
    // ── CLI NOT INSTALLED ───────────────────────────────
    statusList.innerHTML += `
      <div class="status-item">
        <div class="status-icon warning">⚠️</div>
        <div class="status-info">
          <div class="status-name">OpenClaw CLI Not Installed</div>
          <div class="status-detail">Install it to start the gateway</div>
        </div>
      </div>
    `;

    actionArea.innerHTML = `
      <div class="notice">
        <div class="notice-title">One More Step</div>
        <div class="notice-text">
          Your config is saved and ready! You just need to install the OpenClaw CLI.<br/><br/>
          Run this in a terminal:<br/><br/>
          <code style="background: rgba(255,255,255,0.08); padding: 6px 12px; border-radius: 6px; font-size: 13px; color: var(--accent);">
            npm install -g openclaw@latest
          </code><br/><br/>
          Then start the gateway:<br/><br/>
          <code style="background: rgba(255,255,255,0.08); padding: 6px 12px; border-radius: 6px; font-size: 13px; color: var(--accent);">
            openclaw gateway
          </code>
        </div>
      </div>

      <div class="btn-group" style="justify-content: center;">
        <button class="btn btn-primary" id="btn-install-now">Install OpenClaw Now</button>
        <button class="btn btn-secondary" id="btn-open-docs">View Documentation</button>
      </div>
    `;

    document.getElementById("btn-install-now").addEventListener("click", async () => {
      const btn = document.getElementById("btn-install-now");
      btn.disabled = true;
      btn.textContent = "Installing…";

      const result = await window.openclaw.runCommand("npm install -g openclaw@latest 2>&1");

      if (result.exitCode === 0) {
        btn.textContent = "Installed! Starting gateway…";
        await window.openclaw.runCommand("openclaw gateway start --background 2>&1 || true");
        await new Promise((r) => setTimeout(r, 3000));
        renderComplete(container); // Re-render to check status
      } else {
        btn.textContent = "Install Failed — Check Terminal";
        btn.disabled = false;
      }
    });

    document.getElementById("btn-open-docs").addEventListener("click", () => {
      window.openclaw.openExternal("https://docs.openclaw.ai/start/getting-started");
    });

  } else {
    // ── CLI INSTALLED BUT GATEWAY NOT RUNNING ───────────
    statusList.innerHTML += `
      <div class="status-item">
        <div class="status-icon success">✅</div>
        <div class="status-info">
          <div class="status-name">OpenClaw CLI Installed</div>
          <div class="status-detail">${cliCheck.stdout.trim()}</div>
        </div>
      </div>
      <div class="status-item">
        <div class="status-icon warning">⚠️</div>
        <div class="status-info">
          <div class="status-name">Gateway Not Running Yet</div>
          <div class="status-detail">Click below to start it</div>
        </div>
      </div>
    `;

    actionArea.innerHTML = `
      <div class="btn-group" style="justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-primary" id="btn-start-gateway">Start Gateway</button>
        <button class="btn btn-secondary" id="btn-open-docs">View Documentation</button>
      </div>
    `;

    document.getElementById("btn-start-gateway").addEventListener("click", async () => {
      const btn = document.getElementById("btn-start-gateway");
      btn.disabled = true;
      btn.textContent = "Starting…";

      await window.openclaw.runCommand("openclaw gateway start --background 2>&1 || true");
      await new Promise((r) => setTimeout(r, 3000));

      let nowRunning = false;
      try {
        const res = await fetch("http://localhost:18789/", { signal: AbortSignal.timeout(3000) });
        nowRunning = res.status === 200 || res.status === 401 || res.status === 302;
      } catch {
        nowRunning = false;
      }

      if (nowRunning) {
        renderComplete(container);
      } else {
        btn.textContent = "Not responding — try from terminal";
        btn.disabled = true;
      }
    });

    document.getElementById("btn-open-docs").addEventListener("click", () => {
      window.openclaw.openExternal("https://docs.openclaw.ai/start/getting-started");
    });
  }
}
