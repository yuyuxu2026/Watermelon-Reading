import { contextBridge, ipcRenderer } from 'electron'
import type { ReaderApi, Settings, Position } from './types'

const api: ReaderApi = {
  library: () => ipcRenderer.invoke('library'),
  importBook: () => ipcRenderer.invoke('import-book'),
  openBook: id => ipcRenderer.invoke('open-book', id),
  blocks: (id, start, count) => ipcRenderer.invoke('read-blocks', id, start, count),
  removeBook: id => ipcRenderer.invoke('remove-book', id),
  savePosition: (id, position: Position) => ipcRenderer.invoke('save-position', id, position),
  saveSettings: (settings: Settings) => ipcRenderer.invoke('save-settings', settings)
}
contextBridge.exposeInMainWorld('reader', api)
