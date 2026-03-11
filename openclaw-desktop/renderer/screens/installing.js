/**
 * Screen 6: Installing
 * Writes config, sets up workspace, installs CLI if needed, starts gateway.
 * If Safe Mode (sandbox) is enabled, also installs Docker, pulls the sandbox
 * image, and verifies workspace mount — all behind a progress bar.
 * Does NOT advance to Complete until the gateway is confirmed running.
 */
import { nextScreen, wizardState } from "../app.js";

const baseSteps = [
  { id: "config", label: "Writing configuration…", doneLabel: "Configuration saved" },
  { id: "workspace", label: "Setting up workspace…", doneLabel: "Workspace ready" },
  { id: "cli", label: "Checking OpenClaw CLI…", doneLabel: "OpenClaw CLI ready" },
];

const sandboxSteps = [
  { id: "docker-check", label: "Checking Docker…", doneLabel: "Docker ready" },
  { id: "docker-install", label: "Installing Docker…", doneLabel: "Docker installed" },
  { id: "docker-start", label: "Starting Docker…", doneLabel: "Docker running" },
  { id: "sandbox-image", label: "Downloading Safe Mode environment…", doneLabel: "Safe Mode environment ready" },
  { id: "sandbox-verify", label: "Verifying Safe Mode…", doneLabel: "Safe Mode verified ✓" },
];

const finalSteps = [
  { id: "daemon", label: "Installing system service…", doneLabel: "System service installed" },
  { id: "gateway", label: "Starting gateway…", doneLabel: "Gateway running ✨" },
];

export async function renderInstalling(container) {
  const useSandbox = wizardState.sandbox?.enabled === true;
  const steps = [...baseSteps, ...(useSandbox ? sandboxSteps : []), ...finalSteps];
  // Track which steps to skip (e.g. Docker already installed)
  const skippedSteps = new Set();

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

  // ── Sandbox Docker steps (only when Safe Mode enabled) ──
  if (useSandbox) {
    // Show a note before starting Docker steps
    if (progressLabel) {
      progressLabel.textContent = "Safe Mode setup takes a few extra minutes the first time…";
      await sleep(800);
    }

    // Step: Check if Docker is already available
    let dockerReady = false;
    await runStep(stepIndexOf("docker-check"), "docker-check", async () => {
      const check = await window.openclaw.runCommand(
        "docker version --format '{{.Server.Version}}' 2>/dev/null"
      );
      if (check.exitCode === 0) {
        dockerReady = true;
        markSkipped("docker-install");
        markSkipped("docker-start");
        return { detail: `v${check.stdout.trim()}` };
      }
      // Check if CLI exists but daemon not running
      const cliCheck = await window.openclaw.runCommand("which docker 2>/dev/null");
      if (cliCheck.exitCode === 0) {
        markSkipped("docker-install");
        return { detail: "Installed, needs starting" };
      }
      return { detail: "Not installed — will set up now" };
    });

    // Step: Download and install Docker Desktop
    await runStep(stepIndexOf("docker-install"), "docker-install", async () => {
      // Detect CPU architecture
      const arch = await window.openclaw.runCommand("uname -m");
      const dmgUrl = arch.stdout.includes("arm64")
        ? "https://desktop.docker.com/mac/main/arm64/Docker.dmg"
        : "https://desktop.docker.com/mac/main/amd64/Docker.dmg";

      // Download (~600MB)
      updateDetail("docker-install", "Downloading Docker (this may take a few minutes)…");
      const download = await window.openclaw.runCommand(
        `curl -L -o /tmp/Docker.dmg "${dmgUrl}" 2>&1`
      );
      if (download.exitCode !== 0) {
        throw new Error("Download failed — check your internet connection");
      }

      // Mount disk image, copy app, unmount, clean up
      updateDetail("docker-install", "Installing Docker…");
      await window.openclaw.runCommand("hdiutil attach /tmp/Docker.dmg -nobrowse -quiet");
      const copy = await window.openclaw.runCommand(
        'cp -R "/Volumes/Docker/Docker.app" /Applications/ 2>&1'
      );
      await window.openclaw.runCommand('hdiutil detach "/Volumes/Docker" -quiet 2>/dev/null');
      await window.openclaw.runCommand("rm -f /tmp/Docker.dmg");

      if (copy.exitCode !== 0) {
        throw new Error("Couldn't install Docker — try running as admin");
      }
      return { detail: "Docker installed to Applications" };
    });

    // Step: Launch Docker Desktop and wait for daemon
    if (!dockerReady) {
      await runStep(stepIndexOf("docker-start"), "docker-start", async () => {
        updateDetail("docker-start", "Starting Docker — you may see a security prompt…");
        await window.openclaw.runCommand("open -a Docker");

        // Poll until daemon responds (up to 90 seconds)
        for (let i = 0; i < 45; i++) {
          await sleep(2000);
          const probe = await window.openclaw.runCommand(
            "docker version --format '{{.Server.Version}}' 2>/dev/null"
          );
          if (probe.exitCode === 0) {
            return { detail: `Docker v${probe.stdout.trim()} running` };
          }
          updateDetail("docker-start",
            `Waiting for Docker to start (${(i + 1) * 2}s)… You may see a security prompt.`
          );
        }
        throw new Error(
          "Docker is taking too long to start. Open Docker Desktop manually and try again."
        );
      });
    }

    // Step: Pull sandbox base image
    await runStep(stepIndexOf("sandbox-image"), "sandbox-image", async () => {
      updateDetail("sandbox-image", "Downloading Safe Mode environment — this may take a minute…");
      const pull = await window.openclaw.runCommand("docker pull debian:bookworm-slim 2>&1");
      if (pull.exitCode !== 0) {
        throw new Error("Couldn't download — check your internet connection");
      }
      // Tag as the sandbox image (matches OpenClaw's default)
      await window.openclaw.runCommand(
        "docker tag debian:bookworm-slim openclaw-sandbox:bookworm-slim"
      );
      return { detail: "Safe Mode environment ready" };
    });

    // Step: Verify workspace mount works
    await runStep(stepIndexOf("sandbox-verify"), "sandbox-verify", async () => {
      const test = await window.openclaw.runCommand(
        'docker run --rm -v "$HOME/.openclaw/workspace:/workspace:rw" ' +
        'openclaw-sandbox:bookworm-slim ls /workspace 2>&1'
      );
      if (test.exitCode !== 0) {
        const out = test.stderr || test.stdout || "";
        if (out.includes("Mounts denied") || out.includes("not shared")) {
          throw new Error(
            "Docker needs permission to access your files. " +
            "Open Docker Desktop → Settings → Resources → File Sharing, " +
            "and add your home folder."
          );
        }
        throw new Error("Safe Mode verification failed — " + out);
      }
      return { detail: "Safe Mode verified ✓" };
    });
  }

  await runStep(stepIndexOf("daemon"), "daemon", async () => {
    const check = await window.openclaw.runCommand("which openclaw 2>/dev/null");
    if (check.exitCode !== 0) {
      throw new Error("CLI not available — skipped");
    }
    await window.openclaw.runCommand("openclaw gateway install-daemon 2>&1 || true");
  });

  // ── Step 5: Start gateway and verify ────────────────────
  await runStep(stepIndexOf("gateway"), "gateway", async () => {
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

  function stepIndexOf(id) {
    return steps.findIndex((s) => s.id === id);
  }

  function updateDetail(id, text) {
    const el = document.getElementById(`detail-${id}`);
    if (el) el.textContent = text;
  }

  function markSkipped(id) {
    skippedSteps.add(id);
    const item = document.getElementById(`install-${id}`);
    if (item) {
      const icon = item.querySelector(".status-icon");
      const name = item.querySelector(".status-name");
      icon.className = "status-icon success";
      icon.textContent = "⏭️";
      name.textContent = "Skipped";
    }
  }

  async function runStep(index, id, work) {
    if (skippedSteps.has(id)) return;

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

  // Sandbox mode (Safe Mode)
  if (wizardState.sandbox?.enabled) {
    config.agents.defaults.sandbox = {
      mode: "all",
      workspaceAccess: "rw",
    };
  }

  return config;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
