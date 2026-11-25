import { blockInfo } from './text'
import type { Chapter } from './types'

const MAX_TITLE_LENGTH = 60

/** Whole-line patterns common in Chinese web novels and translated books. */
const CHAPTER_LINE = /^[\s\u3000]*(?:第[零〇一二三四五六七八九十百千万两0-9]+[章节回卷部集].*|Chapter\s+\d+\b.*|(?:序章|楔子|引子|前言|绪论|引言|后记|尾声|番外|终章|跋)(?:[\s\u3000:：].*)?)\s*$/i

export function isChapterTitle(line: string): boolean {
  const title = line.trim()
  if (!title || title.length > MAX_TITLE_LENGTH) return false
  return CHAPTER_LINE.test(title)
}

/** Scan normalized text and collect chapter titles with character offsets. */
export function detectChapterMarks(text: string): { title: string; start: number }[] {
  const marks: { title: string; start: number }[] = []
  let offset = 0
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isChapterTitle(line)) {
      const title = line.trim()
      marks.push({ title, start: offset + line.indexOf(title) })
    }
    offset += line.length + (i < lines.length - 1 ? 1 : 0)
  }
  return marks
}

function blockIndexForOffset(info: { start: number; length: number }[], offset: number): number {
  if (info.length === 0) return 0
  let low = 0
  let high = info.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    const item = info[mid]
    if (offset < item.start) high = mid - 1
    else if (offset >= item.start + item.length) low = mid + 1
    else return mid
  }
  return Math.max(0, Math.min(info.length - 1, low))
}

/** Map chapter character offsets onto block indices used by the reader. */
export function chaptersFromBlocks(blocks: string[]): Chapter[] {
  const text = blocks.join('')
  const info = blockInfo(blocks)
  return detectChapterMarks(text).map((mark, index) => ({
    index,
    title: mark.title,
    start: mark.start,
    block: blockIndexForOffset(info, mark.start)
  }))
}

/** Active chapter for a reading block (last chapter whose block <= current). */
export function chapterIndexForBlock(chapters: Chapter[], block: number): number {
  let current = -1
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].block <= block) current = i
    else break
  }
  return current
}
