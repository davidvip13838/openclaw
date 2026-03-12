const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const { exec, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");

const CONFIG_DIR = path.join(os.homedir(), ".openclaw");
const CONFIG_PATH = path.join(CONFIG_DIR, "openclaw.json");

// Compute augmented PATH once at startup (Inefficiency #1 fix)
const FULL_PATH = (() => {
  const extra = [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    path.join(os.homedir(), ".nvm/versions/node"),
    path.join(os.homedir(), ".volta/bin"),
    path.join(os.homedir(), ".fnm"),
  ];
  return [...extra, process.env.PATH].join(":");
})();

// Allowlisted command prefixes for security (Security #2 fix)
const ALLOWED_COMMAND_PREFIXES = [
  "openclaw", "which", "node", "npm", "brew", "curl",
  "cat", "mkdir", "uname", "docker", "hdiutil", "open",
  "nohup", "rm", "pgrep", "osascript",
];

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    vibrancy: "under-window",
    backgroundColor: "#0a0a0f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ── IPC Handlers ──────────────────────────────────────────────

/**
 * Run a shell command and return { stdout, stderr, exitCode }
 */
ipcMain.handle("run-command", async (_event, command) => {
  // Security: validate command starts with an allowed prefix
  const cmdBase = command.trim().split(/\s+/)[0].replace(/^.*\//, "");
  if (!ALLOWED_COMMAND_PREFIXES.some(p => cmdBase === p)) {
    return { stdout: "", stderr: `Blocked command: ${cmdBase}`, exitCode: 1 };
  }
  return new Promise((resolve) => {
    exec(command, { shell: "/bin/zsh", env: { ...process.env, PATH: FULL_PATH } }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout?.trim() ?? "",
        stderr: stderr?.trim() ?? "",
        exitCode: error ? error.code ?? 1 : 0,
      });
    });
  });
});

/**
 * Run a long-running command and stream output via events
 */
ipcMain.handle("run-command-stream", async (event, command) => {
  return new Promise((resolve) => {
    const child = spawn("/bin/zsh", ["-c", command], {
      env: { ...process.env, PATH: FULL_PATH },
    });

    child.stdout.on("data", (data) => {
      event.sender.send("command-output", data.toString());
    });

    child.stderr.on("data", (data) => {
      event.sender.send("command-output", data.toString());
    });

    child.on("close", (code) => {
      resolve({ exitCode: code ?? 0 });
    });
  });
});

/**
 * Check prerequisites: Node.js, npm, openclaw
 */
ipcMain.handle("check-prerequisites", async () => {
  const results = {};

  // Check Node.js
  try {
    const nodeResult = await runCmd("node --version");
    const version = nodeResult.stdout.replace("v", "").trim();
    const major = parseInt(version.split(".")[0], 10);
    results.node = { installed: true, version, sufficient: major >= 22 };
  } catch {
    results.node = { installed: false, version: null, sufficient: false };
  }

  // Check npm
  try {
    const npmResult = await runCmd("npm --version");
    results.npm = { installed: true, version: npmResult.stdout.trim() };
  } catch {
    results.npm = { installed: false, version: null };
  }

  // Check openclaw
  try {
    const clawResult = await runCmd("openclaw --version");
    results.openclaw = { installed: true, version: clawResult.stdout.trim() };
  } catch {
    results.openclaw = { installed: false, version: null };
  }

  return results;
});

/**
 * Read the openclaw.json config file
 */
ipcMain.handle("read-config", async () => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { exists: false, config: {} };
    }
    const content = fs.readFileSync(CONFIG_PATH, "utf-8");
    return { exists: true, config: JSON.parse(content) };
  } catch {
    return { exists: false, config: {} };
  }
});

/**
 * Write the openclaw.json config file
 */
ipcMain.handle("write-config", async (_event, config) => {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Open a URL in the default browser
 */
ipcMain.handle("open-external", async (_event, url) => {
  shell.openExternal(url);
});

/**
 * Write an auth profile for a provider (API key credential).
 * This is how OpenClaw actually stores API keys — NOT in openclaw.json.
 * Format matches upsertAuthProfile() from the CLI.
 */
ipcMain.handle("write-auth-profile", async (_event, { provider, apiKey }) => {
  try {
    const agentDir = path.join(CONFIG_DIR, "agents", "main", "agent");
    const profilesPath = path.join(agentDir, "auth-profiles.json");

    // Ensure directory exists
    fs.mkdirSync(agentDir, { recursive: true });

    // Read existing store (must match AuthProfileStore format the CLI expects)
    let store = { version: 2, profiles: {} };
    if (fs.existsSync(profilesPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(profilesPath, "utf-8"));
        // Handle both old flat format and correct versioned format
        if (raw && typeof raw === "object" && raw.version && raw.profiles) {
          store = raw;
        } else if (raw && typeof raw === "object") {
          // Migrate from old flat format written by previous desktop versions
          store.profiles = raw;
        }
      } catch {
        // Corrupted file — start fresh
      }
    }

    // Upsert the profile
    const profileId = `${provider}:default`;
    store.profiles[profileId] = {
      type: "api_key",
      provider: provider,
      key: apiKey,
    };

    fs.writeFileSync(profilesPath, JSON.stringify(store, null, 2), "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Install the openclaw daemon via CLI
 */
ipcMain.handle("install-daemon", async (event) => {
  return new Promise((resolve) => {
    const child = spawn("/bin/zsh", ["-c", "openclaw gateway install --force"], {
      env: { ...process.env, PATH: FULL_PATH },
    });

    child.stdout.on("data", (data) => {
      event.sender.send("command-output", data.toString());
    });
    child.stderr.on("data", (data) => {
      event.sender.send("command-output", data.toString());
    });
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 0 });
    });
  });
});

// ── Helpers ───────────────────────────────────────────────────

function runCmd(command) {
  return new Promise((resolve, reject) => {
    exec(command, { shell: "/bin/zsh", env: { ...process.env, PATH: FULL_PATH } }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout: stdout?.trim() ?? "", stderr: stderr?.trim() ?? "" });
    });
  });
}

// ── Layer 2: Typed IPC Handlers (Dashboard) ───────────────────

/**
 * Check if setup is complete (config file exists)
 */
ipcMain.handle("check-setup", async () => {
  return fs.existsSync(CONFIG_PATH);
});

/**
 * Get gateway status — returns { running, port, channels, model, config }
 */
ipcMain.handle("gateway:status", async () => {
  const result = { running: false, port: 18789, channels: [], model: null, config: null };

  // Check if gateway is responding
  try {
    const http = require("http");
    const running = await new Promise((resolve) => {
      const req = http.get("http://localhost:18789/", (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 401 || res.statusCode === 302);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });
    result.running = running;
  } catch {
    result.running = false;
  }

  // Read config for model info
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      result.config = config;
      result.model = config.model || null;

      // Extract channel names from config
      if (config.channels) {
        result.channels = Object.keys(config.channels);
      }
    }
  } catch {
    // Config read failed — not critical
  }

  return result;
});

/**
 * Start the gateway daemon
 */
ipcMain.handle("gateway:start", async () => {
  try {
    await runCmd("openclaw gateway install --force");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Restart the gateway daemon (kill + let launchd re-launch)
 */
ipcMain.handle("gateway:restart", async () => {
  try {
    const uid = process.getuid();
    await runCmd(`launchctl kickstart -k gui/${uid}/ai.openclaw.gateway`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Clear all sessions — removes session JSONL files and resets sessions.json
 */
ipcMain.handle("sessions:clear", async () => {
  try {
    const sessionsDir = path.join(CONFIG_DIR, "agents", "main", "sessions");
    if (fs.existsSync(sessionsDir)) {
      const files = fs.readdirSync(sessionsDir);
      for (const file of files) {
        if (file.endsWith(".jsonl")) {
          fs.unlinkSync(path.join(sessionsDir, file));
        }
      }
      // Reset sessions index
      const sessionsJson = path.join(sessionsDir, "sessions.json");
      if (fs.existsSync(sessionsJson)) {
        fs.writeFileSync(sessionsJson, "{}", "utf-8");
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ── Background Poller ────────────────────────────────────────

let pollerInterval = null;

function startPoller() {
  if (pollerInterval) return;
  pollerInterval = setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const http = require("http");
      const running = await new Promise((resolve) => {
        const req = http.get("http://localhost:18789/", (res) => {
          resolve(res.statusCode === 200 || res.statusCode === 401 || res.statusCode === 302);
        });
        req.on("error", () => resolve(false));
        req.setTimeout(2000, () => { req.destroy(); resolve(false); });
      });

      // Read config for model/channel info
      let config = null;
      try {
        if (fs.existsSync(CONFIG_PATH)) {
          config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        }
      } catch {}

      mainWindow.webContents.send("gateway:status-update", {
        running,
        port: 18789,
        channels: config?.channels ? Object.keys(config.channels) : [],
        model: config?.model || null,
        config,
      });
    } catch {
      // Poller error — ignore
    }
  }, 15_000);
}

// Start polling when the window is ready
app.whenReady().then(() => {
  // Small delay to let the renderer load
  setTimeout(startPoller, 3000);
});

app.on("window-all-closed", () => {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
  app.quit();
});

