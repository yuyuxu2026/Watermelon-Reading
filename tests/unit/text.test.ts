import iconv from 'iconv-lite'
import { describe, expect, it } from 'vitest'
import { decodeText, splitText } from '../../electron/text'

describe('TXT decoding', () => {
  it('reads UTF-8 and normalizes line endings', () => {
    expect(decodeText(Buffer.from('\ufeff第一行\r\n第二行', 'utf8'))).toEqual({ text: '第一行\n第二行', encoding: 'UTF-8' })
  })

  it('falls back to GBK for Chinese files', () => {
    expect(decodeText(iconv.encode('中文小说内容', 'gb18030')).text).toBe('中文小说内容')
    expect(decodeText(iconv.encode('中文小说内容', 'gb18030')).encoding).toBe('GBK / GB18030')
  })

  it('rejects empty and non-text content', () => {
    expect(() => decodeText(Buffer.from('  \n\n', 'utf8'))).toThrow('空文件')
    expect(() => decodeText(Buffer.from([0x01, 0x02, 0x03]))).toThrow('非文本')
  })
})

describe('TXT block splitting', () => {
  it('preserves the full source after splitting', () => {
    const source = `${'甲'.repeat(1200)}\n第二段\n第三段`
    const blocks = splitText(source)
    expect(blocks.join('')).toBe(source)
    expect(blocks.every(block => block.length > 0)).toBe(true)
  })
})
