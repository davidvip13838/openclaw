/**
 * OpenClaw Desktop — App Controller
 * Routes between Wizard Mode (first run) and Dashboard Mode (already set up).
 */

import { renderWelcome } from "./screens/welcome.js";
import { renderPrerequisites } from "./screens/prerequisites.js";
import { renderProvider } from "./screens/provider.js";
import { renderChannels } from "./screens/channels.js";
import { renderSandbox } from "./screens/sandbox.js";
import { renderInstalling } from "./screens/installing.js";
import { renderPairing } from "./screens/pairing.js";
import { renderComplete } from "./screens/complete.js";
import { loadDashboard } from "./dashboard/shell.js";

// ── Wizard screens (unchanged) ──────────────────────────────

const screens = [
  { id: "welcome", render: renderWelcome, step: 1 },
  { id: "prerequisites", render: renderPrerequisites, step: 2 },
  { id: "provider", render: renderProvider, step: 3 },
  { id: "channels", render: renderChannels, step: 4 },
  { id: "sandbox", render: renderSandbox, step: 5 },
  { id: "installing", render: renderInstalling, step: 6 },
  { id: "pairing", render: renderPairing, step: 7 },
  { id: "complete", render: renderComplete, step: 8 },
];

// Shared wizard state — each screen reads/writes to this
export const wizardState = {
  provider: null,       // "openai" | "anthropic" | "google" | "custom"
  apiKey: "",
  model: "",
  customBaseUrl: "",
  channelMode: "local", // "local" | "telegram"
  telegramToken: null,
  sandbox: { enabled: false },
};

let currentIndex = 0;
let mode = "wizard"; // "wizard" | "dashboard"

// ── Mode Router ──────────────────────────────────────────────

async function detectMode() {
  const isSetUp = await window.openclaw.checkSetup();
  return isSetUp ? "dashboard" : "wizard";
}

// ── Wizard Navigation ────────────────────────────────────────

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

export function nextScreen() {
  goToScreen(currentIndex + 1);
}

export function prevScreen() {
  goToScreen(currentIndex - 1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Boot ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  mode = await detectMode();

  if (mode === "dashboard") {
    // Hide wizard UI elements and load dashboard
    const indicator = document.getElementById("step-indicator");
    if (indicator) indicator.classList.add("hidden");

    const appContainer = document.getElementById("app");
    appContainer.classList.add("dashboard-mode");

    const container = document.getElementById("screen-container");
    await loadDashboard(container);
  } else {
    // Load wizard (current behavior)
    goToScreen(0);
  }
});
