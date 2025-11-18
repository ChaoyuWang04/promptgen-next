'use client';

/**
 * Entry Detail Dialog Component
 *
 * Read-only view of a library entry showing all fields
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLibraryEntry } from '@/hooks/use-libraries';
import { Loader2, Code, Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EntryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  libraryName: string;
  entryId: string;
  onEdit?: (entryId: string) => void;
}

export function EntryDetailDialog({
  open,
  onOpenChange,
  libraryName,
  entryId,
  onEdit,
}: EntryDetailDialogProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'json'>('formatted');

  const { data: entry, isLoading } = useLibraryEntry(libraryName, entryId);

  const handleEdit = () => {
    onOpenChange(false);
    onEdit?.(entryId);
  };

  const renderValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">未设置</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? '是' : '否'}
        </Badge>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground italic">空数组</span>;
      }
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="pl-4 border-l-2 border-muted">
              {typeof item === 'object' ? (
                <pre className="text-xs bg-muted p-2 rounded">
                  {JSON.stringify(item, null, 2)}
                </pre>
              ) : (
                <Badge variant="outline">{String(item)}</Badge>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return <span className="text-sm">{String(value)}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                查看条目详情
                <Badge variant="outline" className="font-mono text-xs">
                  {entryId}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {libraryName} 库中的条目信息
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setViewMode(viewMode === 'formatted' ? 'json' : 'formatted')
                }
              >
                {viewMode === 'formatted' ? (
                  <>
                    <Code className="mr-2 h-4 w-4" />
                    JSON
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    格式化
                  </>
                )}
              </Button>
              {onEdit && (
                <Button size="sm" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  编辑
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mr-4 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entry ? (
            viewMode === 'formatted' ? (
              <div className="space-y-4">
                {/* Core Fields Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">基本信息</CardTitle>
                    <CardDescription>条目的核心字段</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 items-start">
                      <span className="text-sm font-medium text-muted-foreground">ID:</span>
                      <div className="col-span-2">
                        <Badge variant="outline" className="font-mono">
                          {entry.id}
                        </Badge>
                      </div>
                    </div>

                    {entry.name && (
                      <div className="grid grid-cols-3 gap-2 items-start">
                        <span className="text-sm font-medium text-muted-foreground">
                          名称:
                        </span>
                        <div className="col-span-2">{renderValue(entry.name)}</div>
                      </div>
                    )}

                    {entry.description && (
                      <div className="grid grid-cols-3 gap-2 items-start">
                        <span className="text-sm font-medium text-muted-foreground">
                          描述:
                        </span>
                        <div className="col-span-2">{renderValue(entry.description)}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Fields Card */}
                {Object.keys(entry)
                  .filter((key) => !['id', 'name', 'description'].includes(key))
                  .length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">其他字段</CardTitle>
                      <CardDescription>条目的扩展属性</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(entry)
                        .filter(([key]) => !['id', 'name', 'description'].includes(key))
                        .map(([key, value]) => (
                          <div key={key} className="grid grid-cols-3 gap-2 items-start">
                            <span className="text-sm font-medium text-muted-foreground">
                              {key}:
                            </span>
                            <div className="col-span-2">{renderValue(value)}</div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">JSON 数据</CardTitle>
                  <CardDescription>完整的条目数据（JSON 格式）</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
                    {JSON.stringify(entry, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              未找到条目数据
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
