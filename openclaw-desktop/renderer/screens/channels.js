/**
 * Screen 4: Channel Setup
 * Toggle messaging channels on/off, enter channel-specific config.
 */
import { nextScreen, prevScreen, wizardState } from "../app.js";

const channels = [
  { id: "whatsapp", name: "WhatsApp", icon: "💬", desc: "Link via QR code", configFields: [] },
  {
    id: "telegram",
    name: "Telegram",
    icon: "✈️",
    desc: "Requires a bot token",
    configFields: [
      { key: "botToken", label: "Bot Token", placeholder: "123456:ABCDEF", type: "password" },
    ],
  },
  {
    id: "discord",
    name: "Discord",
    icon: "🎮",
    desc: "Requires a bot token",
    configFields: [
      { key: "token", label: "Bot Token", placeholder: "Your Discord bot token", type: "password" },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    icon: "📋",
    desc: "Requires bot + app tokens",
    configFields: [
      { key: "botToken", label: "Bot Token", placeholder: "xoxb-...", type: "password" },
      { key: "appToken", label: "App Token", placeholder: "xapp-...", type: "password" },
    ],
  },
  { id: "webchat", name: "WebChat", icon: "🌐", desc: "Built-in, always available", configFields: [], alwaysOn: true },
  {
    id: "signal",
    name: "Signal",
    icon: "🔒",
    desc: "Requires signal-cli",
    configFields: [],
  },
];

export async function renderChannels(container) {
  container.innerHTML = `
    <div class="scrollable">
      <h1 class="screen-title">Connect Your Channels</h1>
      <p class="screen-subtitle">
        Choose where you'd like to talk to your AI assistant.
        You can add more channels later.
      </p>

      <div class="section-label">Messaging Channels</div>
      <div id="channel-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;"></div>

      <div id="channel-config-area"></div>

      <div class="btn-group">
        <button class="btn btn-ghost" id="btn-back">← Back</button>
        <button class="btn btn-secondary" id="btn-skip">Skip for Now</button>
        <button class="btn btn-primary" id="btn-continue">Continue</button>
      </div>
    </div>
  `;

  const listEl = document.getElementById("channel-list");
  const configArea = document.getElementById("channel-config-area");

  // Restore state
  if (!wizardState.channels) wizardState.channels = {};
  if (!wizardState.channelConfigs) wizardState.channelConfigs = {};

  channels.forEach((ch) => {
    const isOn = ch.alwaysOn || wizardState.channels[ch.id] || false;

    const toggle = document.createElement("div");
    toggle.className = `toggle-card ${isOn ? "enabled" : ""}`;
    toggle.dataset.channel = ch.id;
    toggle.innerHTML = `
      <div class="toggle-left">
        <div class="toggle-icon">${ch.icon}</div>
        <div>
          <div class="toggle-name">${ch.name}</div>
          <div class="toggle-desc">${ch.desc}</div>
        </div>
      </div>
      <div style="font-size: 13px; color: var(--text-secondary);">
        ${ch.alwaysOn ? "Always on" : (isOn ? "✓ Enabled" : "Click to enable")}
      </div>
    `;

    if (!ch.alwaysOn) {
      toggle.addEventListener("click", () => {
        const enabled = !wizardState.channels[ch.id];
        wizardState.channels[ch.id] = enabled;
        toggle.classList.toggle("enabled", enabled);

        // Update label
        const label = toggle.querySelector("div:last-child");
        label.textContent = enabled ? "✓ Enabled" : "Click to enable";

        // Show/hide config fields
        renderChannelConfigs();
      });
    }

    if (isOn) wizardState.channels[ch.id] = true;
    listEl.appendChild(toggle);
  });

  renderChannelConfigs();

  function renderChannelConfigs() {
    configArea.innerHTML = "";

    channels.forEach((ch) => {
      if (!wizardState.channels[ch.id] || ch.configFields.length === 0) return;

      const section = document.createElement("div");
      section.style.marginBottom = "20px";
      section.innerHTML = `<div class="section-label">${ch.icon} ${ch.name} Configuration</div>`;

      ch.configFields.forEach((field) => {
        const saved = wizardState.channelConfigs[ch.id]?.[field.key] || "";
        const group = document.createElement("div");
        group.className = "input-group";
        group.innerHTML = `
          <label class="input-label">${field.label}</label>
          <input
            type="${field.type || "text"}"
            class="input-field channel-input"
            data-channel="${ch.id}"
            data-key="${field.key}"
            placeholder="${field.placeholder}"
            value="${saved}"
            autocomplete="off"
          />
        `;
        section.appendChild(group);
      });

      configArea.appendChild(section);
    });

    // Bind input saving
    configArea.querySelectorAll(".channel-input").forEach((input) => {
      input.addEventListener("input", () => {
        const chId = input.dataset.channel;
        const key = input.dataset.key;
        if (!wizardState.channelConfigs[chId]) wizardState.channelConfigs[chId] = {};
        wizardState.channelConfigs[chId][key] = input.value;
      });
    });
  }

  document.getElementById("btn-back").addEventListener("click", prevScreen);
  document.getElementById("btn-skip").addEventListener("click", nextScreen);
  document.getElementById("btn-continue").addEventListener("click", nextScreen);
}
