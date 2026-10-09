'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface VirtualTaskListProps<T> {
  items: T[];
  itemHeight?: number; // estimated height per row in pixels
  overscan?: number; // number of items to render above/below visible area
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T) => string;
  emptyState?: React.ReactNode;
}

/**
 * List Virtualization Component for smooth, lag-free scrolling with 500+ items.
 * Uses pure math and scroll observation outside React state re-renders to maintain 60 FPS.
 */
export function VirtualTaskList<T extends { _id?: string; id?: string }>({
  items,
  itemHeight = 110,
  overscan = 5,
  className = '',
  renderItem,
  keyExtractor,
  emptyState,
}: VirtualTaskListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // If list is small (<= 15 items), render directly without virtualization overhead
  const shouldVirtualize = items.length > 20;

  // Measure window / viewport height
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight || 600);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions, { passive: true });
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Handle scroll events with RAF throttling for optimal performance
  const rafId = useRef<number | null>(null);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const targetScrollTop = e.currentTarget.scrollTop;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      setScrollTop(targetScrollTop);
    });
  }, []);

  // Compute visible range using pure math outside render loop
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    if (!shouldVirtualize) {
      return { startIndex: 0, endIndex: items.length, totalHeight: 0, offsetY: 0 };
    }

    const count = items.length;
    const total = count * itemHeight;

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const end = Math.min(count, start + visibleCount);
    const offset = start * itemHeight;

    return {
      startIndex: start,
      endIndex: end,
      totalHeight: total,
      offsetY: offset,
    };
  }, [items.length, itemHeight, scrollTop, containerHeight, overscan, shouldVirtualize]);

  if (items.length === 0) {
    return <>{emptyState || null}</>;
  }

  if (!shouldVirtualize) {
    return (
      <div className={`space-y-2.5 ${className}`}>
        {items.map((item, index) => {
          const key = keyExtractor ? keyExtractor(item) : (item._id || item.id || `item-${index}`);
          return <React.Fragment key={key}>{renderItem(item, index)}</React.Fragment>;
        })}
      </div>
    );
  }

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto max-h-[75vh] relative will-change-transform ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
            willChange: 'transform',
          }}
          className="space-y-2.5"
        >
          {visibleItems.map((item, idx) => {
            const actualIndex = startIndex + idx;
            const key = keyExtractor ? keyExtractor(item) : (item._id || item.id || `virtual-${actualIndex}`);
            return <React.Fragment key={key}>{renderItem(item, actualIndex)}</React.Fragment>;
          })}
        </div>
      </div>
    </div>
  );
}
export default VirtualTaskList;
