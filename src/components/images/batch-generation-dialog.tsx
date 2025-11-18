'use client';

/**
 * Batch Generation Dialog
 * Modal for configuring and starting batch image generation
 */

import { useState } from 'react';
import { useGenerateBatch } from '@/hooks/use-images';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Play, AlertCircle } from 'lucide-react';

interface BatchGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LANGUAGES = [
  { id: 1, name: '英语', code: 'en' },
  { id: 2, name: '法语', code: 'fr' },
  { id: 3, name: '日语', code: 'ja' },
  { id: 4, name: '韩语', code: 'ko' },
  { id: 5, name: '德语', code: 'de' },
  { id: 6, name: '西班牙语', code: 'es' },
  { id: 7, name: '中文', code: 'zh' },
];

export function BatchGenerationDialog({ open, onOpenChange }: BatchGenerationDialogProps) {
  const generateBatch = useGenerateBatch();
  const [selectedLanguages, setSelectedLanguages] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [mode, setMode] = useState<'all' | 'ungenerated' | 'unimaged'>('ungenerated');
  const [useFilter, setUseFilter] = useState(false);
  const [continueOnError, setContinueOnError] = useState(true);

  const toggleLanguage = (langId: number) => {
    setSelectedLanguages((prev) =>
      prev.includes(langId)
        ? prev.filter((id) => id !== langId)
        : [...prev, langId].sort()
    );
  };

  const selectAllLanguages = () => {
    setSelectedLanguages([1, 2, 3, 4, 5, 6, 7]);
  };

  const deselectAllLanguages = () => {
    setSelectedLanguages([]);
  };

  const handleGenerate = async () => {
    if (selectedLanguages.length === 0) {
      return; // Need at least one language
    }

    await generateBatch.mutateAsync({
      languageIds: selectedLanguages,
      mode: mode,
      libraryFilter: useFilter ? {} : undefined,
      continueOnError: continueOnError,
      concurrency: 1, // Sequential processing for safety
    });
    onOpenChange(false);
    // Reset state
    setSelectedLanguages([1, 2, 3, 4, 5, 6, 7]);
    setMode('ungenerated');
    setUseFilter(false);
    setContinueOnError(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>批量生成图片</DialogTitle>
          <DialogDescription>
            配置批量生成参数。系统将使用 Gemini 和 ByteDance 自动生成图片。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label htmlFor="mode">生成模式</Label>
            <Select
              value={mode}
              onValueChange={(value) => setMode(value as 'all' | 'ungenerated' | 'unimaged')}
            >
              <SelectTrigger id="mode">
                <SelectValue placeholder="选择模式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ungenerated">
                  仅未生成 (推荐) - 跳过已有记录的组合
                </SelectItem>
                <SelectItem value="unimaged">
                  仅无图片 - 已有提示词但无图片的组合
                </SelectItem>
                <SelectItem value="all">
                  全部 - 生成所有组合 (谨慎使用)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>目标语言</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllLanguages}
                  className="h-auto py-1 text-xs"
                >
                  全选
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={deselectAllLanguages}
                  className="h-auto py-1 text-xs"
                >
                  清空
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
              {LANGUAGES.map((lang) => (
                <div key={lang.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`lang-${lang.id}`}
                    checked={selectedLanguages.includes(lang.id)}
                    onCheckedChange={() => toggleLanguage(lang.id)}
                  />
                  <label
                    htmlFor={`lang-${lang.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {lang.name} ({lang.code})
                  </label>
                </div>
              ))}
            </div>
            {selectedLanguages.length === 0 && (
              <p className="text-xs text-red-500">请至少选择一种语言</p>
            )}
          </div>

          {/* Continue on Error Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="continue-on-error"
              checked={continueOnError}
              onCheckedChange={(checked) => setContinueOnError(checked as boolean)}
            />
            <label
              htmlFor="continue-on-error"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              遇到错误继续执行 (推荐)
            </label>
          </div>

          {/* Filter Option (Placeholder for future) */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-filter"
              checked={useFilter}
              onCheckedChange={(checked) => setUseFilter(checked as boolean)}
            />
            <label
              htmlFor="use-filter"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              启用组合筛选 (选择性生图)
            </label>
          </div>

          {useFilter && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                组合筛选功能允许您选择特定的库元素进行生成，节省API成本。
                此功能将在后续版本中完善。
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              批量生成可能需要较长时间。每张图片需要经过 3 轮生成：
              主图 → 差分图 → 多语言拼接。失败的图片会自动使用备用 Provider 重试。
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateBatch.isPending || selectedLanguages.length === 0}
          >
            {generateBatch.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                生成中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                开始生成 ({selectedLanguages.length} 语言)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
