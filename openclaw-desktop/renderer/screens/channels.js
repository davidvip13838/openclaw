/**
 * Screen 4: Channel Setup
 * Dedicated UI for Telegram and Local Webchat.
 */
import { nextScreen, prevScreen, wizardState } from "../app.js";

// Validates standard Telegram Bot Tokens (e.g. 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
const TELEGRAM_TOKEN_REGEX = /^\d+:[a-zA-Z0-9_-]+$/;

export async function renderChannels(container) {
  container.innerHTML = `
    <div class="scrollable">
      <h1 class="screen-title">Choose Your Interface</h1>
      <p class="screen-subtitle">
        How would you like to chat with your OpenClaw agent?
      </p>

      <!-- STATE 1: SELECTION CARDS -->
      <div id="selection-state" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
        <label class="toggle-card enabled" style="cursor: pointer;">
          <input type="radio" name="channel_choice" value="local" checked style="display: none;">
          <div class="toggle-left">
            <div class="toggle-icon">🌐</div>
            <div>
              <div class="toggle-name">Local Webchat</div>
              <div class="toggle-desc">Chat entirely privately in your browser. (Default)</div>
            </div>
          </div>
          <div style="font-size: 13px; color: var(--text-secondary);">✓ Selected</div>
        </label>
        
        <label class="toggle-card" style="cursor: pointer; border-color: var(--primary-color);">
          <input type="radio" name="channel_choice" value="telegram" style="display: none;">
          <div class="toggle-left">
            <div class="toggle-icon">✈️</div>
            <div>
              <div class="toggle-name" style="color: var(--primary-color);">Telegram Messenger</div>
              <div class="toggle-desc">Talk to your agent securely from your phone.</div>
            </div>
          </div>
          <div style="font-size: 13px; color: var(--primary-color);">Recommended</div>
        </label>
      </div>

      <!-- STATE 2: TELEGRAM INPUT (Initially Hidden) -->
      <div id="telegram-input-state" style="display: none; background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="margin-bottom: 15px;">
          <h3 style="margin-top: 0; font-size: 16px;">Link your Telegram Bot</h3>
          <ol style="font-size: 14px; color: var(--text-secondary); padding-left: 20px; margin-bottom: 0;">
            <li style="margin-bottom: 6px;">Open Telegram on your phone or desktop.</li>
            <li style="margin-bottom: 6px;">Search for <strong>@BotFather</strong> (the official verified account).</li>
            <li style="margin-bottom: 6px;">Send the message <code>/newbot</code> and follow his prompts.</li>
            <li>Copy the red <strong>HTTP API Token</strong> he gives you.</li>
          </ol>
        </div>
        
        <div class="input-group" style="margin-top: 20px;">
          <label class="input-label">Telegram Bot Token:</label>
          <input type="password" id="telegram-token-input" placeholder="e.g. 123456789:AAF_xxxxx..." class="input-field" autocomplete="off">
          <div id="token-error" style="display: none; color: #ff5555; margin-top: 8px; font-size: 13px;">
            Invalid token format. Must be Numbers:Letters.
          </div>
        </div>
      </div>
    </div>
    
    <div class="btn-group">
      <button class="btn btn-ghost" id="btn-back">← Back</button>
      <button class="btn btn-primary" id="btn-next">Continue</button>
    </div>
  `;

  const btnNext = container.querySelector("#btn-next");
  const btnBack = container.querySelector("#btn-back");
  const radios = container.querySelectorAll('input[name="channel_choice"]');
  const telegramState = container.querySelector("#telegram-input-state");
  const tokenInput = container.querySelector("#telegram-token-input");
  const tokenError = container.querySelector("#token-error");

  // Restore wizard state if the user clicked Back from a future screen
  if (wizardState.channelMode === "telegram") {
    container.querySelector('input[value="telegram"]').checked = true;
    container.querySelector('input[value="telegram"]').closest('.toggle-card').classList.add('enabled');
    container.querySelector('input[value="local"]').closest('.toggle-card').classList.remove('enabled');
    telegramState.style.display = "block";
    if (wizardState.telegramToken) {
      tokenInput.value = wizardState.telegramToken;
      validateTelegramToken();
    }
  } else {
    // channelMode already defaults to "local" in wizardState
  }

  // Toggle UI States based on selection
  radios.forEach(radio => {
    radio.parentElement.addEventListener("click", () => {
      // Visually update the radio buttons
      radios.forEach(r => {
        r.checked = false;
        r.parentElement.classList.remove("enabled");
        const statusDiv = r.parentElement.querySelector("div:last-child");
        if (r.value === "local") statusDiv.textContent = "";
      });
      
      radio.checked = true;
      radio.parentElement.classList.add("enabled");
      const statusDiv = radio.parentElement.querySelector("div:last-child");
      statusDiv.textContent = "✓ Selected";
      
      wizardState.channelMode = radio.value;

      if (radio.value === "telegram") {
        telegramState.style.display = "block";
        validateTelegramToken();
      } else {
        telegramState.style.display = "none";
        tokenError.style.display = "none";
        btnNext.disabled = false;
        btnNext.textContent = "Continue";
      }
    });
  });

  // Hot-validate the token as they type
  function validateTelegramToken() {
    const val = tokenInput.value.trim();
    if (!val) {
      btnNext.disabled = true;
      tokenError.style.display = "none";
      btnNext.textContent = "Verify & Continue";
      return false;
    }

    if (!TELEGRAM_TOKEN_REGEX.test(val)) {
      btnNext.disabled = true;
      tokenError.style.display = "block";
      tokenError.textContent = "Invalid token format. It should look like 123456:ABC-DEF...";
      btnNext.textContent = "Invalid Token";
      return false;
    }

    btnNext.disabled = false;
    tokenError.style.display = "none";
    btnNext.textContent = "Verify & Continue";
    return true;
  }

  tokenInput.addEventListener("input", validateTelegramToken);

  btnBack.addEventListener("click", () => prevScreen());

  btnNext.addEventListener("click", async () => {
    if (wizardState.channelMode === "telegram") {
      const token = tokenInput.value.trim();
      if (!validateTelegramToken()) return;

      btnNext.disabled = true;
      btnNext.textContent = "Verifying...";
      
      try {
        // Ping the Telegram API to prove the token is real before allowing the user to continue
        const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const json = await res.json();
        
        if (!json.ok) {
           tokenError.textContent = "Token rejected by Telegram. Did you copy it correctly?";
           tokenError.style.display = "block";
           btnNext.disabled = false;
           btnNext.textContent = "Verify & Continue";
           return;
        }

        // Token is valid! Save it to state and proceed.
        wizardState.telegramToken = token;
        nextScreen();
      } catch (err) {
        tokenError.textContent = "Failed to connect to Telegram api. Check your internet.";
        tokenError.style.display = "block";
        btnNext.disabled = false;
        btnNext.textContent = "Verify & Continue";
      }
    } else {
      // Local Dashboard only
      wizardState.telegramToken = null;
      nextScreen();
    }
  });
}
