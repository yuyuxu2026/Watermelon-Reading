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
