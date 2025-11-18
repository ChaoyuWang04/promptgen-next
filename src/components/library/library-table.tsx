'use client';

/**
 * Library Table Component
 * Displays library entries in a searchable, sortable table
 */

import { useState, useMemo } from 'react';
import { useLibrary, useDeleteLibraryEntry, type LibraryEntry } from '@/hooks/use-libraries';
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
import { FileText, MoreVertical, Pencil, Trash2, Eye } from 'lucide-react';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LibraryEntry | null>(null);

  // Filter and sort entries
  const entries = useMemo(() => {
    if (!library?.entries) return [];

    const entriesArray = Object.values(library.entries);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return entriesArray.filter((entry) => {
        const searchableFields = [
          entry.id,
          entry[displayField],
          entry.description,
          entry.name,
        ];
        return searchableFields.some((field) =>
          String(field || '').toLowerCase().includes(query)
        );
      });
    }

    return entriesArray;
  }, [library, searchQuery, displayField]);

  const handleDelete = async () => {
    if (!selectedEntry) return;

    await deleteMutation.mutateAsync({
      libraryName,
      entryId: selectedEntry.id,
    });

    setDeleteDialogOpen(false);
    setSelectedEntry(null);
  };

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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">ID</TableHead>
              <TableHead>{displayField === 'name' ? '名称' : '显示名称'}</TableHead>
              <TableHead className="w-[400px]">描述</TableHead>
              <TableHead className="w-[100px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-mono text-xs">
                  <Badge variant="outline">{entry.id}</Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {String(entry[displayField] || '-')}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {String(entry.description || '-').substring(0, 100)}
                  {String(entry.description || '').length > 100 && '...'}
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

      {/* Delete Confirmation Dialog */}
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
    </>
  );
}
