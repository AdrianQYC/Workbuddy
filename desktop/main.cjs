const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { app, BrowserWindow, dialog, ipcMain, Menu, shell, Tray } = require("electron");

const APP_HOST = "127.0.0.1";
const APP_PORT = 5173;
const APP_URL = `http://localhost:${APP_PORT}/index.html`;
const SETTINGS_FILE = "workbuddy-desktop-settings.json";
const SETTINGS_DEFAULTS = { minimizeToTray: false, openAtLogin: false };
const ASSETS = new Set([
  "app.js",
  "english-wordbanks.js",
  "icon-192.png",
  "icon-512.png",
  "icon.svg",
  "index.html",
  "manifest.webmanifest",
  "styles.css",
  "sw.js",
]);
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

app.setName("Workbuddy");
app.setAppUserModelId("com.workbuddy.desktop");

const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();

let mainWindow = null;
let tray = null;
let localServer = null;
let isQuitting = false;
let pendingSettingsOpen = false;
let settings = { ...SETTINGS_DEFAULTS };
const launchHidden = process.argv.includes("--hidden");

if (hasInstanceLock) {
  app.on("second-instance", () => showMainWindow());

  app.whenReady().then(async () => {
    try {
      settings = loadSettings();
      registerIpcHandlers();
      createTray();
      await startLocalServer();
      createMainWindow();
    } catch (error) {
      dialog.showErrorBox(
        "Workbuddy 启动失败",
        error.code === "EADDRINUSE"
          ? "本地端口 5173 正被占用。请先关闭旧版 Workbuddy 的黑色终端窗口，再重新打开桌面版。"
          : `Workbuddy 没能启动本地页面。\n\n${error.message}`,
      );
      app.quit();
    }
  });

  app.on("before-quit", () => {
    isQuitting = true;
    if (localServer?.listening) localServer.close();
  });

  app.on("will-quit", () => {
    tray?.destroy();
    tray = null;
  });

  app.on("window-all-closed", () => {});
}

function appRoot() {
  return app.getAppPath();
}

function iconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "Workbuddy.ico")
    : path.join(appRoot(), "Workbuddy.ico");
}

function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), SETTINGS_FILE), "utf8"));
    return {
      minimizeToTray: saved.minimizeToTray === true,
      openAtLogin: app.isPackaged && app.getLoginItemSettings({ args: ["--hidden"] }).openAtLogin,
    };
  } catch {
    return { ...SETTINGS_DEFAULTS, openAtLogin: false };
  }
}

function persistSettings(nextSettings) {
  const settingsPath = path.join(app.getPath("userData"), SETTINGS_FILE);
  const temporaryPath = `${settingsPath}.tmp`;
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(temporaryPath, `${JSON.stringify(nextSettings, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, settingsPath);
}

function getSettings() {
  return {
    ...settings,
    openAtLogin: app.isPackaged && app.getLoginItemSettings({ args: ["--hidden"] }).openAtLogin,
    canSetOpenAtLogin: app.isPackaged && process.platform === "win32",
  };
}

function registerIpcHandlers() {
  ipcMain.handle("workbuddy:get-settings", (event) => {
    assertTrustedSender(event);
    return getSettings();
  });
  ipcMain.handle("workbuddy:set-setting", (event, key, value) => {
    assertTrustedSender(event);
    if (key === "minimizeToTray" && typeof value === "boolean") {
      settings = { ...settings, minimizeToTray: value };
      persistSettings(settings);
      return getSettings();
    }
    if (key === "openAtLogin" && typeof value === "boolean") {
      if (!app.isPackaged || process.platform !== "win32") {
        throw new Error("请安装 Workbuddy 桌面版后再设置开机自启动。");
      }
      app.setLoginItemSettings({ openAtLogin: value, args: ["--hidden"] });
      settings = { ...settings, openAtLogin: value };
      persistSettings(settings);
      return getSettings();
    }
    throw new Error("不支持的设置项。");
  });
}

function assertTrustedSender(event) {
  const senderUrl = event.senderFrame?.url;
  if (!senderUrl || new URL(senderUrl).origin !== `http://localhost:${APP_PORT}`) {
    throw new Error("拒绝来自非 Workbuddy 页面设置请求。");
  }
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    localServer = http.createServer(serveLocalAsset);
    localServer.once("error", reject);
    localServer.listen(APP_PORT, APP_HOST, () => {
      localServer.removeListener("error", reject);
      resolve();
    });
  });
}

function serveLocalAsset(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, APP_URL).pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (pathname === "/") pathname = "/index.html";
  const relativePath = pathname.replace(/^\/+/, "");
  if (!ASSETS.has(relativePath)) {
    response.writeHead(404, { "Cache-Control": "no-store" }).end("Not found");
    return;
  }

  const filePath = path.join(appRoot(), relativePath);
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(404, { "Cache-Control": "no-store" }).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "no-store, max-age=0",
      "Content-Length": contents.length,
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") response.end();
    else response.end(contents);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    show: !launchHidden,
    title: "Workbuddy",
    icon: process.platform === "win32" ? iconPath() : undefined,
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(appRoot(), "desktop", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on("ready-to-show", () => {
    if (!launchHidden) mainWindow.show();
    if (pendingSettingsOpen) sendOpenSettings();
  });
  mainWindow.on("close", (event) => {
    if (isQuitting || !settings.minimizeToTray) return;
    event.preventDefault();
    mainWindow.hide();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    if (!isQuitting && !settings.minimizeToTray) app.quit();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    let isLocalApp = false;
    try {
      isLocalApp = new URL(url).origin === `http://localhost:${APP_PORT}`;
    } catch {
      isLocalApp = false;
    }
    if (!isLocalApp) {
      event.preventDefault();
      openExternalUrl(url);
    }
  });
  mainWindow.webContents.on("did-finish-load", () => {
    if (pendingSettingsOpen) sendOpenSettings();
  });
  mainWindow.loadURL(APP_URL);
}

function openExternalUrl(value) {
  try {
    const url = new URL(value);
    if (url.origin === `http://localhost:${APP_PORT}`) return;
    if (["https:", "http:", "mailto:"].includes(url.protocol)) shell.openExternal(url.href);
  } catch {
    // Ignore malformed or unsupported external URLs.
  }
}

function createTray() {
  tray = new Tray(iconPath());
  tray.setToolTip("Workbuddy");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "打开 Workbuddy", click: () => showMainWindow() },
    { label: "设置", click: () => openSettings() },
    { type: "separator" },
    { label: "退出 Workbuddy", click: () => app.quit() },
  ]));
  tray.on("click", () => showMainWindow());
  tray.on("double-click", () => showMainWindow());
}

function showMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function openSettings() {
  if (!mainWindow) return;
  pendingSettingsOpen = true;
  showMainWindow();
  if (mainWindow.webContents.isLoading()) return;
  sendOpenSettings();
}

function sendOpenSettings() {
  if (!mainWindow || mainWindow.webContents.isLoading()) return;
  pendingSettingsOpen = false;
  mainWindow.webContents.send("workbuddy:open-settings");
}
