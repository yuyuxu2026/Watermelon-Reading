import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import { LibraryStore } from '../../electron/library'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

describe('LibraryStore', () => {
  it('imports a private copy, saves position, and removes it cleanly', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'watermelon-reader-')); roots.push(root)
    const source = path.join(root, 'origin.txt')
    await writeFile(source, '第一段\n第二段\n第三段', 'utf8')
    const store = new LibraryStore(path.join(root, 'library'))
    const book = await store.importFile(source)
    await rm(source)
    const opened = await store.openBook(book.id)
    expect(opened.book.fileName).toBe('origin.txt')
    expect(opened.chapters).toEqual([])
    expect((await store.readBlocks(book.id, 0, 1))[0].text).toContain('第一段')
    const updated = await store.savePosition(book.id, { block: 0, fraction: .5 })
    expect(updated.progress).toBeGreaterThan(0)
    expect((await store.snapshot()).books[0].progress).toBe(updated.progress)
    await store.removeBook(book.id)
    expect((await store.snapshot()).books).toHaveLength(0)
    await expect(readFile(path.join(root, 'library', 'books', `${book.id}.json`))).rejects.toThrow()
  })

  it('persists settings and rejects unsupported files', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'watermelon-reader-')); roots.push(root)
    const store = new LibraryStore(path.join(root, 'library'))
    await expect(store.importFile(path.join(root, 'cover.epub'))).rejects.toThrow('仅支持')
    await expect(store.saveSettings({ fontSize: 40, theme: 'dark' })).rejects.toThrow('设置无效')
    await store.saveSettings({ fontSize: 22, theme: 'dark' })
    expect((await store.snapshot()).settings).toEqual({ fontSize: 22, theme: 'dark' })
  })

  it('exposes detected chapters when opening a book', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'watermelon-reader-')); roots.push(root)
    const source = path.join(root, 'novel.txt')
    await writeFile(source, ['楔子', '很久以前。', '第一章 相遇', '他们见面了。', '第二章 别离', '他们分开了。'].join('\n'), 'utf8')
    const store = new LibraryStore(path.join(root, 'library'))
    const book = await store.importFile(source)
    const opened = await store.openBook(book.id)
    expect(opened.chapters.map(chapter => chapter.title)).toEqual(['楔子', '第一章 相遇', '第二章 别离'])
    expect(opened.chapters.every(chapter => chapter.block >= 0)).toBe(true)
  })
})
