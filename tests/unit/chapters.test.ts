import { describe, expect, it } from 'vitest'
import { chapterIndexForBlock, chaptersFromBlocks, detectChapterMarks, isChapterTitle } from '../../electron/chapters'
import { splitText } from '../../electron/text'

describe('chapter title detection', () => {
  it('recognizes common Chinese and English headings', () => {
    expect(isChapterTitle('第一章 离离原上草')).toBe(true)
    expect(isChapterTitle('  第十二回 大闹天宫  ')).toBe(true)
    expect(isChapterTitle('第3卷 远行')).toBe(true)
    expect(isChapterTitle('楔子')).toBe(true)
    expect(isChapterTitle('Chapter 12 The Road')).toBe(true)
    expect(isChapterTitle('这只是普通正文，虽然提到第一章也不算标题')).toBe(false)
    expect(isChapterTitle('今天天气不错')).toBe(false)
  })

  it('collects marks with stable character offsets', () => {
    const text = ['前言', '正文开头。', '第一章 出发', '他走了。', '第二章 归来', '又回来了。'].join('\n')
    const marks = detectChapterMarks(text)
    expect(marks.map(mark => mark.title)).toEqual(['前言', '第一章 出发', '第二章 归来'])
    expect(text.slice(marks[1].start, marks[1].start + marks[1].title.length)).toBe('第一章 出发')
  })

  it('maps chapters onto reader blocks and tracks the active chapter', () => {
    const source = `${'序章\n'}${'甲'.repeat(800)}\n第一章 起点\n${'乙'.repeat(800)}\n第二章 终点\n${'丙'.repeat(200)}`
    const blocks = splitText(source)
    const chapters = chaptersFromBlocks(blocks)
    expect(chapters.map(chapter => chapter.title)).toEqual(['序章', '第一章 起点', '第二章 终点'])
    expect(chapters[0].block).toBe(0)
    expect(chapters[1].block).toBeGreaterThan(chapters[0].block)
    expect(chapters[2].block).toBeGreaterThan(chapters[1].block)
    expect(chapterIndexForBlock(chapters, chapters[1].block)).toBe(1)
    expect(chapterIndexForBlock(chapters, chapters[2].block + 1)).toBe(2)
  })
})
