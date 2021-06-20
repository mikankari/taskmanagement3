
{ contextBridge, clipboard, ipcRenderer } = require "electron"

contextBridge.exposeInMainWorld "clipboard", clipboard
contextBridge.exposeInMainWorld "ipcRenderer", ipcRenderer
