'use client';

/**
 * Combination Detail Component
 * Shows combination info, generate button, and variant list
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
  ImagePlus,
  Trash2,
  Loader2,
  Calendar,
  FileCode,
} from 'lucide-react';
import {
  useGenerateVariant,
  useDeleteCombination,
} from '@/hooks/use-combinations';
import { VariantCard } from './variant-card';
interface CombinationDetailProps {
  combination: any; // Flexible type to handle Prisma response
}

export function CombinationDetail({ combination }: CombinationDetailProps) {
  const generateVariant = useGenerateVariant();
  const deleteCombination = useDeleteCombination();
  const [isDeleting, setIsDeleting] = useState(false);

  const libraryIds = combination.libraryIds as Record<string, string>;

  // Extract display names from entry IDs
  const getDisplayName = (entryId: string): string => {
    // Remove prefix and version suffix
    // char_betty_v1 -> Betty
    // theme_christmas_v1 -> Christmas
    const parts = entryId.split('_');
    if (parts.length >= 2) {
      const name = parts.slice(1, -1).join(' ');
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return entryId;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCombination.mutateAsync(combination.id);
    } finally {
      setIsDeleting(false);
    }
  };

  // Sort records by variant number
  const sortedRecords = [...combination.records].sort(
    (a, b) => a.variantNumber - b.variantNumber
  );

  // Get next variant number
  const nextVariantNumber =
    sortedRecords.length > 0
      ? sortedRecords[sortedRecords.length - 1].variantNumber + 1
      : 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{combination.combinationKey}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              创建于{' '}
              {new Date(combination.createdAt!).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon" className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                这将删除该组合及其所有变体图片。此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Template Info */}
      {combination.template && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              生成模板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">基于</span>
              <Badge
                variant={combination.template.category === 'MAIN' ? 'default' : 'secondary'}
              >
                {combination.template.category}
              </Badge>
              <span className="font-medium">{combination.template.name}</span>
              <span className="text-sm text-muted-foreground">模板生成</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!combination.template && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              生成模板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline">未关联模板</Badge>
              <span className="text-sm text-muted-foreground">
                该组合未通过策略生成，或关联的模板已被删除
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Combination Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">组合信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(libraryIds).map(([library, entryId]) => (
              <Badge key={library} variant="outline" className="text-sm">
                {library}: {getDisplayName(entryId)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Generate Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">图片变体</h3>
          <p className="text-sm text-muted-foreground">
            共 {sortedRecords.length} 个变体
          </p>
        </div>
        <Button
          onClick={() => generateVariant.mutate(combination.id)}
          disabled={generateVariant.isPending}
        >
          {generateVariant.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 h-4 w-4" />
          )}
          生成图片 (v{nextVariantNumber})
        </Button>
      </div>

      {/* Variant List */}
      {sortedRecords.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ImagePlus className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>暂无变体图片</p>
            <p className="text-sm">点击上方按钮生成第一个变体</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedRecords.map((record) => (
            <VariantCard
              key={record.id}
              record={record}
              combinationId={combination.id}
              combinationKey={combination.combinationKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}
