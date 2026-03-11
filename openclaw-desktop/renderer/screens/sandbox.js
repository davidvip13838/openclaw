/**
 * Screen 5: Sandbox Mode
 * Card-select between Safe Mode (Docker sandbox) and Full Access (no sandbox).
 * All Docker setup is handled later on the Installing screen.
 */
import { nextScreen, prevScreen, wizardState } from "../app.js";

const modes = [
  {
    id: "safe",
    icon: "🛡️",
    name: "Safe Mode",
    badge: "Recommended",
    desc:
      "Your AI can only see and edit files in its own workspace folder. " +
      "It can't touch your personal files, photos, or anything else on your computer.",
  },
  {
    id: "full",
    icon: "⚡",
    name: "Full Access Mode",
    badge: null,
    desc:
      "Your AI can see and use everything on your computer, just like any app " +
      "you install. More power, but less protection for your files.",
  },
];

export async function renderSandbox(container) {
  container.innerHTML = `
    <div class="scrollable">
      <h1 class="screen-title">How Much Access Should Your AI Have?</h1>
      <p class="screen-subtitle">
        Your AI assistant needs to run tasks on your computer.
        Choose how much freedom it gets.
      </p>

      <div class="section-label">Choose a Mode</div>
      <div class="sandbox-mode-grid" id="mode-grid"></div>

      <div id="safe-mode-note" class="sandbox-note" style="display: none;">
        <div class="sandbox-note-icon">ℹ️</div>
        <div class="sandbox-note-text">
          Safe Mode setup takes a few extra minutes the first time — we'll handle
          everything for you in the next step. You won't need to do this again.
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-ghost" id="btn-back">← Back</button>
        <button class="btn btn-primary" id="btn-continue" disabled>Continue</button>
      </div>
    </div>
  `;

  const grid = document.getElementById("mode-grid");
  const noteEl = document.getElementById("safe-mode-note");
  const continueBtn = document.getElementById("btn-continue");

  // Render mode cards
  modes.forEach((mode) => {
    const card = document.createElement("div");
    card.className = "sandbox-card";
    card.dataset.mode = mode.id;
    card.innerHTML = `
      <div class="sandbox-card-header">
        <span class="sandbox-card-icon">${mode.icon}</span>
        <span class="sandbox-card-name">${mode.name}</span>
        ${mode.badge ? `<span class="sandbox-card-badge">${mode.badge}</span>` : ""}
      </div>
      <div class="sandbox-card-desc">${mode.desc}</div>
    `;

    card.addEventListener("click", () => selectMode(mode.id));
    grid.appendChild(card);
  });

  // Restore state if navigating back
  if (wizardState.sandbox?.enabled !== undefined) {
    const restoredMode = wizardState.sandbox.enabled ? "safe" : "full";
    selectMode(restoredMode, true);
  }

  function selectMode(modeId, restoring = false) {
    // Highlight selected card
    document.querySelectorAll(".sandbox-card").forEach((c) => c.classList.remove("selected"));
    const selectedCard = document.querySelector(`[data-mode="${modeId}"]`);
    if (selectedCard) selectedCard.classList.add("selected");

    // Update state
    wizardState.sandbox = { enabled: modeId === "safe" };

    // Show/hide the info note for Safe Mode
    noteEl.style.display = modeId === "safe" ? "flex" : "none";

    // Enable continue
    continueBtn.disabled = false;
  }

  document.getElementById("btn-back").addEventListener("click", prevScreen);
  continueBtn.addEventListener("click", nextScreen);
}
