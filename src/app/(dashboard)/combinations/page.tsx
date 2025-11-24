'use client';

/**
 * Combinations Management Page
 * Two-panel layout: combination list on left, detail panel on right
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Layers, Filter } from 'lucide-react';
import { useCombinations, useCombination } from '@/hooks/use-combinations';
import { useTemplates } from '@/hooks/use-templates';
import { CombinationList } from '@/components/combinations/combination-list';
import { CombinationDetail } from '@/components/combinations/combination-detail';
import { StrategyGenerationDialog } from '@/components/combinations/strategy-generation-dialog';

export default function CombinationsPage() {
  // State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [isStrategyDialogOpen, setIsStrategyDialogOpen] = useState(false);

  // Queries
  const { data: templates } = useTemplates();

  const {
    data: listData,
    isLoading: isListLoading,
    error: listError,
  } = useCombinations({
    templateId: templateFilter || undefined,
    search: search || undefined,
    page,
    pageSize: 20,
  });

  const {
    data: selectedCombination,
    isLoading: isDetailLoading,
  } = useCombination(selectedId);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6" />
          <h1 className="text-2xl font-bold">组合管理</h1>
        </div>
        <Button onClick={() => setIsStrategyDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          策略生成
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Combination List */}
        <div className="flex w-80 flex-col border-r">
          {/* Filters */}
          <div className="border-b p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索组合..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Template Filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                按模板筛选
              </label>
              <Select
                value={templateFilter || 'all'}
                onValueChange={(value) => {
                  setTemplateFilter(value === 'all' ? '' : value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部模板" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部模板</SelectItem>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={template.category === 'MAIN' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {template.category}
                        </Badge>
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          {listData && (
            <div className="border-b p-4">
              <p className="text-sm text-muted-foreground">
                共 {listData.total} 个组合
              </p>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-auto">
            {listError ? (
              <div className="p-4 text-center text-destructive">
                加载失败: {listError.message}
              </div>
            ) : isListLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                加载中...
              </div>
            ) : (
              <CombinationList
                combinations={listData?.combinations || []}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </div>

          {/* Pagination */}
          {listData && listData.totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {listData.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) => Math.min(listData.totalPages, p + 1))
                }
                disabled={page === listData.totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </div>

        {/* Right Panel - Detail */}
        <div className="flex-1 overflow-auto">
          {selectedId ? (
            isDetailLoading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">加载详情中...</p>
              </div>
            ) : selectedCombination ? (
              <CombinationDetail combination={selectedCombination} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">组合不存在</p>
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center">
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle className="text-center">
                    选择一个组合查看详情
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  <p>从左侧列表选择一个组合，</p>
                  <p>或点击"策略生成"创建新组合</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Strategy Generation Dialog */}
      <StrategyGenerationDialog
        open={isStrategyDialogOpen}
        onOpenChange={setIsStrategyDialogOpen}
      />
    </div>
  );
}
