const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // IPC communication
  send: (channel, data) => {
    // Whitelist channels for security
    const validChannels = ['app-ready', 'window-action', 'get-version']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel, func) => {
    const validChannels = ['app-data', 'update-available', 'download-progress']
    if (validChannels.includes(channel)) {
      // Remove the listener to avoid memory leaks
      ipcRenderer.removeAllListeners(channel)
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  },
  
  // Utility functions
  platform: process.platform,
  versions: process.versions,
  
  // Performance monitoring
  getMemoryUsage: () => process.memoryUsage(),
  getCPUUsage: () => process.cpuUsage()
})

// Performance optimization: Preload common libraries
window.addEventListener('DOMContentLoaded', () => {
  // Cache frequently used DOM queries
  const appRoot = document.getElementById('root')
  if (appRoot) {
    appRoot.classList.add('electron-app')
  }
})