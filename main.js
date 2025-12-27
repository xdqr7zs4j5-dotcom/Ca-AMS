import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged   // đúng chuẩn: dev = true khi chạy vite

function createWindow () {
  const win = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173/')
    win.webContents.openDevTools()
  } else {
    // ⚠️ quan trọng: load file đã build, KHÔNG phải localhost
    win.loadFile(path.join(__dirname, 'index.html')) // hoặc path.join(__dirname, 'dist', 'index.html') tùy thư mục out
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit())
app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
