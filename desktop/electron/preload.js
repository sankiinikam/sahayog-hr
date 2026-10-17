const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  platform: process.platform,
  version: "1.0.0",
});

