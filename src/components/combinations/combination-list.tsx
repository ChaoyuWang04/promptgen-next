'use client';

/**
 * Combination List Component
 * Displays a list of combinations in the sidebar with:
 * - Checkbox selection support
 * - Infinite scroll loading
 */

import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface CombinationItem {
  id?: string;
  combinationKey: string;
  libraryIds: Record<string, string>;
  _count?: {
    records: number;
  };
  mainTemplate?: {
    id: string;
    name: string;
    category: 'MAIN' | 'DIFF';
  } | null;
  diffTemplate?: {
    id: string;
    name: string;
    category: 'MAIN' | 'DIFF';
  } | null;
  createdAt?: Date | string;
}

interface CombinationListProps {
  combinations: CombinationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  // Selection mode props
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (id: string, checked: boolean) => void;
  // Infinite scroll props
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function CombinationList({
  combinations,
  selectedId,
  onSelect,
  selectionMode = false,
  selectedIds = new Set(),
  onSelectionChange,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: CombinationListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && onLoadMore) {
        onLoadMore();
      }
    },
    [hasNextPage, isFetchingNextPage, onLoadMore]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  if (combinations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        暂无组合
      </div>
    );
  }

  return (
    <div className="divide-y">
      {combinations.map((combo) => {
        const comboId = combo.id || combo.combinationKey;
        const isSelected = combo.id ? selectedIds.has(combo.id) : false;
        const isActive = combo.id && selectedId === combo.id;

        return (
          <div
            key={comboId}
            className={cn(
              'flex items-start gap-3 p-4 transition-colors hover:bg-accent',
              isActive && 'bg-accent'
            )}
          >
            {/* Checkbox for selection mode */}
            {selectionMode && combo.id && (
              <div className="pt-0.5">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    onSelectionChange?.(combo.id!, !!checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Main content - clickable area */}
            <button
              onClick={() => combo.id && onSelect(combo.id)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-medium truncate">{combo.combinationKey}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{Object.keys(combo.libraryIds).length} 个库元素</span>
                    {combo.mainTemplate && (
                      <>
                        <span>·</span>
                        <Badge
                          variant="default"
                          className="text-xs h-5"
                        >
                          {combo.mainTemplate.name}
                        </Badge>
                      </>
                    )}
                    {!combo.mainTemplate && (
                      <>
                        <span>·</span>
                        <Badge variant="outline" className="text-xs h-5">
                          未关联模板
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                {combo._count && combo._count.records > 0 && (
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    {combo._count.records} 变体
                  </Badge>
                )}
              </div>
            </button>
          </div>
        );
      })}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="p-2">
        {isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>加载更多...</span>
          </div>
        )}
        {!hasNextPage && combinations.length > 0 && (
          <div className="text-center py-2 text-xs text-muted-foreground">
            已加载全部
          </div>
        )}
      </div>
    </div>
  );
}
