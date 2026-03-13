/**
 * Screen 7: Automatic Pairing
 * - Telegram: polls for pending pairing requests and auto-approves them.
 * - WhatsApp: runs `openclaw channels login`, captures QR output, polls for link.
 * - Local: skips ahead.
 */
import { nextScreen, wizardState } from "../app.js";

export async function renderPairing(container) {
  // Skip entirely if user chose Local Webchat only
  if (wizardState.channelMode !== "telegram" && wizardState.channelMode !== "whatsapp") {
    nextScreen();
    return;
  }

  if (wizardState.channelMode === "whatsapp") {
    return renderWhatsAppPairing(container);
  }

  return renderTelegramPairing(container);
}

// ── Telegram Pairing ──────────────────────────────────────────

async function renderTelegramPairing(container) {
  container.innerHTML = `
    <div class="scrollable" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px;">
      <h1 class="screen-title" style="text-align: center;">Link Your Phone</h1>
      <p class="screen-subtitle" style="text-align: center; max-width: 440px;">
        Your gateway is running! Let's securely lock the bot to your Telegram account.
      </p>

      <div class="botfather-instructions" style="margin-bottom: 24px; max-width: 440px;">
        <h3 style="margin-bottom: 15px;">Just one thing left:</h3>
        <ol>
          <li>Open <strong>Telegram</strong> on your phone.</li>
          <li>Find the bot you just created.</li>
          <li>Send it any message (e.g., <em>"Hello"</em>).</li>
        </ol>
        <p style="margin-top: 12px; opacity: 0.7; font-size: 13px;">
          We'll detect the message and automatically pair your account. No codes to copy!
        </p>
      </div>

      <div id="pairing-status" style="text-align: center; margin-top: 12px;">
        <div class="spinner" style="margin: 0 auto 12px auto;"></div>
        <p style="opacity: 0.8; font-size: 14px;" id="pairing-status-text">Waiting for you to message your bot…</p>
      </div>

      <div style="margin-top: 30px;">
        <button class="btn btn-ghost" id="btn-skip" style="font-size: 13px; opacity: 0.6;">Skip — I'll pair later</button>
      </div>
    </div>
  `;

  const statusText = container.querySelector("#pairing-status-text");
  const statusDiv = container.querySelector("#pairing-status");
  const btnSkip = container.querySelector("#btn-skip");
  let polling = true;
  let pollCount = 0;
  const MAX_POLLS = 120;

  btnSkip.addEventListener("click", () => {
    polling = false;
    nextScreen();
  });

  async function pollForPairing() {
    while (polling) {
      if (!document.contains(statusText)) {
        polling = false;
        return;
      }

      pollCount++;
      if (pollCount > MAX_POLLS) {
        statusText.textContent = "Timed out waiting. Click Skip to continue.";
        return;
      }

      try {
        const result = await window.openclaw.runCommand("openclaw pairing list telegram --json 2>/dev/null");

        if (result.exitCode === 0 && result.stdout.trim()) {
          let data;
          try {
            data = JSON.parse(result.stdout.trim());
          } catch {
            await sleep(3000);
            continue;
          }

          const requests = Array.isArray(data) ? data : (data.requests || []);

          if (requests.length > 0) {
            const req = requests[0];
            const code = req.code || req.pairingCode || req.Code;
            if (code) {
              statusText.textContent = "Pairing request detected! Approving…";

              const approveResult = await window.openclaw.runCommand(
                `openclaw pairing approve telegram ${code}`
              );

              if (approveResult.exitCode === 0) {
                showSuccess(statusDiv, btnSkip, "telegram");
                return;
              }
            }
          }
        }

        const configResult = await window.openclaw.readConfig();
        if (configResult.exists) {
          const tg = configResult.config?.channels?.telegram;
          const acct = tg?.accounts?.default;
          const allowFrom = acct?.allowFrom || tg?.allowFrom;
          if (allowFrom && Array.isArray(allowFrom) && allowFrom.length > 0) {
            showSuccess(statusDiv, btnSkip, "telegram");
            return;
          }
        }
      } catch (err) {
        // Silently retry
      }

      await sleep(3000);
    }
  }

  pollForPairing();
}

// ── WhatsApp Pairing ──────────────────────────────────────────

async function renderWhatsAppPairing(container) {
  container.innerHTML = `
    <div class="scrollable" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px;">
      <h1 class="screen-title" style="text-align: center;">Link WhatsApp</h1>
      <p class="screen-subtitle" style="text-align: center; max-width: 440px;">
        Scan the QR code below with your WhatsApp app to link as a connected device.
      </p>

      <div style="margin-bottom: 20px; max-width: 440px; text-align: center;">
        <ol style="font-size: 14px; color: var(--text-secondary); text-align: left; padding-left: 20px;">
          <li style="margin-bottom: 6px;">Open <strong>WhatsApp</strong> on your phone.</li>
          <li style="margin-bottom: 6px;">Go to <strong>Settings → Linked Devices</strong>.</li>
          <li style="margin-bottom: 6px;">Tap <strong>"Link a Device"</strong>.</li>
          <li>Point your camera at the QR code below.</li>
        </ol>
      </div>

      <div id="whatsapp-qr-area" style="text-align: center; margin: 16px 0;">
        <div class="spinner" style="margin: 0 auto 12px auto;"></div>
        <p style="opacity: 0.8; font-size: 14px;" id="whatsapp-status-text">Starting WhatsApp login…</p>
      </div>

      <div style="margin-top: 20px; display: flex; gap: 12px;">
        <button class="btn btn-ghost" id="btn-skip-wa" style="font-size: 13px; opacity: 0.6;">Skip — I'll link later</button>
      </div>
    </div>
  `;

  const qrArea = container.querySelector("#whatsapp-qr-area");
  const statusText = container.querySelector("#whatsapp-status-text");
  const btnSkip = container.querySelector("#btn-skip-wa");
  let active = true;
  let qrOutput = "";

  btnSkip.addEventListener("click", () => {
    active = false;
    window.openclaw.whatsapp.cancel();
    nextScreen();
  });

  // Capture QR output from the CLI command
  window.openclaw.whatsapp.onOutput((chunk) => {
    if (!active) return;
    qrOutput += chunk;

    // The CLI outputs the QR as Unicode block characters
    // Detect QR by looking for the dense block of ▀▄█ chars
    if (hasQrBlock(qrOutput)) {
      const qrBlock = extractQrBlock(qrOutput);
      qrArea.innerHTML = `
        <pre class="whatsapp-qr-display">${escapeHtml(qrBlock)}</pre>
        <p style="opacity: 0.8; font-size: 13px; margin-top: 12px;">Waiting for you to scan…</p>
      `;
    }

    // Detect success — must match the EXACT success markers, not partial text
    // CLI prints "Scan this QR in WhatsApp (Linked Devices):" which contains "Linked",
    // so we need to match the full success message "✅ Linked" specifically
    if (qrOutput.includes("✅ Linked") || qrOutput.includes("web session ready")) {
      showSuccess(qrArea, btnSkip, "whatsapp");
      active = false;
    }
  });

  // Start the login process
  try {
    statusText.textContent = "Generating QR code…";
    const result = await window.openclaw.whatsapp.login();

    if (!active) return; // User skipped

    if (result.success) {
      showSuccess(qrArea, btnSkip, "whatsapp");
    } else {
      // Login process exited — check if already linked
      const linkCheck = await window.openclaw.whatsapp.checkLinked();
      if (linkCheck.linked) {
        showSuccess(qrArea, btnSkip, "whatsapp");
      } else {
        qrArea.innerHTML = `
          <p style="color: #ff5555; font-size: 14px;">WhatsApp login ended without linking.</p>
          <p style="opacity: 0.6; font-size: 13px; margin-top: 8px;">
            You can link later by running: <code>openclaw channels login --channel whatsapp</code>
          </p>
        `;
        btnSkip.textContent = "Continue anyway →";
        btnSkip.style.opacity = "1";
      }
    }
  } catch (err) {
    if (!active) return;
    qrArea.innerHTML = `
      <p style="color: #ff5555; font-size: 14px;">Failed to start WhatsApp login.</p>
      <p style="opacity: 0.6; font-size: 13px; margin-top: 8px;">${escapeHtml(String(err))}</p>
    `;
    btnSkip.textContent = "Continue anyway →";
    btnSkip.style.opacity = "1";
  }
}

// ── Shared Helpers ────────────────────────────────────────────

function showSuccess(statusDiv, btnSkip, channel) {
  const label = channel === "whatsapp" ? "WhatsApp Linked!" : "Bot Secured!";
  const desc = channel === "whatsapp"
    ? "Your WhatsApp account is now connected."
    : "Your Telegram account is now permanently linked.";
  statusDiv.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
    <p style="font-size: 18px; font-weight: 600; color: var(--success, #22c55e);">${label}</p>
    <p style="opacity: 0.7; font-size: 13px; margin-top: 6px;">${desc}</p>
  `;
  btnSkip.style.display = "none";

  // After WhatsApp linking, restart the gateway so it picks up the new creds
  if (channel === "whatsapp") {
    const restartMsg = document.createElement("p");
    restartMsg.style.cssText = "opacity: 0.6; font-size: 12px; margin-top: 8px;";
    restartMsg.textContent = "Restarting gateway…";
    statusDiv.appendChild(restartMsg);

    window.openclaw.gateway.restart()
      .then(() => { restartMsg.textContent = "Gateway restarted ✓"; })
      .catch(() => { restartMsg.textContent = "Restart manually if needed"; })
      .finally(() => { setTimeout(() => nextScreen(), 1500); });
  } else {
    setTimeout(() => nextScreen(), 1500);
  }
}

function hasQrBlock(text) {
  // QR output contains dense Unicode block chars (▀▄█░▓ or spaces for white)
  const lines = text.split("\n");
  let blockLines = 0;
  for (const line of lines) {
    if (/[▀▄█▌▐░▓■□]/.test(line) || (line.length > 10 && /^[\s█▀▄▌▐░▓■□]+$/.test(line))) {
      blockLines++;
    }
  }
  return blockLines >= 5;
}

function extractQrBlock(text) {
  const lines = text.split("\n");
  const qrLines = [];
  let inBlock = false;

  for (const line of lines) {
    const isBlockLine = /[▀▄█▌▐░▓■□]/.test(line) || (line.length > 10 && /^[\s█▀▄▌▐░▓■□]+$/.test(line));
    if (isBlockLine) {
      inBlock = true;
      qrLines.push(line);
    } else if (inBlock && line.trim() === "") {
      // Allow one blank line inside QR
      qrLines.push(line);
    } else if (inBlock) {
      break;
    }
  }
  return qrLines.join("\n");
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
