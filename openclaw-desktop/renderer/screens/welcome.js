/**
 * Screen 1: Welcome
 */
import { nextScreen } from "../app.js";

export async function renderWelcome(container) {
  container.innerHTML = `
    <div class="logo">🦞</div>
    <h1 class="screen-title" style="text-align: center;">Welcome to OpenClaw</h1>
    <p class="screen-subtitle" style="text-align: center;">
      Your personal AI assistant, running on your own device.<br/>
      Let's get you set up — no terminal required.
    </p>

    <div class="notice">
      <div class="notice-title">⚠️ Security Note</div>
      <div class="notice-text">
        OpenClaw runs on your machine and can execute actions on your behalf.
        It's designed for personal, single-user use. By continuing, you acknowledge
        that you understand the security implications.
        <a href="#" id="learn-more-security" style="color: var(--accent); text-decoration: none;">Learn more →</a>
      </div>
    </div>

    <div class="btn-group" style="justify-content: center;">
      <button class="btn btn-primary" id="btn-get-started">
        Get Started
      </button>
    </div>
  `;

  document.getElementById("btn-get-started").addEventListener("click", () => {
    nextScreen();
  });

  document.getElementById("learn-more-security").addEventListener("click", (e) => {
    e.preventDefault();
    window.openclaw.openExternal("https://docs.openclaw.ai/gateway/security");
  });
}
