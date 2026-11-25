import { app, BrowserWindow, dialog, ipcMain, session } from 'electron'
import path from 'node:path'
import { LibraryStore } from './library'
import type { ReaderApi, Result, Settings, Position } from './types'

let store: LibraryStore
const isDev = process.argv.includes('--dev')

function result<T>(action: () => Promise<T>): Promise<Result<T>> {
  return action().then(data => ({ ok: true, data } as const)).catch(error => ({ ok: false, error: error instanceof Error ? error.message : '操作失败，请重试。' } as const))
}

function registerIpc() {
  ipcMain.handle('library', () => result(() => store.snapshot()))
  ipcMain.handle('import-book', async () => {
    const picked = await dialog.showOpenDialog({
      title: '导入 TXT 文件', properties: ['openFile'], filters: [{ name: 'TXT 文本', extensions: ['txt'] }]
    })
    if (picked.canceled || picked.filePaths.length === 0) return { ok: true, data: null }
    return result(() => store.importFile(picked.filePaths[0]))
  })
  ipcMain.handle('open-book', (_event, id: string) => result(() => store.openBook(id)))
  ipcMain.handle('read-blocks', (_event, id: string, start: number, count: number) => result(() => store.readBlocks(id, start, count)))
  ipcMain.handle('remove-book', (_event, id: string) => result(() => store.removeBook(id)))
  ipcMain.handle('save-position', (_event, id: string, position: Position) => result(() => store.savePosition(id, position)))
  ipcMain.handle('save-settings', (_event, settings: Settings) => result(() => store.saveSettings(settings)))
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1240, height: 820, minWidth: 900, minHeight: 640,
    backgroundColor: '#f4f1ea',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  if (isDev) window.loadURL('http://127.0.0.1:5173')
  else window.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': ["default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'"] } })
  })
  store = new LibraryStore(path.join(app.getPath('userData'), 'library'))
  registerIpc()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
