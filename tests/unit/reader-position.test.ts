import { describe, expect, it } from 'vitest'
import { positionFromScroll, targetScrollTop } from '../../src/reader-position'

describe('reader position helpers', () => {
  it('maps a block box and fraction to scrollTop', () => {
    expect(targetScrollTop({ top: 400, height: 200 }, 0.25)).toBe(450)
    expect(targetScrollTop({ top: 100, height: 80 }, -1)).toBe(100)
    expect(targetScrollTop({ top: 100, height: 80 }, 2)).toBe(180)
  })

  it('infers the visible block from scrollTop using real box heights', () => {
    const boxes = [
      { index: 0, top: 0, height: 120 },
      { index: 1, top: 120, height: 300 },
      { index: 2, top: 420, height: 160 }
    ]
    const getBox = (index: number) => boxes.find(box => box.index === index) ?? null

    expect(positionFromScroll(boxes, getBox, 0)).toEqual({ block: 0, fraction: 0 })
    expect(positionFromScroll(boxes, getBox, 150)).toEqual({ block: 1, fraction: 0.1 })
    expect(positionFromScroll(boxes, getBox, 500)).toEqual({ block: 2, fraction: 0.5 })
  })

  it('falls back to the last loaded block when scrolled past all boxes', () => {
    const boxes = [
      { index: 0, top: 0, height: 100 },
      { index: 1, top: 100, height: 100 }
    ]
    const getBox = (index: number) => boxes.find(box => box.index === index) ?? null
    expect(positionFromScroll(boxes, getBox, 500)).toEqual({ block: 1, fraction: 1 })
  })
})
