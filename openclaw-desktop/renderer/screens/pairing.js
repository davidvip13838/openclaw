/**
 * Screen 7: Automatic Telegram Pairing
 * Polls for pending pairing requests and auto-approves them.
 * Also detects if the bot is already paired and skips ahead.
 */
import { nextScreen, wizardState } from "../app.js";

export async function renderPairing(container) {
  // Skip entirely if user chose Local Webchat only
  if (wizardState.channelMode !== "telegram") {
    nextScreen();
    return;
  }

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
  const MAX_POLLS = 120; // 6 minutes max (120 * 3s)

  btnSkip.addEventListener("click", () => {
    polling = false;
    nextScreen();
  });

  async function pollForPairing() {
    while (polling) {
      // Bug #2 fix: Stop polling if this screen's DOM was replaced
      if (!document.contains(statusText)) {
        polling = false;
        return;
      }

      // Bug #5 fix (adapted): Timeout after MAX_POLLS attempts
      pollCount++;
      if (pollCount > MAX_POLLS) {
        statusText.textContent = "Timed out waiting. Click Skip to continue.";
        return;
      }

      try {
        // Check for pending pairing requests
        const result = await window.openclaw.runCommand("openclaw pairing list telegram --json 2>/dev/null");

        if (result.exitCode === 0 && result.stdout.trim()) {
          let data;
          try {
            data = JSON.parse(result.stdout.trim());
          } catch {
            await sleep(3000);
            continue;
          }

          // The CLI returns { channel: "telegram", requests: [...] }
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
                showSuccess();
                return;
              }
            }
          }
        }

        // Bug #3 fix: Use IPC readConfig instead of spawning cat via shell
        const configResult = await window.openclaw.readConfig();
        if (configResult.exists) {
          const tg = configResult.config?.channels?.telegram;
          const acct = tg?.accounts?.default;
          const allowFrom = acct?.allowFrom || tg?.allowFrom;
          if (allowFrom && Array.isArray(allowFrom) && allowFrom.length > 0) {
            showSuccess();
            return;
          }
        }
      } catch (err) {
        // Silently retry
      }

      await sleep(3000);
    }
  }

  function showSuccess() {
    polling = false;
    statusDiv.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
      <p style="font-size: 18px; font-weight: 600; color: var(--success, #22c55e);">Bot Secured!</p>
      <p style="opacity: 0.7; font-size: 13px; margin-top: 6px;">Your Telegram account is now permanently linked.</p>
    `;
    btnSkip.style.display = "none";
    setTimeout(() => {
      nextScreen();
    }, 1500);
  }

  pollForPairing();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
