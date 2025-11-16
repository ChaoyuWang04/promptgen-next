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
  { id: 7, name: '繁体中文', code: 'zh' },
];

const PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini' },
  { id: 'bytedance', name: '字节跳动' },
];

export function BatchGenerationDialog({ open, onOpenChange }: BatchGenerationDialogProps) {
  const generateBatch = useGenerateBatch();
  const [languageId, setLanguageId] = useState<number>(1);
  const [provider, setProvider] = useState<string>('');
  const [useFilter, setUseFilter] = useState(false);

  const handleGenerate = async () => {
    await generateBatch.mutateAsync({
      language_id: languageId,
      provider: provider || undefined,
      library_filter: useFilter ? {} : undefined,
    });
    onOpenChange(false);
    // Reset state
    setLanguageId(1);
    setProvider('');
    setUseFilter(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>批量生成图片</DialogTitle>
          <DialogDescription>
            配置批量生成参数。系统将自动生成所有待生成的组合。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Language Selection */}
          <div className="space-y-2">
            <Label htmlFor="language">目标语言</Label>
            <Select
              value={String(languageId)}
              onValueChange={(value) => setLanguageId(Number(value))}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="选择语言" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.id} value={String(lang.id)}>
                    {lang.name} ({lang.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider (可选)</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="自动选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">自动选择</SelectItem>
                {PROVIDERS.map((prov) => (
                  <SelectItem key={prov.id} value={prov.id}>
                    {prov.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Option */}
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
              批量生成可能需要较长时间。生成过程中可以关闭此对话框，
              系统将在后台继续执行。
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleGenerate} disabled={generateBatch.isPending}>
            {generateBatch.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                生成中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                开始生成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
