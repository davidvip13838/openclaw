/**
 * Screen 3: AI Provider Setup
 * Pick a provider, enter API key, choose model.
 */
import { nextScreen, prevScreen, wizardState } from "../app.js";

const providers = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "🤖",
    desc: "GPT-4.1, o3, o4-mini",
    models: ["openai/gpt-4.1", "openai/o3", "openai/o4-mini", "openai/gpt-4.1-mini", "openai/gpt-4.1-nano"],
    keyPlaceholder: "sk-...",
    keyHint: "Find your key at platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "🧠",
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
    icon: "🔷",
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
    icon: "⚙️",
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
