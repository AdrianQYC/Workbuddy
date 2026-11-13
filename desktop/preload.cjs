const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("workbuddyDesktop", {
  getSettings: () => ipcRenderer.invoke("workbuddy:get-settings"),
  setSetting: (key, value) => ipcRenderer.invoke("workbuddy:set-setting", key, value),
  onOpenSettings: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("workbuddy:open-settings", listener);
    return () => ipcRenderer.removeListener("workbuddy:open-settings", listener);
  },
});
