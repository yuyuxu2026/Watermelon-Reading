import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, FilePlus2, LibraryBig, Moon, Sun, Trash2, X } from 'lucide-react'
import type { Book, Chapter, Library, OpenBook, Position, Settings, TextBlock, Theme } from '../electron/types'
import { chapterIndexForBlock } from './chapter-nav'
import { ReaderView, type ReaderController } from './ReaderView'

const formatProgress = (progress: number) => progress === 0 ? '未开始' : progress >= 0.995 ? '已读完' : `${Math.max(1, Math.round(progress * 100))}%`
const dateLabel = (date: string | null) => date ? new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(date)) : '尚未阅读'

function App() {
  const [library, setLibrary] = useState<Library | null>(null)
  const [active, setActive] = useState<OpenBook | null>(null)
  const [blocks, setBlocks] = useState<TextBlock[]>([])
  const [loaded, setLoaded] = useState(0)
  const [view, setView] = useState<'shelf' | 'reader'>('shelf')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [restoreToken, setRestoreToken] = useState(0)
  const readerApi = useRef<ReaderController>(null)
  const saveTimer = useRef<number | undefined>(undefined)
  const pendingRestore = useRef<Position | null>(null)
  const loadedRef = useRef(0)
  const loadingMore = useRef(false)

  const showError = useCallback((error: string) => { setMessage(error); window.setTimeout(() => setMessage(''), 4500) }, [])
  const refresh = useCallback(async () => {
    setLoading(true)
    if (!window.reader) {
      showError('应用桥接未加载，请重启西瓜阅读。')
      setLoading(false)
      return
    }
    const response = await window.reader.library()
    if (response.ok) setLibrary(response.data); else showError(response.error)
    setLoading(false)
  }, [showError])
  useEffect(() => { void refresh() }, [refresh])

  const scheduleRestore = (position: Position) => {
    pendingRestore.current = position
    setRestoreToken(token => token + 1)
  }

  const openBook = async (id: string) => {
    const response = await window.reader.openBook(id)
    if (!response.ok) return showError(response.error)
    setActive(response.data); setBlocks([]); setLoaded(0); loadedRef.current = 0; setView('reader'); setTocOpen(false)
    scheduleRestore(response.data.book.position)
    const count = Math.max(14, response.data.book.position.block + 15)
    const first = await window.reader.blocks(id, 0, Math.min(count, response.data.blocks.length))
    if (!first.ok) {
      setView('shelf')
      pendingRestore.current = null
      return showError(first.error)
    }
    loadedRef.current = first.data.length
    setBlocks(first.data); setLoaded(first.data.length)
  }

  const importBook = async () => {
    const response = await window.reader.importBook()
    if (!response.ok) return showError(response.error)
    if (!response.data) return
    await refresh(); await openBook(response.data.id)
  }

  useEffect(() => {
    if (!pendingRestore.current || view !== 'reader' || blocks.length === 0) return
    const position = pendingRestore.current
    if (!blocks.some(block => block.index === position.block)) return
    const timer = window.setTimeout(() => {
      if (!pendingRestore.current) return
      readerApi.current?.scrollTo(position)
      pendingRestore.current = null
    }, 50)
    return () => window.clearTimeout(timer)
  }, [blocks, view, restoreToken])

  const appendBlocks = async (start: number, count: number) => {
    if (!active) return false
    const response = await window.reader.blocks(active.book.id, start, count)
    if (!response.ok) {
      showError(response.error)
      return false
    }
    setBlocks(current => [...current, ...response.data])
    loadedRef.current = start + response.data.length
    setLoaded(loadedRef.current)
    return true
  }

  const ensureBlocksThrough = async (through: number) => {
    if (!active) return false
    while (loadedRef.current <= through) {
      const start = loadedRef.current
      const remaining = through - start + 12
      const count = Math.min(100, Math.max(1, remaining), active.blocks.length - start)
      if (count < 1) break
      loadingMore.current = true
      try {
        const ok = await appendBlocks(start, count)
        if (!ok) return false
      } finally {
        loadingMore.current = false
      }
    }
    return true
  }

  const loadMore = async () => {
    if (!active || loadingMore.current) return
    const start = loadedRef.current
    if (start >= active.blocks.length) return
    loadingMore.current = true
    try {
      await appendBlocks(start, Math.min(48, active.blocks.length - start))
    } finally {
      loadingMore.current = false
    }
  }

  const readPosition = (): Position | null => readerApi.current?.readPosition() ?? null

  const savePosition = () => {
    if (!active) return
    const position = readPosition()
    if (!position) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      const response = await window.reader.savePosition(active.book.id, position)
      if (response.ok) {
        setActive(currentActive => currentActive ? { ...currentActive, book: response.data } : currentActive)
        setLibrary(currentLibrary => currentLibrary
          ? { ...currentLibrary, books: currentLibrary.books.map(book => book.id === response.data.id ? response.data : book) }
          : currentLibrary)
      }
    }, 350)
  }

  const jumpToChapter = async (chapter: Chapter) => {
    if (!active) return
    const ready = await ensureBlocksThrough(chapter.block)
    if (!ready) return
    scheduleRestore({ block: chapter.block, fraction: 0 })
    setTocOpen(false)
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      const response = await window.reader.savePosition(active.book.id, { block: chapter.block, fraction: 0 })
      if (response.ok) {
        setActive(currentActive => currentActive ? { ...currentActive, book: response.data } : currentActive)
        setLibrary(currentLibrary => currentLibrary
          ? { ...currentLibrary, books: currentLibrary.books.map(book => book.id === response.data.id ? response.data : book) }
          : currentLibrary)
      }
    }, 200)
  }

  const onScroll = () => { savePosition() }

  const remove = async (book: Book) => {
    if (!window.confirm(`从书架移除“${book.title}”？`)) return
    const response = await window.reader.removeBook(book.id)
    if (!response.ok) return showError(response.error)
    await refresh()
  }

  const updateSettings = async (next: Settings) => {
    if (active && view === 'reader') {
      const position = readPosition()
      if (position) scheduleRestore(position)
    }
    const response = await window.reader.saveSettings(next)
    if (!response.ok) return showError(response.error)
    setLibrary(current => current ? { ...current, settings: response.data } : current)
  }

  if (loading || !library) {
    return <div className="loading-screen">
      <div className="brand-mark">西</div>
      <p>{message || '正在准备你的书架…'}</p>
      {message && <button className="primary-btn" onClick={() => void refresh()}>重试</button>}
    </div>
  }
  return <div className={`app theme-${library.settings.theme}`}>
    {view === 'shelf'
      ? <Shelf books={library.books} onImport={importBook} onOpen={openBook} onRemove={remove} />
      : <ReaderView
          ref={readerApi}
          active={active!}
          blocks={blocks}
          loaded={loaded}
          total={active!.blocks.length}
          settings={library.settings}
          onScroll={onScroll}
          onNeedMore={() => { void loadMore() }}
          onBack={() => { savePosition(); setTocOpen(false); setView('shelf'); void refresh() }}
          onSettings={() => { setTocOpen(false); setSettingsOpen(true) }}
          onToc={() => { setSettingsOpen(false); setTocOpen(true) }}
        />}
    {settingsOpen && <SettingsPanel settings={library.settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />}
    {tocOpen && active && <TocPanel
      chapters={active.chapters}
      currentBlock={readPosition()?.block ?? active.book.position.block}
      onSelect={chapter => void jumpToChapter(chapter)}
      onClose={() => setTocOpen(false)}
    />}
    {message && <div className="toast" role="alert">{message}<button onClick={() => setMessage('')}><X size={16} /></button></div>}
  </div>
}

function Shelf({ books, onImport, onOpen, onRemove }: { books: Book[]; onImport: () => void; onOpen: (id: string) => void; onRemove: (book: Book) => void }) {
  return <main className="shelf-shell"><header className="topbar"><div className="brand"><span className="brand-mark small">西</span><div><strong>西瓜阅读</strong><small>你的安静阅读空间</small></div></div><button className="primary-btn" onClick={onImport}><FilePlus2 size={18} />导入 TXT</button></header><section className="shelf-content"><div className="eyebrow"><LibraryBig size={16} />我的书架</div><div className="shelf-heading"><div><h1>继续阅读</h1><p>{books.length ? `书架上有 ${books.length} 本书` : '从一本书开始你的阅读旅程'}</p></div></div>{books.length ? <div className="book-grid">{books.map(book => <article className="book-card" key={book.id} onClick={() => onOpen(book.id)}><div className="book-cover"><span>西瓜<br />阅读</span><i>TXT</i></div><div className="book-meta"><div className="book-title" title={book.title}>{book.title}</div><div className="book-file">{book.fileName}</div><div className="progress-line"><span style={{ width: `${Math.max(0, Math.min(100, book.progress * 100))}%` }} /></div><div className="book-bottom"><span>{formatProgress(book.progress)}</span><span>{dateLabel(book.lastReadAt)}</span><button className="icon-btn" aria-label={`移除 ${book.title}`} onClick={event => { event.stopPropagation(); void onRemove(book) }}><Trash2 size={15} /></button></div></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><BookOpen size={28} /></div><h2>书架还是空的</h2><p>导入一本 TXT 文件，开始你的第一段阅读。</p><button className="primary-btn" onClick={onImport}><FilePlus2 size={18} />选择 TXT 文件</button></div>}</section><footer className="shelf-footer"><span>本地阅读 · 无需登录</span><span>支持 UTF-8 / GBK / UTF-16</span></footer></main>
}

function TocPanel({ chapters, currentBlock, onSelect, onClose }: { chapters: Chapter[]; currentBlock: number; onSelect: (chapter: Chapter) => void; onClose: () => void }) {
  const activeIndex = chapterIndexForBlock(chapters, currentBlock)
  return <div className="panel-backdrop" onClick={onClose}><aside className="toc-panel" onClick={event => event.stopPropagation()}><div className="panel-header"><div><div className="eyebrow">目录</div><h2>章节</h2></div><button className="icon-btn" onClick={onClose} aria-label="关闭目录"><X size={19} /></button></div>{chapters.length ? <div className="toc-list" role="list">{chapters.map(chapter => <button key={chapter.index} role="listitem" className={chapter.index === activeIndex ? 'toc-item active' : 'toc-item'} onClick={() => onSelect(chapter)}><span className="toc-index">{chapter.index + 1}</span><span className="toc-title" title={chapter.title}>{chapter.title}</span></button>)}</div> : <div className="toc-empty"><p>未识别到章节标题。</p><p>支持「第X章 / 回 / 节」以及序章、楔子、Chapter N 等常见格式。</p></div>}<div className="panel-note">点击章节可跳转；当前阅读位置会自动保存。</div></aside></div>
}

function SettingsPanel({ settings, onChange, onClose }: { settings: Settings; onChange: (settings: Settings) => void; onClose: () => void }) {
  const themes: { key: Theme; label: string; icon: typeof Sun }[] = [{ key: 'paper', label: '纸张', icon: Sun }, { key: 'light', label: '明亮', icon: Sun }, { key: 'dark', label: '夜间', icon: Moon }]
  return <div className="panel-backdrop" onClick={onClose}><aside className="settings-panel" onClick={event => event.stopPropagation()}><div className="panel-header"><div><div className="eyebrow">阅读体验</div><h2>阅读设置</h2></div><button className="icon-btn" onClick={onClose}><X size={19} /></button></div><div className="setting-section"><label>字体大小 <strong>{settings.fontSize}px</strong></label><input type="range" min="14" max="32" step="1" value={settings.fontSize} onChange={event => void onChange({ ...settings, fontSize: Number(event.target.value) })} /><div className="range-labels"><span>小</span><span>大</span></div></div><div className="setting-section"><label>阅读主题</label><div className="theme-options">{themes.map(({ key, label, icon: Icon }) => <button key={key} className={settings.theme === key ? 'selected' : ''} onClick={() => void onChange({ ...settings, theme: key })}><Icon size={17} />{label}</button>)}</div></div><div className="settings-preview" style={{ fontSize: settings.fontSize }}>书山有路勤为径，学海无涯苦作舟。</div><div className="panel-note">设置会自动保存到本地，并应用到后续阅读。</div></aside></div>
}

export default App
