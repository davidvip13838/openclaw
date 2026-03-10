/**
 * Screen 5: Installing
 * Writes config, sets up workspace, installs CLI if needed, starts gateway.
 * Does NOT advance to Complete until the gateway is confirmed running.
 */
import { nextScreen, wizardState } from "../app.js";

const steps = [
  { id: "config", label: "Writing configuration…", doneLabel: "Configuration saved" },
  { id: "workspace", label: "Setting up workspace…", doneLabel: "Workspace ready" },
  { id: "cli", label: "Checking OpenClaw CLI…", doneLabel: "OpenClaw CLI ready" },
  { id: "daemon", label: "Installing system service…", doneLabel: "System service installed" },
  { id: "gateway", label: "Starting gateway…", doneLabel: "Gateway running ✨" },
];

export async function renderInstalling(container) {
  container.innerHTML = `
    <h1 class="screen-title" style="text-align: center;">Setting Up OpenClaw</h1>
    <p class="screen-subtitle" style="text-align: center;">
      Hang tight — we're getting everything ready.
    </p>

    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" id="progress-fill" style="width: 0%;"></div>
      </div>
      <div class="progress-label" id="progress-label">Preparing…</div>
    </div>

    <div class="status-list" id="install-steps"></div>

    <div id="install-actions" style="display: none;">
      <div class="btn-group" style="justify-content: center;">
        <button class="btn btn-primary" id="btn-continue-anyway">Continue</button>
      </div>
    </div>
  `;

  const stepList = document.getElementById("install-steps");
  const progressFill = document.getElementById("progress-fill");
  const progressLabel = document.getElementById("progress-label");
  let hadFailure = false;

  // Render step items
  steps.forEach((step) => {
    const item = document.createElement("div");
    item.className = "status-item";
    item.id = `install-${step.id}`;
    item.innerHTML = `
      <div class="status-icon" style="background: var(--bg-glass); color: var(--text-muted);">○</div>
      <div class="status-info">
        <div class="status-name">${step.label}</div>
        <div class="status-detail" id="detail-${step.id}"></div>
      </div>
    `;
    stepList.appendChild(item);
  });

  // ── Step 1: Write config ────────────────────────────────
  await runStep(0, "config", async () => {
    // Write clean openclaw.json (no API keys — those go in auth profiles)
    const config = buildConfig();
    const result = await window.openclaw.writeConfig(config);
    if (!result.success) throw new Error(result.error);

    // Write API key as an auth profile (how OpenClaw actually stores credentials)
    if (wizardState.provider && wizardState.apiKey) {
      const authResult = await window.openclaw.writeAuthProfile({
        provider: wizardState.provider === "custom" ? "custom" : wizardState.provider,
        apiKey: wizardState.apiKey,
      });
      if (!authResult.success) throw new Error(authResult.error);
    }
    return { detail: "Config + credentials saved" };
  });

  // ── Step 2: Set up workspace ────────────────────────────
  await runStep(1, "workspace", async () => {
    await window.openclaw.runCommand("mkdir -p ~/.openclaw/workspace/skills");
  });

  // ── Step 3: Ensure OpenClaw CLI is installed ────────────
  await runStep(2, "cli", async () => {
    const check = await window.openclaw.runCommand("which openclaw 2>/dev/null");
    if (check.exitCode === 0) {
      // Already installed
      const ver = await window.openclaw.runCommand("openclaw --version 2>/dev/null");
      return { detail: ver.stdout.trim() || "installed" };
    }

    // Not installed — install it now
    updateDetail("cli", "Installing openclaw (this may take a minute)…");
    const install = await window.openclaw.runCommand("npm install -g openclaw@latest 2>&1");

    if (install.exitCode !== 0) {
      throw new Error("npm install failed — check Node.js is installed");
    }

    // Verify installation
    const verify = await window.openclaw.runCommand("which openclaw 2>/dev/null");
    if (verify.exitCode !== 0) {
      throw new Error("Installed but not found in PATH");
    }

    const ver = await window.openclaw.runCommand("openclaw --version 2>/dev/null");
    return { detail: ver.stdout.trim() || "installed" };
  });

  // ── Step 4: Install daemon ──────────────────────────────
  await runStep(3, "daemon", async () => {
    const check = await window.openclaw.runCommand("which openclaw 2>/dev/null");
    if (check.exitCode !== 0) {
      throw new Error("CLI not available — skipped");
    }
    await window.openclaw.runCommand("openclaw gateway install-daemon 2>&1 || true");
  });

  // ── Step 5: Start gateway and verify ────────────────────
  await runStep(4, "gateway", async () => {
    const check = await window.openclaw.runCommand("which openclaw 2>/dev/null");
    if (check.exitCode !== 0) {
      throw new Error("CLI not available — can't start gateway");
    }

    // Start the gateway as a launchd service
    await window.openclaw.runCommand("openclaw gateway start 2>&1 || true");

    // Also try running it directly in background as fallback
    await window.openclaw.runCommand("nohup openclaw gateway run --port 18789 --allow-unconfigured > /dev/null 2>&1 &");

    // Poll until gateway responds
    updateDetail("gateway", "Waiting for gateway to respond…");
    for (let i = 0; i < 8; i++) {
      await sleep(1500);
      const probe = await window.openclaw.runCommand(
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:18789/ 2>/dev/null || echo 'down'"
      );
      if (probe.stdout === "200" || probe.stdout === "401" || probe.stdout === "302") {
        return { detail: "http://localhost:18789" };
      }
      updateDetail("gateway", `Waiting for gateway to respond… (${i + 1}/8)`);
    }

    throw new Error("Gateway started but not responding yet");
  });

  // ── Done ────────────────────────────────────────────────
  progressFill.style.width = "100%";

  if (hadFailure) {
    progressLabel.textContent = "Setup finished with some issues";
    // Show continue button so user can proceed to Complete screen which explains what's wrong
    document.getElementById("install-actions").style.display = "block";
    document.getElementById("btn-continue-anyway").addEventListener("click", () => {
      nextScreen();
    });
  } else {
    progressLabel.textContent = "Everything is ready! 🎉";
    await sleep(1200);
    nextScreen();
  }

  // ── Helpers ─────────────────────────────────────────────

  function updateDetail(id, text) {
    const el = document.getElementById(`detail-${id}`);
    if (el) el.textContent = text;
  }

  async function runStep(index, id, work) {
    const percent = Math.round((index / steps.length) * 100);
    progressFill.style.width = `${percent}%`;
    progressLabel.textContent = steps[index].label;

    const item = document.getElementById(`install-${id}`);
    const icon = item.querySelector(".status-icon");
    const detail = document.getElementById(`detail-${id}`);

    icon.className = "status-icon checking";
    icon.innerHTML = '<span class="spinner">⏳</span>';

    try {
      const result = await work();
      icon.className = "status-icon success";
      icon.textContent = "✅";
      item.querySelector(".status-name").textContent = steps[index].doneLabel;
      detail.textContent = result?.detail || "";
    } catch (err) {
      hadFailure = true;
      icon.className = "status-icon warning";
      icon.textContent = "⚠️";
      detail.textContent = err.message || "Completed with warnings";
    }

    await sleep(400);
  }
}

/**
 * Build the openclaw.json config from wizard state
 */
function buildConfig() {
  const config = {
    // Required for gateway to start
    gateway: {
      mode: "local",
      port: 18789,
      bind: "loopback",
      auth: {
        mode: "none",
      },
    },
    agents: {
      defaults: {},
    },
  };

  // Set the primary model
  if (wizardState.provider && wizardState.model) {
    config.agents.defaults.model = {
      primary: wizardState.model,
    };
  }

  // For custom providers, add the provider config (built-in providers don't need this)
  if (wizardState.provider === "custom" && wizardState.customBaseUrl) {
    config.models = {
      providers: {
        custom: {
          baseUrl: wizardState.customBaseUrl,
          api: "openai-completions",
          models: [{
            id: wizardState.model ? wizardState.model.split("/")[1] || wizardState.model : "model",
            name: wizardState.model || "Custom Model",
            contextWindow: 128000,
            maxTokens: 4096,
            input: ["text"],
            reasoning: false,
          }],
        },
      },
    };
  }

  // Channels
  if (wizardState.channels.telegram && wizardState.channelConfigs.telegram?.botToken) {
    config.channels = config.channels || {};
    config.channels.telegram = {
      botToken: wizardState.channelConfigs.telegram.botToken,
    };
  }

  if (wizardState.channels.discord && wizardState.channelConfigs.discord?.token) {
    config.channels = config.channels || {};
    config.channels.discord = {
      token: wizardState.channelConfigs.discord.token,
    };
  }

  if (wizardState.channels.slack) {
    const slackConfig = wizardState.channelConfigs.slack || {};
    if (slackConfig.botToken) {
      config.channels = config.channels || {};
      config.channels.slack = {
        botToken: slackConfig.botToken,
        appToken: slackConfig.appToken || "",
      };
    }
  }

  return config;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
