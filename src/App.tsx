import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronLeft, FilePlus2, LibraryBig, Moon, MoreHorizontal, Sun, Trash2, Type, X } from 'lucide-react'
import type { Book, Library, OpenBook, Position, Settings, TextBlock, Theme } from '../electron/types'

const formatProgress = (progress: number) => progress === 0 ? '未开始' : progress >= 0.995 ? '已读完' : `${Math.max(1, Math.round(progress * 100))}%`
const dateLabel = (date: string | null) => date ? new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(date)) : '尚未阅读'

function App() {
  const [library, setLibrary] = useState<Library | null>(null)
  const [active, setActive] = useState<OpenBook | null>(null)
  const [blocks, setBlocks] = useState<TextBlock[]>([])
  const [loaded, setLoaded] = useState(0)
  const [view, setView] = useState<'shelf' | 'reader'>('shelf')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const readerRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<number | undefined>(undefined)

  const showError = useCallback((error: string) => { setMessage(error); window.setTimeout(() => setMessage(''), 4500) }, [])
  const refresh = useCallback(async () => {
    setLoading(true)
    const response = await window.reader.library()
    if (response.ok) setLibrary(response.data); else showError(response.error)
    setLoading(false)
  }, [showError])
  useEffect(() => { void refresh() }, [refresh])

  const openBook = async (id: string) => {
    const response = await window.reader.openBook(id)
    if (!response.ok) return showError(response.error)
    setActive(response.data); setBlocks([]); setLoaded(0); setView('reader')
    const count = Math.max(14, response.data.book.position.block + 15)
    const first = await window.reader.blocks(id, 0, Math.min(count, response.data.blocks.length))
    if (!first.ok) return showError(first.error)
    setBlocks(first.data); setLoaded(first.data.length)
  }

  const importBook = async () => {
    const response = await window.reader.importBook()
    if (!response.ok) return showError(response.error)
    if (!response.data) return
    await refresh(); await openBook(response.data.id)
  }

  useEffect(() => {
    if (!active || view !== 'reader' || !readerRef.current) return
    const timer = window.setTimeout(() => { if (readerRef.current) readerRef.current.scrollTop = Math.max(0, active.book.position.block * 180 + active.book.position.fraction * 180) }, 80)
    return () => window.clearTimeout(timer)
  }, [active, view, blocks.length])

  const loadMore = async () => {
    if (!active || loaded >= active.blocks.length) return
    const response = await window.reader.blocks(active.book.id, loaded, 12)
    if (!response.ok) return showError(response.error)
    setBlocks(current => [...current, ...response.data]); setLoaded(loaded + response.data.length)
  }

  const savePosition = () => {
    if (!active || !readerRef.current) return
    const element = readerRef.current
    const current = blocks.find(block => {
      const node = document.querySelector(`[data-block="${block.index}"]`) as HTMLElement | null
      return node && node.offsetTop + node.offsetHeight > element.scrollTop + 20
    }) ?? blocks.at(-1)
    if (!current) return
    const node = document.querySelector(`[data-block="${current.index}"]`) as HTMLElement | null
    const fraction = node ? Math.max(0, Math.min(1, (element.scrollTop - node.offsetTop) / Math.max(1, node.offsetHeight))) : 0
    const position: Position = { block: current.index, fraction }
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      const response = await window.reader.savePosition(active.book.id, position)
      if (response.ok) { setActive(currentActive => currentActive ? { ...currentActive, book: response.data } : currentActive); setLibrary(currentLibrary => currentLibrary ? { ...currentLibrary, books: currentLibrary.books.map(book => book.id === response.data.id ? response.data : book) } : currentLibrary) }
    }, 350)
  }

  const onScroll = () => { if (!readerRef.current) return; if (readerRef.current.scrollTop + readerRef.current.clientHeight > readerRef.current.scrollHeight - 900) void loadMore(); savePosition() }
  const remove = async (book: Book) => { if (!window.confirm(`从书架移除“${book.title}”？`)) return; const response = await window.reader.removeBook(book.id); if (!response.ok) return showError(response.error); await refresh() }
  const updateSettings = async (next: Settings) => { const response = await window.reader.saveSettings(next); if (!response.ok) return showError(response.error); setLibrary(current => current ? { ...current, settings: response.data } : current) }

  if (loading || !library) return <div className="loading-screen"><div className="brand-mark">西</div><p>正在准备你的书架…</p></div>
  return <div className={`app theme-${library.settings.theme}`}>
    {view === 'shelf' ? <Shelf books={library.books} onImport={importBook} onOpen={openBook} onRemove={remove} /> : <Reader active={active!} blocks={blocks} loaded={loaded} total={active!.blocks.length} settings={library.settings} readerRef={readerRef} onScroll={onScroll} onBack={() => { savePosition(); setView('shelf'); void refresh() }} onSettings={() => setSettingsOpen(true)} />}
    {settingsOpen && <SettingsPanel settings={library.settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />}
    {message && <div className="toast" role="alert">{message}<button onClick={() => setMessage('')}><X size={16} /></button></div>}
  </div>
}

function Shelf({ books, onImport, onOpen, onRemove }: { books: Book[]; onImport: () => void; onOpen: (id: string) => void; onRemove: (book: Book) => void }) {
  return <main className="shelf-shell"><header className="topbar"><div className="brand"><span className="brand-mark small">西</span><div><strong>西瓜阅读</strong><small>你的安静阅读空间</small></div></div><button className="primary-btn" onClick={onImport}><FilePlus2 size={18} />导入 TXT</button></header><section className="shelf-content"><div className="eyebrow"><LibraryBig size={16} />我的书架</div><div className="shelf-heading"><div><h1>继续阅读</h1><p>{books.length ? `书架上有 ${books.length} 本书` : '从一本书开始你的阅读旅程'}</p></div></div>{books.length ? <div className="book-grid">{books.map(book => <article className="book-card" key={book.id} onClick={() => onOpen(book.id)}><div className="book-cover"><span>西瓜<br />阅读</span><i>TXT</i></div><div className="book-meta"><div className="book-title" title={book.title}>{book.title}</div><div className="book-file">{book.fileName}</div><div className="progress-line"><span style={{ width: `${Math.max(0, Math.min(100, book.progress * 100))}%` }} /></div><div className="book-bottom"><span>{formatProgress(book.progress)}</span><span>{dateLabel(book.lastReadAt)}</span><button className="icon-btn" aria-label={`移除 ${book.title}`} onClick={event => { event.stopPropagation(); void onRemove(book) }}><Trash2 size={15} /></button></div></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><BookOpen size={28} /></div><h2>书架还是空的</h2><p>导入一本 TXT 文件，开始你的第一段阅读。</p><button className="primary-btn" onClick={onImport}><FilePlus2 size={18} />选择 TXT 文件</button></div>}</section><footer className="shelf-footer"><span>本地阅读 · 无需登录</span><span>支持 UTF-8 / GBK / UTF-16</span></footer></main>
}

function Reader({ active, blocks, loaded, total, settings, readerRef, onScroll, onBack, onSettings }: { active: OpenBook; blocks: TextBlock[]; loaded: number; total: number; settings: Settings; readerRef: React.RefObject<HTMLDivElement | null>; onScroll: () => void; onBack: () => void; onSettings: () => void }) {
  return <main className="reader-shell"><header className="reader-bar"><button className="back-btn" onClick={onBack}><ChevronLeft size={20} />书架</button><div className="reader-title"><strong>{active.book.title}</strong><span>{active.book.encoding} · {formatProgress(active.book.progress)}</span></div><div className="reader-actions"><span className="saved-label">自动保存</span><button className="icon-btn large" aria-label="阅读设置" onClick={onSettings}><Type size={19} /></button><button className="icon-btn large" aria-label="更多"><MoreHorizontal size={20} /></button></div></header><div className="reader-progress"><span style={{ width: `${Math.max(0, Math.min(100, active.book.progress * 100))}%` }} /></div><div className="reading-viewport" ref={readerRef} onScroll={onScroll}><article className="reading-paper" style={{ '--reading-font-size': `${settings.fontSize}px` } as React.CSSProperties}>{blocks.map(block => <p key={block.index} data-block={block.index}>{block.text}</p>)}{loaded < total && <div className="load-hint">正在加载更多内容…</div>}{loaded >= total && <div className="end-hint">— 全文完 —</div>}</article></div></main>
}

function SettingsPanel({ settings, onChange, onClose }: { settings: Settings; onChange: (settings: Settings) => void; onClose: () => void }) {
  const themes: { key: Theme; label: string; icon: typeof Sun }[] = [{ key: 'paper', label: '纸张', icon: Sun }, { key: 'light', label: '明亮', icon: Sun }, { key: 'dark', label: '夜间', icon: Moon }]
  return <div className="panel-backdrop" onClick={onClose}><aside className="settings-panel" onClick={event => event.stopPropagation()}><div className="panel-header"><div><div className="eyebrow">阅读体验</div><h2>阅读设置</h2></div><button className="icon-btn" onClick={onClose}><X size={19} /></button></div><div className="setting-section"><label>字体大小 <strong>{settings.fontSize}px</strong></label><input type="range" min="14" max="32" step="1" value={settings.fontSize} onChange={event => void onChange({ ...settings, fontSize: Number(event.target.value) })} /><div className="range-labels"><span>小</span><span>大</span></div></div><div className="setting-section"><label>阅读主题</label><div className="theme-options">{themes.map(({ key, label, icon: Icon }) => <button key={key} className={settings.theme === key ? 'selected' : ''} onClick={() => void onChange({ ...settings, theme: key })}><Icon size={17} />{label}</button>)}</div></div><div className="settings-preview" style={{ fontSize: settings.fontSize }}>书山有路勤为径，学海无涯苦作舟。</div><div className="panel-note">设置会自动保存到本地，并应用到后续阅读。</div></aside></div>
}

export default App
