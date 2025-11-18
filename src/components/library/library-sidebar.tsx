'use client';

/**
 * Library Sidebar Component
 *
 * 左侧边栏组件，显示所有库的紧凑列表
 * - 显示库名称和条目数量
 * - 高亮当前选中的库
 * - 可滚动
 * - 底部显示"新建库"按钮
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LibraryItem {
  name: string;
  displayName: string;
  entryCount: number;
  isActive: boolean;
  order: number;
}

interface LibrarySidebarProps {
  libraries: LibraryItem[];
  selectedLibrary: string | null;
  onSelectLibrary: (libraryName: string) => void;
  onCreateLibrary: () => void;
  isLoading?: boolean;
}

export function LibrarySidebar({
  libraries,
  selectedLibrary,
  onSelectLibrary,
  onCreateLibrary,
  isLoading = false,
}: LibrarySidebarProps) {
  // Sort libraries by order
  const sortedLibraries = useMemo(() => {
    return [...libraries].sort((a, b) => a.order - b.order);
  }, [libraries]);

  if (isLoading) {
    return (
      <div className="w-[200px] border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold text-muted-foreground">库列表</h2>
        </div>
        <div className="flex-1 p-2 space-y-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[200px] border-r bg-muted/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground">库列表</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          共 {libraries.length} 个库
        </p>
      </div>

      {/* Library List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedLibraries.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>暂无库</p>
              <p className="text-xs mt-1">点击下方按钮创建</p>
            </div>
          ) : (
            sortedLibraries.map((library) => (
              <button
                key={library.name}
                onClick={() => onSelectLibrary(library.name)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  selectedLibrary === library.name && [
                    'bg-accent text-accent-foreground',
                    'border-l-2 border-primary'
                  ],
                  !library.isActive && 'opacity-50'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {library.displayName}
                  </span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {library.entryCount}
                  </Badge>
                </div>
                {!library.isActive && (
                  <p className="text-xs text-muted-foreground mt-0.5">已禁用</p>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer - Create Button */}
      <div className="p-2 border-t">
        <Button
          onClick={onCreateLibrary}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          新建库
        </Button>
      </div>
    </div>
  );
}
