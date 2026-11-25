import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronLeft, List, Type } from 'lucide-react'
import type { OpenBook, Position, Settings, TextBlock } from '../electron/types'
import { estimateBlockHeight, offsetForPosition, positionFromRanges } from './reader-position'

const formatProgress = (progress: number) => progress === 0 ? '未开始' : progress >= 0.995 ? '已读完' : `${Math.max(1, Math.round(progress * 100))}%`

export interface ReaderController {
  readPosition(): Position | null
  scrollTo(position: Position): void
}

interface ReaderViewProps {
  active: OpenBook
  blocks: TextBlock[]
  loaded: number
  total: number
  settings: Settings
  onScroll: () => void
  onNeedMore: () => void
  onBack: () => void
  onSettings: () => void
  onToc: () => void
}

export const ReaderView = forwardRef<ReaderController, ReaderViewProps>(function ReaderView({
  active, blocks, loaded, total, settings, onScroll, onNeedMore, onBack, onSettings, onToc
}, ref) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const needMoreRef = useRef(onNeedMore)
  needMoreRef.current = onNeedMore

  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: index => estimateBlockHeight(blocks[index]?.text ?? '', settings.fontSize, viewportRef.current?.clientWidth || 740),
    paddingStart: 67,
    paddingEnd: 96,
    overscan: 6,
    getItemKey: index => blocks[index]?.index ?? index
  })

  useEffect(() => {
    virtualizer.measure()
  }, [settings.fontSize, virtualizer])

  useEffect(() => {
    if (loaded >= total || blocks.length === 0) return
    if (virtualizer.getDistanceFromEnd() < 1200) needMoreRef.current()
  }, [loaded, total, blocks.length, settings.fontSize, virtualizer])

  useImperativeHandle(ref, () => ({
    readPosition() {
      const scrollTop = viewportRef.current?.scrollTop ?? 0
      const ranges = virtualizer.measurementsCache.map(item => ({
        index: blocks[item.index]?.index ?? item.index,
        start: item.start,
        size: item.size
      }))
      return positionFromRanges(ranges, scrollTop)
    },
    scrollTo(position: Position) {
      const index = blocks.findIndex(block => block.index === position.block)
      if (index < 0) return
      const measured = virtualizer.measurementsCache.find(item => item.index === index)
      const start = measured?.start ?? virtualizer.getOffsetForIndex(index, 'start')?.[0]
      if (start === undefined) return
      const size = measured?.size
        ?? estimateBlockHeight(blocks[index].text, settings.fontSize, viewportRef.current?.clientWidth || 740)
      virtualizer.scrollToOffset(offsetForPosition({ start, size }, position.fraction), { align: 'start' })
    }
  }), [blocks, settings.fontSize, virtualizer])

  const items = virtualizer.getVirtualItems()

  return <main className="reader-shell">
    <header className="reader-bar">
      <button className="back-btn" onClick={onBack}><ChevronLeft size={20} />书架</button>
      <div className="reader-title">
        <strong>{active.book.title}</strong>
        <span>{active.book.encoding} · {formatProgress(active.book.progress)}{active.chapters.length ? ` · ${active.chapters.length} 章` : ''}</span>
      </div>
      <div className="reader-actions">
        <span className="saved-label">自动保存</span>
        <button className="icon-btn large" aria-label="章节目录" onClick={onToc}><List size={19} /></button>
        <button className="icon-btn large" aria-label="阅读设置" onClick={onSettings}><Type size={19} /></button>
      </div>
    </header>
    <div className="reader-progress"><span style={{ width: `${Math.max(0, Math.min(100, active.book.progress * 100))}%` }} /></div>
    <div
      className="reading-viewport"
      ref={viewportRef}
      onScroll={() => {
        if (loaded < total && virtualizer.getDistanceFromEnd() < 1200) needMoreRef.current()
        onScroll()
      }}
    >
      <article
        className="reading-paper"
        style={{ height: virtualizer.getTotalSize(), '--reading-font-size': `${settings.fontSize}px` } as CSSProperties}
      >
        {items.map(item => {
          const block = blocks[item.index]
          if (!block) return null
          return <div
            key={item.key}
            data-index={item.index}
            data-block={block.index}
            ref={virtualizer.measureElement}
            className="reading-block"
            style={{ transform: `translateY(${item.start}px)` }}
          ><p>{block.text}</p></div>
        })}
      </article>
      {loaded < total && <div className="load-hint">正在加载更多内容…</div>}
      {loaded >= total && blocks.length > 0 && <div className="end-hint">— 全文完 —</div>}
    </div>
  </main>
})
