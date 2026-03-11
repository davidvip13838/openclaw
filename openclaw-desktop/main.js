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
  "nohup", "rm", "pgrep",
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

app.on("window-all-closed", () => {
  app.quit();
});

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
    const child = spawn("/bin/zsh", ["-c", "openclaw gateway install-daemon"], {
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
