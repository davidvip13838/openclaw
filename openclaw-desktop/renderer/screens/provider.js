/**
 * Screen 3: AI Provider Setup
 * Pick a provider, enter API key, choose model.
 */
import { nextScreen, prevScreen, wizardState } from "../app.js";

const providers = [
  {
    id: "openai",
    name: "OpenAI",
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill="currentColor"/></svg>`,
    desc: "GPT-4.1, o3, o4-mini",
    models: ["openai/gpt-4.1", "openai/o3", "openai/o4-mini", "openai/gpt-4.1-mini", "openai/gpt-4.1-nano"],
    keyPlaceholder: "sk-...",
    keyHint: "Find your key at platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.505-4.03H7.044l-1.473 4.03H2L6.569 3.52zm.637 10.05h4.553L9.537 7.148l-2.331 6.422z" fill="currentColor"/></svg>`,
    desc: "Claude Opus 4, Sonnet 4, Haiku",
    models: [
      "anthropic/claude-sonnet-4-20250514",
      "anthropic/claude-opus-4-0-20250609",
      "anthropic/claude-haiku-3-5-20241022",
    ],
    keyPlaceholder: "sk-ant-...",
    keyHint: "Find your key at console.anthropic.com/settings/keys",
  },
  {
    id: "google",
    name: "Google",
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`,
    desc: "Gemini 2.5 Pro, Flash",
    models: [
      "google/gemini-2.5-pro",
      "google/gemini-2.5-flash",
    ],
    keyPlaceholder: "AIza...",
    keyHint: "Find your key at aistudio.google.com/apikey",
  },
  {
    id: "custom",
    name: "Custom API",
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    desc: "OpenAI-compatible endpoint",
    models: [],
    keyPlaceholder: "Your API key",
    keyHint: "Any OpenAI-compatible provider",
  },
];

export async function renderProvider(container) {
  container.innerHTML = `
    <div class="scrollable">
      <h1 class="screen-title">Choose Your AI Provider</h1>
      <p class="screen-subtitle">
        Pick which AI model powers your assistant. You can change this later.
      </p>

      <div class="section-label">Provider</div>
      <div class="card-grid" id="provider-grid"></div>

      <div id="provider-config" style="display: none;">
        <div class="input-group">
          <label class="input-label" for="api-key-input">API Key</label>
          <input
            type="password"
            class="input-field"
            id="api-key-input"
            placeholder=""
            autocomplete="off"
          />
          <div class="input-hint" id="api-key-hint"></div>
        </div>

        <div class="input-group" id="model-group">
          <label class="input-label" for="model-select">Model</label>
          <select class="input-field" id="model-select" style="cursor: pointer;"></select>
        </div>

        <div id="custom-url-group" style="display: none;">
          <div class="input-group">
            <label class="input-label" for="custom-url-input">API Base URL</label>
            <input
              type="text"
              class="input-field"
              id="custom-url-input"
              placeholder="https://api.example.com/v1"
            />
          </div>
          <div class="input-group">
            <label class="input-label" for="custom-model-input">Model Name</label>
            <input
              type="text"
              class="input-field"
              id="custom-model-input"
              placeholder="e.g. my-model"
            />
          </div>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-ghost" id="btn-back">← Back</button>
        <button class="btn btn-primary" id="btn-continue" disabled>Continue</button>
      </div>
    </div>
  `;

  const grid = document.getElementById("provider-grid");
  const configSection = document.getElementById("provider-config");
  const apiKeyInput = document.getElementById("api-key-input");
  const apiKeyHint = document.getElementById("api-key-hint");
  const modelSelect = document.getElementById("model-select");
  const modelGroup = document.getElementById("model-group");
  const customUrlGroup = document.getElementById("custom-url-group");
  const continueBtn = document.getElementById("btn-continue");

  // Render provider cards
  providers.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.provider = p.id;
    card.innerHTML = `
      <div class="card-icon">${p.icon}</div>
      <div class="card-title">${p.name}</div>
      <div class="card-desc">${p.desc}</div>
    `;

    card.addEventListener("click", () => selectProvider(p));
    grid.appendChild(card);
  });

  // Restore state if going back
  if (wizardState.provider) {
    const p = providers.find((x) => x.id === wizardState.provider);
    if (p) selectProvider(p, true);
  }

  function selectProvider(provider, restoring = false) {
    // Highlight selected card
    document.querySelectorAll(".card").forEach((c) => c.classList.remove("selected"));
    document.querySelector(`[data-provider="${provider.id}"]`).classList.add("selected");

    wizardState.provider = provider.id;

    // Show config
    configSection.style.display = "block";
    apiKeyInput.placeholder = provider.keyPlaceholder;
    apiKeyHint.textContent = provider.keyHint;

    if (provider.id === "custom") {
      modelGroup.style.display = "none";
      customUrlGroup.style.display = "block";
    } else {
      modelGroup.style.display = "block";
      customUrlGroup.style.display = "none";

      modelSelect.innerHTML = "";
      provider.models.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m.split("/")[1];
        modelSelect.appendChild(opt);
      });
    }

    if (restoring) {
      apiKeyInput.value = wizardState.apiKey || "";
      if (wizardState.model) modelSelect.value = wizardState.model;
    }

    validateForm();
  }

  function validateForm() {
    const hasKey = apiKeyInput.value.trim().length > 5;
    continueBtn.disabled = !hasKey;
  }

  apiKeyInput.addEventListener("input", validateForm);

  continueBtn.addEventListener("click", () => {
    wizardState.apiKey = apiKeyInput.value.trim();
    wizardState.model = wizardState.provider === "custom"
      ? document.getElementById("custom-model-input").value.trim()
      : modelSelect.value;

    if (wizardState.provider === "custom") {
      wizardState.customBaseUrl = document.getElementById("custom-url-input").value.trim();
    }

    nextScreen();
  });

  document.getElementById("btn-back").addEventListener("click", prevScreen);
}
