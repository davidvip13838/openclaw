/**
 * Screen 2: Prerequisites Check
 * BLOCKS progression until Node.js ≥22 and OpenClaw CLI are both installed.
 */
import { nextScreen } from "../app.js";

export async function renderPrerequisites(container) {
  // Track live state locally (Bug #4 fix: avoid module-level mutable state)
  let nodeOk = false;
  let clawOk = false;

  container.innerHTML = `
    <h1 class="screen-title">Checking Prerequisites</h1>
    <p class="screen-subtitle">
      We need to install a few things before OpenClaw can run.
    </p>

    <div class="status-list" id="prereq-list">
      <div class="status-item" id="status-node">
        <div class="status-icon checking">⏳</div>
        <div class="status-info">
          <div class="status-name">Node.js ≥ 22</div>
          <div class="status-detail" id="node-detail">Checking…</div>
        </div>
        <div class="status-action" id="node-action"></div>
      </div>

      <div class="status-item" id="status-openclaw">
        <div class="status-icon checking">⏳</div>
        <div class="status-info">
          <div class="status-name">OpenClaw CLI</div>
          <div class="status-detail" id="openclaw-detail">Checking…</div>
        </div>
        <div class="status-action" id="openclaw-action"></div>
      </div>
    </div>

    <div class="btn-group" style="justify-content: center;">
      <button class="btn btn-secondary" id="btn-recheck">
        Re-check
      </button>
      <button class="btn btn-primary" id="btn-prereq-continue" disabled>
        Continue
      </button>
    </div>
    <p id="prereq-hint" class="input-hint" style="text-align: center; margin-top: 12px; display: none;"></p>
  `;

  const continueBtn = document.getElementById("btn-prereq-continue");
  const hintEl = document.getElementById("prereq-hint");

  continueBtn.addEventListener("click", () => {
    if (nodeOk && clawOk) {
      nextScreen();
    }
  });

  document.getElementById("btn-recheck").addEventListener("click", () => {
    renderPrerequisites(container);
  });

  await runChecks();

  // ── Run all checks ──────────────────────────────────────
  async function runChecks() {
    const results = await window.openclaw.checkPrerequisites();

    const nodeIcon = document.querySelector("#status-node .status-icon");
    const nodeDetail = document.getElementById("node-detail");
    const nodeAction = document.getElementById("node-action");

    const clawIcon = document.querySelector("#status-openclaw .status-icon");
    const clawDetail = document.getElementById("openclaw-detail");
    const clawAction = document.getElementById("openclaw-action");

    // ── Node.js ─────────────────────────────────────────
    if (results.node.installed && results.node.sufficient) {
      nodeOk = true;
      nodeIcon.className = "status-icon success";
      nodeIcon.textContent = "✅";
      nodeDetail.textContent = `v${results.node.version} — ready`;
    } else if (results.node.installed && !results.node.sufficient) {
      nodeOk = false;
      nodeIcon.className = "status-icon warning";
      nodeIcon.textContent = "⚠️";
      nodeDetail.textContent = `v${results.node.version} — needs v22 or higher`;
      nodeAction.innerHTML = `<button class="btn btn-secondary" id="btn-install-node">Upgrade Node.js</button>`;
    } else {
      nodeOk = false;
      nodeIcon.className = "status-icon error";
      nodeIcon.textContent = "❌";
      nodeDetail.textContent = "Not installed";
      nodeAction.innerHTML = `<button class="btn btn-secondary" id="btn-install-node">Install Node.js</button>`;
    }

    // ── OpenClaw CLI ────────────────────────────────────
    // Double-check with 'which' to avoid false positives
    const whichCheck = await window.openclaw.runCommand("which openclaw 2>/dev/null && openclaw --version 2>/dev/null");

    if (results.openclaw.installed && whichCheck.exitCode === 0) {
      clawOk = true;
      clawIcon.className = "status-icon success";
      clawIcon.textContent = "✅";
      clawDetail.textContent = `${results.openclaw.version} — ready`;
    } else {
      clawOk = false;
      clawIcon.className = "status-icon error";
      clawIcon.textContent = "❌";
      clawDetail.textContent = "Not installed";

      if (nodeOk) {
        clawAction.innerHTML = `<button class="btn btn-secondary" id="btn-install-openclaw">Install OpenClaw</button>`;
      } else {
        clawDetail.textContent = "Install Node.js first";
      }
    }

    // ── Update continue button ──────────────────────────
    updateContinueState();

    // ── Bind install buttons ────────────────────────────
    const installNodeBtn = document.getElementById("btn-install-node");
    if (installNodeBtn) {
      installNodeBtn.addEventListener("click", () => installNode(installNodeBtn, nodeIcon, nodeDetail, nodeAction, clawIcon, clawDetail, clawAction));
    }

    const installClawBtn = document.getElementById("btn-install-openclaw");
    if (installClawBtn) {
      installClawBtn.addEventListener("click", () => installOpenClaw(installClawBtn, clawIcon, clawDetail));
    }
  }

  // ── Update the continue button state ────────────────────
  function updateContinueState() {
    if (nodeOk && clawOk) {
      continueBtn.disabled = false;
      hintEl.style.display = "none";
    } else {
      continueBtn.disabled = true;
      const missing = [];
      if (!nodeOk) missing.push("Node.js ≥ 22");
      if (!clawOk) missing.push("OpenClaw CLI");
      hintEl.textContent = `Still needed: ${missing.join(" and ")}`;
      hintEl.style.display = "block";
    }
  }

  // ── Install Node.js via Homebrew ────────────────────────
  async function installNode(btn, nodeIcon, nodeDetail, nodeAction, clawIcon, clawDetail, clawAction) {
    btn.disabled = true;
    btn.textContent = "Installing…";
    nodeDetail.textContent = "Installing via Homebrew (this may take a minute)…";
    nodeIcon.className = "status-icon checking";
    nodeIcon.innerHTML = '<span class="spinner">⏳</span>';

    const result = await window.openclaw.runCommand("brew install node@22 2>&1 || brew install node 2>&1");

    if (result.exitCode === 0) {
      nodeOk = true;
      nodeIcon.className = "status-icon success";
      nodeIcon.textContent = "✅";
      nodeDetail.textContent = "Installed — ready";
      btn.remove();

      // Now show install openclaw button
      clawAction.innerHTML = `<button class="btn btn-secondary" id="btn-install-openclaw">Install OpenClaw</button>`;
      clawDetail.textContent = "Not installed";
      clawIcon.className = "status-icon error";
      clawIcon.textContent = "❌";
      const installClawBtn = document.getElementById("btn-install-openclaw");
      if (installClawBtn) {
        installClawBtn.addEventListener("click", () => installOpenClaw(installClawBtn, clawIcon, clawDetail));
      }
    } else {
      nodeIcon.className = "status-icon error";
      nodeIcon.textContent = "❌";
      nodeDetail.textContent = "Install failed — try: brew install node";
      btn.textContent = "Retry";
      btn.disabled = false;
    }

    updateContinueState();
  }

  // ── Install OpenClaw via npm ────────────────────────────
  async function installOpenClaw(btn, clawIcon, clawDetail) {
    btn.disabled = true;
    btn.textContent = "Installing…";
    clawDetail.textContent = "Installing openclaw globally (this may take a minute)…";
    clawIcon.className = "status-icon checking";
    clawIcon.innerHTML = '<span class="spinner">⏳</span>';

    const result = await window.openclaw.runCommand("npm install -g openclaw@latest 2>&1");

    if (result.exitCode === 0) {
      // Verify it actually works
      const verify = await window.openclaw.runCommand("which openclaw && openclaw --version 2>/dev/null");
      if (verify.exitCode === 0) {
        clawOk = true;
        clawIcon.className = "status-icon success";
        clawIcon.textContent = "✅";
        clawDetail.textContent = `${verify.stdout.split("\n").pop()} — ready`;
        btn.remove();
      } else {
        clawIcon.className = "status-icon warning";
        clawIcon.textContent = "⚠️";
        clawDetail.textContent = "Installed but not found in PATH. Try restarting.";
        btn.textContent = "Retry";
        btn.disabled = false;
      }
    } else {
      clawIcon.className = "status-icon error";
      clawIcon.textContent = "❌";
      clawDetail.textContent = "Install failed. " + (result.stderr || result.stdout || "").slice(0, 120);
      btn.textContent = "Retry";
      btn.disabled = false;
    }

    updateContinueState();
  }
}
