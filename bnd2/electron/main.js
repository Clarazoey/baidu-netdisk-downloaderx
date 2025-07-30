const {app, BrowserWindow, Menu, session} = require('electron')
const {isDev, initIpcMain} = require('./src/utils')
const path = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

const createWindow = () => {
  // Create the browser window with optimized settings
  mainWindow = new BrowserWindow(
    {
      width: 1024,
      height: 768,
      resizable: false,
      maximizable: false,
      title: 'BND2',
      show: false, // Don't show until ready to prevent flash
      webPreferences: {
        nodeIntegration: false, // Disable for security
        contextIsolation: true, // Enable for security
        enableRemoteModule: false, // Disable for security and performance
        webSecurity: true,
        sandbox: false,
        webviewTag: true,
        backgroundThrottling: false, // Prevent throttling when hidden
        preload: path.join(__dirname, 'preload.js') // Use preload script
      },
    })

  // Optimize window loading
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // Focus window on show for better UX
    if (isDev()) {
      mainWindow.webContents.openDevTools()
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  // Optimize memory usage
  mainWindow.on('minimize', () => {
    // Optional: Reduce memory usage when minimized
    mainWindow.webContents.executeJavaScript('window.gc && window.gc()')
  })
}

const createMenu = () => {
  const template = [
    {
      label: '选项',
      submenu: [
        {
          label: 'BND2 项目主页',
          click () {
            require('electron').
              shell.
              openExternal('https://github.com/88250/baidu-netdisk-downloaderx')
          },
        },
        {type: 'separator'},
        {role: 'cut'},
        {role: 'copy'},
        {role: 'paste'},
        {type: 'separator'},
        {role: 'toggledevtools'},
        {role: 'togglefullscreen'},
        {type: 'separator'},
        {role: 'quit'},
      ],
    },
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Mobile Safari/537.36'
    callback({cancel: false, requestHeaders: details.requestHeaders})
  })

  initIpcMain()
  createWindow()
  createMenu()
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') {
  app.quit()
  // }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
    createMenu()
  }
})
