'use client';

/**
 * Strategy Generation Dialog (v2)
 * 4-Step Wizard for Strategy Configuration with Multi-Select Support
 *
 * Flow: Select Template → Configure Elements → Preview → Confirm Generate
 */

import { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useTemplates, useTemplateLibraries } from '@/hooks/use-templates';
import { useLibrary } from '@/hooks/use-libraries';
import {
  usePreviewCombinations,
  useGenerateCombinations,
} from '@/hooks/use-combinations';
import { useGenerateBatch } from '@/hooks/use-images';
import { useToast } from '@/hooks/use-toast';
import { BatchGenerationStep } from './batch-generation-step';

interface StrategyGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBatchStarted?: (batchId: string) => void;
}

type Step = 'template' | 'configure' | 'preview' | 'batch';

export function StrategyGenerationDialog({
  open,
  onOpenChange,
  onBatchStarted,
}: StrategyGenerationDialogProps) {
  // State
  const [step, setStep] = useState<Step>('template');
  const [selectedMainTemplateId, setSelectedMainTemplateId] = useState<string>('');
  const [selectedDiffTemplateId, setSelectedDiffTemplateId] = useState<string>('');
  const [strategyConfig, setStrategyConfig] = useState<Record<string, string[]>>({});

  // Batch generation state
  const [selectedLanguages, setSelectedLanguages] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [continueOnError, setContinueOnError] = useState(true);

  // Hooks
  const { data: templates, isLoading: isLoadingTemplates } = useTemplates();
  const { data: templateLibraries } = useTemplateLibraries(selectedMainTemplateId);
  const previewMutation = usePreviewCombinations();
  const generateMutation = useGenerateCombinations();
  const generateBatchMutation = useGenerateBatch();
  const { toast } = useToast();

  // Separate main and diff templates
  const mainTemplates = useMemo(
    () => templates?.filter((t) => t.category === 'MAIN') || [],
    [templates]
  );
  const diffTemplates = useMemo(
    () => templates?.filter((t) => t.category === 'DIFF') || [],
    [templates]
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('template');
      setSelectedMainTemplateId('');
      setSelectedDiffTemplateId('');
      setStrategyConfig({});
      setSelectedLanguages([1, 2, 3, 4, 5, 6, 7]);
      setContinueOnError(true);
      previewMutation.reset();
    }
  }, [open]);

  // Initialize strategy config when template libraries are loaded
  useEffect(() => {
    if (templateLibraries?.libraries) {
      const initialConfig: Record<string, string[]> = {};
      templateLibraries.libraries.forEach((lib) => {
        initialConfig[lib.name] = [];
      });
      setStrategyConfig(initialConfig);
    }
  }, [templateLibraries]);

  // Step 1: Template Selection
  const renderTemplateStep = () => (
    <div className="space-y-4">
      {/* Main Template Selection */}
      <div className="space-y-2">
        <Label>主图模板 (Main Template)</Label>
        <Select
          value={selectedMainTemplateId}
          onValueChange={setSelectedMainTemplateId}
          disabled={isLoadingTemplates}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择主图模板" />
          </SelectTrigger>
          <SelectContent>
            {mainTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <Badge variant="default">MAIN</Badge>
                  <span>{template.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Diff Template Selection */}
      <div className="space-y-2">
        <Label>差异图模板 (Diff Template)</Label>
        <Select
          value={selectedDiffTemplateId}
          onValueChange={setSelectedDiffTemplateId}
          disabled={isLoadingTemplates}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择差异图模板" />
          </SelectTrigger>
          <SelectContent>
            {diffTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">DIFF</Badge>
                  <span>{template.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {templateLibraries && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">主图模板引用的库</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {templateLibraries.libraries.map((lib) => (
                <Badge key={lib.name} variant="outline">
                  {lib.displayName} ({lib.entryCount}个元素)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Step 2: Configure Elements
  const renderConfigureStep = () => {
    if (!templateLibraries) return null;

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          为每个库选择要使用的元素（可多选）。留空表示使用所有元素。
        </div>

        {templateLibraries.libraries.map((templateLib) => (
          <LibraryElementSelector
            key={templateLib.name}
            libraryName={templateLib.name}
            displayName={templateLib.displayName}
            selectedIds={strategyConfig[templateLib.name] || []}
            onChange={(ids) =>
              setStrategyConfig((prev) => ({ ...prev, [templateLib.name]: ids }))
            }
          />
        ))}
      </div>
    );
  };

  // Step 3: Preview
  const renderPreviewStep = () => {
    const preview = previewMutation.data;

    if (previewMutation.isPending) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">计算组合数...</span>
        </div>
      );
    }

    if (!preview) return null;

    return (
      <div className="space-y-4">
        {/* Total Count */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">预计生成组合数</span>
              <Badge variant="secondary" className="text-2xl px-4 py-2">
                {preview.totalCombinations} 个
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">模板信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">主图模板</span>
              <div className="flex items-center gap-2">
                <Badge variant="default">MAIN</Badge>
                <span className="font-medium">{preview.mainTemplateName}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">差异图模板</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">DIFF</Badge>
                <span className="font-medium">{preview.diffTemplateName}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Library Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">库选择情况</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {preview.librarySummary.map((summary) => (
              <div key={summary.library} className="flex justify-between items-start text-sm">
                <span className="font-medium">{summary.displayName}</span>
                <div className="text-right">
                  {summary.isAll ? (
                    <Badge variant="outline">全选 ({summary.totalCount}个)</Badge>
                  ) : (
                    <Badge variant="default">
                      {summary.selectedCount}/{summary.totalCount}个
                    </Badge>
                  )}
                  {summary.selectedElements && summary.selectedElements.length <= 3 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {summary.selectedElements.map((el) => el.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Step 4: Batch Generation (Optional)
  const renderBatchStep = () => {
    return (
      <BatchGenerationStep
        totalCombinations={previewMutation.data?.totalCombinations || 0}
        selectedLanguages={selectedLanguages}
        onLanguagesChange={setSelectedLanguages}
        continueOnError={continueOnError}
        onContinueOnErrorChange={setContinueOnError}
      />
    );
  };

  // Handle preview
  const handlePreview = async () => {
    await previewMutation.mutateAsync({
      mainTemplateId: selectedMainTemplateId,
      diffTemplateId: selectedDiffTemplateId,
      strategyConfig,
    });
    setStep('preview');
  };

  // Handle skip batch generation (only create combinations)
  const handleSkipBatch = async () => {
    await generateMutation.mutateAsync({
      mainTemplateId: selectedMainTemplateId,
      diffTemplateId: selectedDiffTemplateId,
      strategyConfig,
    });
    onOpenChange(false);
  };

  // Handle start batch generation
  const handleStartBatch = async () => {
    try {
      // First create combinations
      const result = await generateMutation.mutateAsync({
        mainTemplateId: selectedMainTemplateId,
        diffTemplateId: selectedDiffTemplateId,
        strategyConfig,
      });

      // Extract imageIds from created combinations
      const imageIds = result.createdCombinations?.flatMap((c: any) => c.imageIds) || [];

      if (imageIds.length === 0) {
        toast({
          title: '无需生成',
          description: '所有组合已存在，无需批量生成',
        });
        onOpenChange(false);
        return;
      }

      // Start batch generation
      const batchResult = await generateBatchMutation.mutateAsync({
        imageIds,
        languageIds: selectedLanguages,
        continueOnError,
        concurrency: 1,
      });

      // Notify parent about batch started
      if (onBatchStarted && batchResult.data?.batchId) {
        onBatchStarted(batchResult.data.batchId);
      }

      toast({
        title: '批量生成已启动',
        description: `正在生成 ${imageIds.length} 个组合的图片，请在进度栏查看进度`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to start batch generation:', error);
      toast({
        title: '批量生成失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    }
  };

  // Navigation helpers
  const canGoNext = () => {
    if (step === 'template') return !!selectedMainTemplateId && !!selectedDiffTemplateId && !!templateLibraries;
    if (step === 'configure') return true;
    if (step === 'preview') return !!previewMutation.data;
    if (step === 'batch') return selectedLanguages.length > 0;
    return false;
  };

  const handleNext = () => {
    if (step === 'template') setStep('configure');
    else if (step === 'configure') handlePreview();
    else if (step === 'preview') setStep('batch');
  };

  const handleBack = () => {
    if (step === 'configure') setStep('template');
    else if (step === 'preview') setStep('configure');
    else if (step === 'batch') setStep('preview');
  };

  // Current step content
  const stepContent = {
    template: renderTemplateStep(),
    configure: renderConfigureStep(),
    preview: renderPreviewStep(),
    batch: renderBatchStep(),
  }[step];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>策略生成组合</DialogTitle>
          <DialogDescription>
            {step === 'template' && '选择模板以自动识别引用的库'}
            {step === 'configure' && '配置每个库的元素选择（支持多选）'}
            {step === 'preview' && '确认生成配置'}
            {step === 'batch' && '批量生成图片（可选）'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {(['template', 'configure', 'preview', 'batch'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : i < (['template', 'configure', 'preview', 'batch'] as Step[]).indexOf(step)
                    ? 'border-primary bg-primary/10'
                    : 'border-muted'
                }`}
              >
                {i < (['template', 'configure', 'preview', 'batch'] as Step[]).indexOf(step) ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
              </div>
              {i < 3 && <div className="w-12 h-0.5 bg-muted mx-2" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="py-4 min-h-[300px]">{stepContent}</div>

        {/* Footer */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {step !== 'template' && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              上一步
            </Button>
          )}
          {step !== 'preview' && step !== 'batch' && (
            <Button onClick={handleNext} disabled={!canGoNext()}>
              下一步
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 'preview' && (
            <Button onClick={handleNext} disabled={!previewMutation.data}>
              下一步：配置批量生成
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 'batch' && (
            <>
              <Button
                variant="outline"
                onClick={handleSkipBatch}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                跳过批量生成
              </Button>
              <Button
                onClick={handleStartBatch}
                disabled={
                  selectedLanguages.length === 0 ||
                  generateMutation.isPending ||
                  generateBatchMutation.isPending
                }
              >
                {(generateMutation.isPending || generateBatchMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                立即生成 ({selectedLanguages.length} 语言)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Library Element Selector Component
 * Supports multi-select with checkbox group
 */
interface LibraryElementSelectorProps {
  libraryName: string;
  displayName: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function LibraryElementSelector({
  libraryName,
  displayName,
  selectedIds,
  onChange,
}: LibraryElementSelectorProps) {
  const { data: library, isLoading } = useLibrary(libraryName);
  const entries = useMemo(() => {
    if (!library) return [];

    // Extract entries from library.entries (which is a Record<string, any>)
    const entriesObj = library.entries as Record<string, any>;
    return Object.entries(entriesObj).map(([id, data]) => ({
      id,
      name: data.name || id,
    }));
  }, [library]);

  const handleToggle = (entryId: string) => {
    if (selectedIds.includes(entryId)) {
      onChange(selectedIds.filter((id) => id !== entryId));
    } else {
      onChange([...selectedIds, entryId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === entries.length) {
      onChange([]);
    } else {
      onChange(entries.map((e) => e.id));
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">加载中...</div>;
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{displayName}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {selectedIds.length === 0
                ? `全选 (${entries.length})`
                : `${selectedIds.length}/${entries.length}`}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-6 text-xs"
            >
              {selectedIds.length === entries.length ? '清空' : '全选'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-3 pt-0">
        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center space-x-2">
              <Checkbox
                id={`${libraryName}-${entry.id}`}
                checked={selectedIds.includes(entry.id)}
                onCheckedChange={() => handleToggle(entry.id)}
              />
              <label
                htmlFor={`${libraryName}-${entry.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {entry.name}
              </label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
