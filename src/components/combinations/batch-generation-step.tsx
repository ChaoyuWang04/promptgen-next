'use client';

/**
 * Batch Generation Step Component
 * Step 4 of Strategy Generation: Configure batch image generation
 * Features:
 * - Language selection (7 languages)
 * - Configuration options (continueOnError)
 * - NO generation mode selection (removed)
 */

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const LANGUAGES = [
  { id: 1, name: '英语', code: 'en' },
  { id: 2, name: '法语', code: 'fr' },
  { id: 3, name: '日语', code: 'ja' },
  { id: 4, name: '韩语', code: 'ko' },
  { id: 5, name: '德语', code: 'de' },
  { id: 6, name: '西班牙语', code: 'es' },
  { id: 7, name: '中文', code: 'zh' },
];

interface BatchGenerationStepProps {
  totalCombinations: number;
  selectedLanguages: number[];
  onLanguagesChange: (languages: number[]) => void;
  continueOnError: boolean;
  onContinueOnErrorChange: (value: boolean) => void;
}

export function BatchGenerationStep({
  totalCombinations,
  selectedLanguages,
  onLanguagesChange,
  continueOnError,
  onContinueOnErrorChange,
}: BatchGenerationStepProps) {
  const toggleLanguage = (langId: number) => {
    if (selectedLanguages.includes(langId)) {
      onLanguagesChange(selectedLanguages.filter((id) => id !== langId));
    } else {
      onLanguagesChange([...selectedLanguages, langId].sort());
    }
  };

  const selectAllLanguages = () => {
    onLanguagesChange([1, 2, 3, 4, 5, 6, 7]);
  };

  const deselectAllLanguages = () => {
    onLanguagesChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          即将为 <Badge variant="secondary" className="mx-1">{totalCombinations} 个组合</Badge> 批量生成图片。
          每个组合需要经过 3 轮生成：主图 → 差异图 → 多语言拼接。
        </AlertDescription>
      </Alert>

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
                className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
          onCheckedChange={(checked) => onContinueOnErrorChange(checked as boolean)}
        />
        <label
          htmlFor="continue-on-error"
          className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          遇到错误继续执行 (推荐)
        </label>
      </div>

      {/* Warning Alert */}
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          批量生成将消耗大量 API 额度。生成过程将在后台异步执行，
          您可以在组合列表顶部的进度栏中查看进度。
        </AlertDescription>
      </Alert>
    </div>
  );
}
