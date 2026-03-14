/**
 * Screen 8: Setup Complete 🎉
 * Simple celebration screen that funnels the user into the dashboard.
 */
import { wizardState } from "../app.js";

export async function renderComplete(container) {
  // Build a contextual "getting started" tip based on channel choice
  let channelTip = "";
  if (wizardState.channelMode === "whatsapp") {
    channelTip = `
      <div style="background: rgba(37, 211, 102, 0.1); border: 1px solid rgba(37, 211, 102, 0.25); border-radius: 8px; padding: 16px; margin-top: 20px; text-align: left; max-width: 440px;">
        <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">📱 Getting Started with WhatsApp</div>
        <p style="font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.6;">
          Open <strong>WhatsApp</strong> and send a message <strong>to yourself</strong> (your own chat).
          Your agent will reply right there! All conversations happen in your self-chat.
        </p>
      </div>
    `;
  } else if (wizardState.channelMode === "telegram") {
    channelTip = `
      <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 8px; padding: 16px; margin-top: 20px; text-align: left; max-width: 440px;">
        <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">✈️ Getting Started with Telegram</div>
        <p style="font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.6;">
          Open <strong>Telegram</strong> and send a message to your bot.
          Your agent will reply instantly!
        </p>
      </div>
    `;
  }

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

    <div style="display: flex; justify-content: center;">
      ${channelTip}
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
