'use client'

import { useRef, useEffect } from 'react'
import { FixedSizeList as List } from 'react-window'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  height: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  className = ''
}: VirtualizedListProps<T>) {
  const listRef = useRef<any>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0)
    }
  }, [items])

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  )

  return (
    <List
      ref={listRef}
      className={className}
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </List>
  )
}
