import iconv from 'iconv-lite'
import type { BlockInfo } from './types'

export const MAX_FILE_BYTES = 64 * 1024 * 1024
export const BLOCK_SIZE = 600

export function decodeText(buffer: Buffer): { text: string; encoding: string } {
  if (buffer.length > MAX_FILE_BYTES) throw new Error('文件过大，请导入小于 64 MB 的 TXT 文件。')
  let text: string
  let encoding: string
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    text = iconv.decode(buffer, 'utf16-le'); encoding = 'UTF-16 LE'
  } else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    text = iconv.decode(buffer, 'utf16-be'); encoding = 'UTF-16 BE'
  } else {
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); encoding = 'UTF-8'
    } catch {
      text = iconv.decode(buffer, 'gb18030'); encoding = 'GBK / GB18030'
      if (text.includes('\ufffd')) throw new Error('无法识别文本编码，请将文件另存为 UTF-8 后重试。')
    }
  }
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  if (!text.trim()) throw new Error('这是一个空文件，请选择包含正文的 TXT 文件。')
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) throw new Error('文件包含非文本内容，请选择有效的 TXT 文件。')
  return { text, encoding }
}

// Keep paragraph boundaries where possible; cap unusually long lines too.
// Joining the blocks must reproduce the normalized source text exactly.
export function splitText(text: string): string[] {
  const blocks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + BLOCK_SIZE, text.length)
    if (end < text.length) {
      const lineEnd = text.lastIndexOf('\n', end - 1)
      if (lineEnd >= start) end = lineEnd + 1
      if (end > start && /[\uD800-\uDBFF]/.test(text[end - 1])) end--
    }
    blocks.push(text.slice(start, end))
    start = end
  }
  return blocks
}

export function blockInfo(blocks: string[]): BlockInfo[] {
  let start = 0
  return blocks.map(text => {
    const info = { start, length: text.length, lines: text.split('\n').length }
    start += text.length
    return info
  })
}
