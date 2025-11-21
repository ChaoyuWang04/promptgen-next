'use client';

/**
 * Library Table Component
 * Displays library entries in a searchable, sortable table with batch operations
 */

import { useState, useMemo } from 'react';
import {
  useLibrary,
  useDeleteLibraryEntry,
  useBulkDeleteLibraryEntries,
  type LibraryEntry,
} from '@/hooks/use-libraries';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, MoreVertical, Pencil, Trash2, Eye, ListChecks } from 'lucide-react';
import { formatLibraryId } from '@/lib/utils/format';

interface LibraryTableProps {
  libraryName: string;
  displayField: string;
  searchQuery?: string;
  onView?: (entryId: string) => void;
  onEdit?: (entryId: string) => void;
}

export function LibraryTable({
  libraryName,
  displayField,
  searchQuery = '',
  onView,
  onEdit,
}: LibraryTableProps) {
  const { data: library, isLoading } = useLibrary(libraryName);
  const deleteMutation = useDeleteLibraryEntry();
  const bulkDeleteMutation = useBulkDeleteLibraryEntries();

  // Single delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LibraryEntry | null>(null);

  // Batch mode state
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Filter and sort entries
  const entries = useMemo(() => {
    if (!library?.entries) return [];

    const entriesArray = Object.values(library.entries);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return entriesArray.filter((entry) => {
        // Dynamically search all string and number fields
        const searchableFields = Object.values(entry).filter(
          (value) => typeof value === 'string' || typeof value === 'number'
        );
        return searchableFields.some((field) =>
          String(field || '').toLowerCase().includes(query)
        );
      });
    }

    return entriesArray;
  }, [library, searchQuery, displayField]);

  // Handle single delete
  const handleDelete = async () => {
    if (!selectedEntry) return;

    await deleteMutation.mutateAsync({
      libraryName,
      entryId: selectedEntry.id,
    });

    setDeleteDialogOpen(false);
    setSelectedEntry(null);
  };

  // Handle batch mode toggle
  const handleBatchModeToggle = () => {
    setIsBatchMode(!isBatchMode);
    setSelectedIds(new Set()); // Clear selection when toggling
  };

  // Handle select all / deselect all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(entries.map((entry) => entry.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Handle individual selection
  const handleSelectEntry = (entryId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(entryId);
    } else {
      newSelectedIds.delete(entryId);
    }
    setSelectedIds(newSelectedIds);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    await bulkDeleteMutation.mutateAsync({
      libraryName,
      entryIds: Array.from(selectedIds),
    });

    setBulkDeleteDialogOpen(false);
    setSelectedIds(new Set());
    setIsBatchMode(false);
  };

  // Check if all entries are selected
  const isAllSelected = entries.length > 0 && selectedIds.size === entries.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < entries.length;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner text="加载中..." />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={searchQuery ? '未找到匹配项' : '暂无数据'}
        description={
          searchQuery
            ? '尝试调整搜索关键词'
            : '点击上方"新增条目"按钮添加第一个条目'
        }
      />
    );
  }

  return (
    <>
      {/* Batch Mode Controls */}
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant={isBatchMode ? 'default' : 'outline'}
          size="sm"
          onClick={handleBatchModeToggle}
        >
          <ListChecks className="mr-2 h-4 w-4" />
          {isBatchMode ? '退出批量操作' : '批量操作'}
        </Button>

        {/* Batch Action Bar - Only shown when items are selected */}
        {isBatchMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              已选中 {selectedIds.size} 项
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除选中
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isBatchMode && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="全选"
                    className={isIndeterminate ? 'data-[state=checked]:bg-primary' : ''}
                  />
                </TableHead>
              )}
              <TableHead className="w-[250px]">ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead className="w-[100px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                {isBatchMode && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(entry.id)}
                      onCheckedChange={(checked) =>
                        handleSelectEntry(entry.id, checked as boolean)
                      }
                      aria-label={`选择 ${entry.id}`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-mono text-xs">
                  <Badge variant="outline">{entry.id}</Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {String(entry[displayField] || '-')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onView?.(entry.id)}
                        disabled={!onView}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onEdit?.(entry.id)}
                        disabled={!onEdit}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedEntry(entry);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除条目 <strong>{selectedEntry?.id}</strong> 吗？
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 <strong>{selectedIds.size}</strong> 个条目吗？
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除 {selectedIds.size} 个条目
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
