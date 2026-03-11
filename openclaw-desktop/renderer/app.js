/**
 * OpenClaw Desktop — App Navigation Controller
 * Manages screen transitions and shared state.
 */

import { renderWelcome } from "./screens/welcome.js";
import { renderPrerequisites } from "./screens/prerequisites.js";
import { renderProvider } from "./screens/provider.js";
import { renderChannels } from "./screens/channels.js";
import { renderSandbox } from "./screens/sandbox.js";
import { renderInstalling } from "./screens/installing.js";
import { renderComplete } from "./screens/complete.js";

const screens = [
  { id: "welcome", render: renderWelcome, step: 1 },
  { id: "prerequisites", render: renderPrerequisites, step: 2 },
  { id: "provider", render: renderProvider, step: 3 },
  { id: "channels", render: renderChannels, step: 4 },
  { id: "sandbox", render: renderSandbox, step: 5 },
  { id: "installing", render: renderInstalling, step: 6 },
  { id: "complete", render: renderComplete, step: 7 },
];

// Shared wizard state — each screen reads/writes to this
export const wizardState = {
  provider: null,       // "openai" | "anthropic" | "google" | "custom"
  apiKey: "",
  model: "",
  channels: {},         // { whatsapp: true, telegram: false, ... }
  channelConfigs: {},   // { telegram: { botToken: "..." }, ... }
  sandbox: { enabled: false },  // { enabled: true } for Safe Mode
};

let currentIndex = 0;

/**
 * Navigate to a screen by index
 */
export async function goToScreen(index) {
  if (index < 0 || index >= screens.length) return;

  const container = document.getElementById("screen-container");
  const indicator = document.getElementById("step-indicator");

  // Animate out
  container.classList.remove("screen-enter");
  container.classList.add("screen-exit");

  await sleep(200);

  currentIndex = index;
  const screen = screens[currentIndex];

  // Update step indicator
  if (currentIndex === 0) {
    indicator.classList.add("hidden");
  } else {
    indicator.classList.remove("hidden");
    document.querySelectorAll(".step").forEach((el) => {
      const step = parseInt(el.dataset.step, 10);
      el.classList.remove("active", "completed");
      if (step === screen.step) el.classList.add("active");
      else if (step < screen.step) el.classList.add("completed");
    });
  }

  // Render new screen
  container.innerHTML = "";
  container.classList.remove("screen-exit");
  container.classList.add("screen-enter");
  await screen.render(container);
}

/**
 * Go to the next screen
 */
export function nextScreen() {
  goToScreen(currentIndex + 1);
}

/**
 * Go to the previous screen
 */
export function prevScreen() {
  goToScreen(currentIndex - 1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Boot ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  goToScreen(0);
});
