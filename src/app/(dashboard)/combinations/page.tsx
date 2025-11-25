'use client';

/**
 * Combinations Management Page
 * Two-panel layout: combination list on left, detail panel on right
 * Features:
 * - Infinite scroll list
 * - Batch delete with selection mode
 */

import { useState, useMemo, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Layers, Filter, Trash2, X, CheckSquare } from 'lucide-react';
import {
  useInfiniteCombinations,
  useCombination,
  useDeleteCombinationsBatch,
} from '@/hooks/use-combinations';
import { useTemplates } from '@/hooks/use-templates';
import { CombinationList } from '@/components/combinations/combination-list';
import { CombinationDetail } from '@/components/combinations/combination-detail';
import { StrategyGenerationDialog } from '@/components/combinations/strategy-generation-dialog';
import { BatchProgressBar } from '@/components/combinations/batch-progress-bar';

export default function CombinationsPage() {
  // State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState<string>('');
  const [isStrategyDialogOpen, setIsStrategyDialogOpen] = useState(false);

  // Batch generation state
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Queries
  const { data: templates } = useTemplates();

  const {
    data: infiniteData,
    isLoading: isListLoading,
    error: listError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteCombinations({
    mainTemplateId: templateFilter || undefined,
    search: search || undefined,
    pageSize: 20,
  });

  const {
    data: selectedCombination,
    isLoading: isDetailLoading,
  } = useCombination(selectedId);

  // Batch delete mutation
  const batchDeleteMutation = useDeleteCombinationsBatch();

  // Flatten all combinations from infinite query pages
  const allCombinations = useMemo(() => {
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap((page) => page.combinations);
  }, [infiniteData?.pages]);

  // Get total count from first page
  const totalCount = infiniteData?.pages?.[0]?.total || 0;

  // All combination IDs for select all
  const allIds = useMemo(() => {
    return allCombinations.filter((c) => c.id).map((c) => c.id!);
  }, [allCombinations]);

  // Selection handlers
  const handleSelectionChange = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(allIds));
  }, [allIds]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      // Exiting selection mode - clear selections
      setSelectedIds(new Set());
    }
    setSelectionMode((prev) => !prev);
  }, [selectionMode]);

  const handleBatchDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    await batchDeleteMutation.mutateAsync(ids);

    // Clear selection after delete
    setSelectedIds(new Set());
    setSelectionMode(false);

    // If currently selected item was deleted, clear detail view
    if (selectedId && selectedIds.has(selectedId)) {
      setSelectedId(null);
    }
  }, [selectedIds, batchDeleteMutation, selectedId]);

  // Check if all loaded items are selected
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

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

      {/* Batch Progress Bar */}
      {currentBatchId && (
        <div className="px-4 pt-4">
          <BatchProgressBar
            batchId={currentBatchId}
            onDismiss={() => setCurrentBatchId(null)}
          />
        </div>
      )}

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
                onChange={(e) => setSearch(e.target.value)}
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

          {/* Stats & Batch Actions */}
          <div className="border-b p-4 space-y-3">
            {/* Stats row */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                共 {totalCount} 个组合
                {allCombinations.length < totalCount && (
                  <span> (已加载 {allCombinations.length})</span>
                )}
              </p>
              <Button
                variant={selectionMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleToggleSelectionMode}
              >
                {selectionMode ? (
                  <>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    退出选择
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                    批量选择
                  </>
                )}
              </Button>
            </div>

            {/* Selection mode actions */}
            {selectionMode && (
              <div className="flex items-center gap-2">
                {/* Select all checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleSelectAll();
                      } else {
                        handleDeselectAll();
                      }
                    }}
                  />
                  <span className="text-sm">
                    {isAllSelected ? '取消全选' : '全选'}
                  </span>
                </div>

                {/* Selection count */}
                {selectedIds.size > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    已选 {selectedIds.size}
                  </Badge>
                )}

                {/* Batch delete button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={selectedIds.size === 0 || batchDeleteMutation.isPending}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      删除
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认批量删除</AlertDialogTitle>
                      <AlertDialogDescription>
                        您确定要删除选中的 {selectedIds.size} 个组合吗？
                        <br />
                        <br />
                        <span className="text-destructive font-medium">
                          这将同时删除所有相关的变体记录、Prompt 和生成的图片文件。此操作无法撤销。
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBatchDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        确认删除 ({selectedIds.size})
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

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
                combinations={allCombinations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onSelectionChange={handleSelectionChange}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={() => fetchNextPage()}
              />
            )}
          </div>
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
        onBatchStarted={(batchId) => setCurrentBatchId(batchId)}
      />
    </div>
  );
}
