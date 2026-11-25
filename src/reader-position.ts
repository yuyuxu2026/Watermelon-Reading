import type { Position } from '../electron/types'

export interface BlockBox {
  top: number
  height: number
}

/** Pixel scroll offset that places `fraction` through the given block box. */
export function targetScrollTop(box: BlockBox, fraction: number): number {
  const clamped = Math.max(0, Math.min(1, fraction))
  return Math.max(0, box.top + box.height * clamped)
}

/** Block box relative to a scroll container, using layout rects. */
export function blockBoxInContainer(node: HTMLElement, container: HTMLElement): BlockBox {
  const nodeRect = node.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return {
    top: nodeRect.top - containerRect.top + container.scrollTop,
    height: node.offsetHeight
  }
}

/** Rough block height before the virtualizer measures the real DOM node. */
export function estimateBlockHeight(text: string, fontSize: number, columnWidth: number): number {
  const width = Math.max(160, columnWidth)
  const lineHeight = fontSize * 2.05
  const gap = fontSize
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 1.04)))
  const visualLines = text.split('\n').reduce((count, line) => {
    return count + Math.max(1, Math.ceil(Math.max(line.length, 1) / charsPerLine))
  }, 0)
  return visualLines * lineHeight + gap
}

export interface BlockRange {
  index: number
  start: number
  size: number
}

/** Infer reading position from virtualizer ranges (start/size), not from every DOM node. */
export function positionFromRanges(ranges: BlockRange[], scrollTop: number, anchor = 20): Position | null {
  if (ranges.length === 0) return null
  const current = ranges.find(range => range.start + range.size > scrollTop + anchor) ?? ranges[ranges.length - 1]
  const fraction = Math.max(0, Math.min(1, (scrollTop - current.start) / Math.max(1, current.size)))
  return { block: current.index, fraction }
}

/** Scroll offset that places `fraction` through a measured or estimated range. */
export function offsetForPosition(range: Pick<BlockRange, 'start' | 'size'>, fraction: number): number {
  const clamped = Math.max(0, Math.min(1, fraction))
  return Math.max(0, range.start + range.size * clamped)
}

/** Infer reading position from the current scroll offset and rendered blocks. */
export function positionFromScroll(
  blocks: { index: number }[],
  getBox: (index: number) => BlockBox | null,
  scrollTop: number
): Position | null {
  const current = blocks.find(block => {
    const box = getBox(block.index)
    return box !== null && box.top + box.height > scrollTop + 20
  }) ?? blocks.at(-1)
  if (!current) return null
  const box = getBox(current.index)
  const fraction = box
    ? Math.max(0, Math.min(1, (scrollTop - box.top) / Math.max(1, box.height)))
    : 0
  return { block: current.index, fraction }
}
