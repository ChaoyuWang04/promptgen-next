'use client';

/**
 * Combination List Component
 * Displays a list of combinations in the sidebar
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CombinationItem {
  id?: string;
  combinationKey: string;
  libraryIds: Record<string, string>;
  _count?: {
    records: number;
  };
  template?: {
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
}

export function CombinationList({
  combinations,
  selectedId,
  onSelect,
}: CombinationListProps) {
  if (combinations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        暂无组合
      </div>
    );
  }

  return (
    <div className="divide-y">
      {combinations.map((combo) => (
        <button
          key={combo.id || combo.combinationKey}
          onClick={() => combo.id && onSelect(combo.id)}
          className={cn(
            'w-full p-4 text-left transition-colors hover:bg-accent',
            combo.id && selectedId === combo.id && 'bg-accent'
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="font-medium truncate">{combo.combinationKey}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{Object.keys(combo.libraryIds).length} 个库元素</span>
                {combo.template && (
                  <>
                    <span>·</span>
                    <Badge
                      variant={combo.template.category === 'MAIN' ? 'default' : 'secondary'}
                      className="text-xs h-5"
                    >
                      {combo.template.name}
                    </Badge>
                  </>
                )}
                {!combo.template && (
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
      ))}
    </div>
  );
}
