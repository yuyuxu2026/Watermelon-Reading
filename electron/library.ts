import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { chaptersFromBlocks } from './chapters'
import { blockInfo, decodeText, MAX_FILE_BYTES, splitText } from './text'
import type { Book, Library, Position, Settings, OpenBook, TextBlock } from './types'

const DEFAULT_SETTINGS: Settings = { fontSize: 20, theme: 'paper' }

export class LibraryStore {
  private state?: Library
  private active?: { id: string; blocks: string[] }
  private pending: Promise<unknown> = Promise.resolve()

  constructor(private readonly root: string) {}

  private bookPath(id: string) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('书籍标识无效。')
    return path.join(this.root, 'books', `${id}.json`)
  }

  private async load(): Promise<Library> {
    if (this.state) return this.state
    await fs.mkdir(path.join(this.root, 'books'), { recursive: true })
    try {
      const data = JSON.parse(await fs.readFile(path.join(this.root, 'library.json'), 'utf8')) as Library
      if (!Array.isArray(data.books) || !data.settings) throw new Error('invalid library')
      this.state = data
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('本地书架数据无法读取，请保留数据目录并重试。')
      this.state = { books: [], settings: { ...DEFAULT_SETTINGS } }
    }
    return this.state
  }

  private async atomicWrite(file: string, data: unknown) {
    const temp = `${file}.${randomUUID()}.tmp`
    try {
      await fs.writeFile(temp, JSON.stringify(data), 'utf8')
      await fs.rename(temp, file)
    } finally {
      await fs.rm(temp, { force: true }).catch(() => {})
    }
  }

  private async persist(next: Library) {
    await this.atomicWrite(path.join(this.root, 'library.json'), next)
    this.state = next
  }

  private queue<T>(action: () => Promise<T>): Promise<T> {
    const task = this.pending.then(action)
    this.pending = task.catch(() => {})
    return task
  }

  async snapshot(): Promise<Library> {
    await this.pending
    return structuredClone(await this.load())
  }

  importFile(file: string): Promise<Book> {
    return this.queue(async () => {
      const state = await this.load()
      if (path.extname(file).toLowerCase() !== '.txt') throw new Error('仅支持 .txt 文本文件。')
      let buffer: Buffer
      try {
        const stat = await fs.stat(file)
        if (!stat.isFile()) throw new Error('not a file')
        if (stat.size > MAX_FILE_BYTES) throw new Error('too large')
        buffer = await fs.readFile(file)
      } catch (error) {
        if ((error as Error).message === 'too large') throw new Error('文件过大，请导入小于 64 MB 的 TXT 文件。')
        throw new Error('无法读取文件，文件可能已移动、被删除或没有访问权限。')
      }
      const { text, encoding } = decodeText(buffer)
      const id = createHash('sha256').update(text).digest('hex')
      const existing = state.books.find(book => book.id === id)
      if (existing) return structuredClone(existing)
      const book: Book = {
        id, title: path.basename(file, path.extname(file)), fileName: path.basename(file),
        encoding, characters: text.length, importedAt: new Date().toISOString(),
        lastReadAt: null, progress: 0, position: { block: 0, fraction: 0 }
      }
      await this.atomicWrite(this.bookPath(id), splitText(text))
      try {
        await this.persist({ ...state, books: [book, ...state.books] })
      } catch (error) {
        await fs.rm(this.bookPath(id), { force: true })
        throw error
      }
      return structuredClone(book)
    })
  }

  private async getBlocks(id: string): Promise<string[]> {
    if (this.active?.id === id) return this.active.blocks
    try {
      const blocks = JSON.parse(await fs.readFile(this.bookPath(id), 'utf8')) as string[]
      if (!Array.isArray(blocks) || blocks.length === 0 || blocks.some(block => typeof block !== 'string')) throw new Error('invalid book')
      this.active = { id, blocks }
      return blocks
    } catch {
      throw new Error('本地书籍副本无法读取，请移除后重新导入原文件。')
    }
  }

  async openBook(id: string): Promise<OpenBook> {
    await this.pending
    const state = await this.load()
    const book = state.books.find(item => item.id === id)
    if (!book) throw new Error('书籍不存在，可能已从书架移除。')
    const blocks = await this.getBlocks(id)
    return {
      book: structuredClone(book),
      blocks: blockInfo(blocks),
      chapters: chaptersFromBlocks(blocks)
    }
  }

  async readBlocks(id: string, start: number, count: number): Promise<TextBlock[]> {
    await this.pending
    const state = await this.load()
    if (!state.books.some(book => book.id === id)) throw new Error('书籍不存在。')
    if (!Number.isInteger(start) || start < 0 || !Number.isInteger(count) || count < 1 || count > 100) throw new Error('无效的文本范围。')
    return (await this.getBlocks(id)).slice(start, start + count).map((text, index) => ({ index: start + index, text }))
  }

  savePosition(id: string, position: Position): Promise<Book> {
    return this.queue(async () => {
      const state = await this.load()
      const book = state.books.find(item => item.id === id)
      if (!book) throw new Error('书籍不存在。')
      const blocks = await this.getBlocks(id)
      if (!Number.isInteger(position.block) || position.block < 0 || position.block >= blocks.length || !Number.isFinite(position.fraction) || position.fraction < 0 || position.fraction > 1) throw new Error('阅读位置无效。')
      const info = blockInfo(blocks)[position.block]
      const progress = Math.min(1, (info.start + info.length * position.fraction) / book.characters)
      const updated = { ...book, position: { ...position }, progress, lastReadAt: new Date().toISOString() }
      await this.persist({ ...state, books: state.books.map(item => item.id === id ? updated : item) })
      return structuredClone(updated)
    })
  }

  saveSettings(settings: Settings): Promise<Settings> {
    return this.queue(async () => {
      const state = await this.load()
      if (!Number.isInteger(settings.fontSize) || settings.fontSize < 14 || settings.fontSize > 32 || !['paper', 'light', 'dark'].includes(settings.theme)) throw new Error('阅读设置无效。')
      const valid = { fontSize: settings.fontSize, theme: settings.theme }
      await this.persist({ ...state, settings: valid })
      return { ...valid }
    })
  }

  removeBook(id: string): Promise<null> {
    return this.queue(async () => {
      const state = await this.load()
      if (!state.books.some(book => book.id === id)) throw new Error('书籍不存在。')
      // Remove only the private copy; the original import path is never stored.
      const file = this.bookPath(id)
      const tombstone = `${file}.removed`
      let moved = false
      try { await fs.rename(file, tombstone); moved = true } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      try {
        await this.persist({ ...state, books: state.books.filter(book => book.id !== id) })
      } catch (error) {
        if (moved) await fs.rename(tombstone, file)
        throw error
      }
      if (this.active?.id === id) this.active = undefined
      if (moved) await fs.rm(tombstone, { force: true })
      return null
    })
  }
}
