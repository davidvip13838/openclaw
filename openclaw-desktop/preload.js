const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openclaw", {
  // ── Layer 1: Raw shell commands (wizard) ──────────────────

  // Run a shell command, returns { stdout, stderr, exitCode }
  runCommand: (command) => ipcRenderer.invoke("run-command", command),

  // Run a command with streaming output (listen via onCommandOutput)
  runCommandStream: (command) => ipcRenderer.invoke("run-command-stream", command),

  // Listen for streaming command output
  onCommandOutput: (callback) => {
    ipcRenderer.on("command-output", (_event, data) => callback(data));
  },

  // ── Shared handlers (used by both wizard and dashboard) ────

  // Check Node.js, npm, openclaw versions
  checkPrerequisites: () => ipcRenderer.invoke("check-prerequisites"),

  // Read ~/.openclaw/openclaw.json
  readConfig: () => ipcRenderer.invoke("read-config"),

  // Write to ~/.openclaw/openclaw.json
  writeConfig: (config) => ipcRenderer.invoke("write-config", config),

  // Write an auth profile (API key) for a provider
  writeAuthProfile: ({ provider, apiKey }) =>
    ipcRenderer.invoke("write-auth-profile", { provider, apiKey }),

  // Install the system daemon
  installDaemon: () => ipcRenderer.invoke("install-daemon"),

  // Open URL in default browser
  openExternal: (url) => ipcRenderer.invoke("open-external", url),

  // Check if setup is complete
  checkSetup: () => ipcRenderer.invoke("check-setup"),

  // ── Layer 2: Typed IPC (dashboard) ────────────────────────

  gateway: {
    status: () => ipcRenderer.invoke("gateway:status"),
    start: () => ipcRenderer.invoke("gateway:start"),
    restart: () => ipcRenderer.invoke("gateway:restart"),
  },

  sessions: {
    clear: () => ipcRenderer.invoke("sessions:clear"),
  },

  uninstall: {
    reset: () => ipcRenderer.invoke("uninstall:reset"),
  },

  skills: {
    list: () => ipcRenderer.invoke("skills:list"),
  },

  // Listen for background poller status updates
  onGatewayStatus: (callback) => {
    ipcRenderer.on("gateway:status-update", (_event, status) => callback(status));
  },
});
