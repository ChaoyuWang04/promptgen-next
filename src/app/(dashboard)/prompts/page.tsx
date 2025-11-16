'use client';

/**
 * Prompt Generation Page
 * Interface for generating main and diff prompts
 */

import { useState } from 'react';
import { useLibraryConfig, useLibrary } from '@/hooks/use-libraries';
import { useGenerateMainPrompt, useGenerateDiffPrompt } from '@/hooks/use-prompts';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Sparkles, FileText, Copy, Check } from 'lucide-react';
import { formatLibraryId } from '@/lib/utils/format';
import { copyToClipboard } from '@/lib/utils/format';

export default function PromptsPage() {
  const { data: config, isLoading: configLoading } = useLibraryConfig();
  const generateMain = useGenerateMainPrompt();
  const generateDiff = useGenerateDiffPrompt();

  // Main prompt state
  const [mainSelections, setMainSelections] = useState<Record<string, string>>({});
  const [mainResult, setMainResult] = useState<{
    image_id: string;
    prompt_cn: string;
    prompt_en: string;
  } | null>(null);

  // Diff prompt state
  const [diffImageId, setDiffImageId] = useState('');
  const [diffResult, setDiffResult] = useState<{
    diff_id: string;
    prompt_cn: string;
    prompt_en: string;
  } | null>(null);

  // Copy state
  const [copiedMain, setCopiedMain] = useState(false);
  const [copiedDiff, setCopiedDiff] = useState(false);

  const handleGenerateMain = async () => {
    // Validate all required libraries are selected
    const requiredLibs = config?.enabled_libraries.filter((lib) => lib.type === 'required');
    const allSelected = requiredLibs?.every((lib) => mainSelections[lib.name]);

    if (!allSelected) {
      return;
    }

    const result = await generateMain.mutateAsync({
      library_ids: mainSelections as any,
    });

    setMainResult(result);
  };

  const handleCopyMain = async () => {
    if (!mainResult) return;
    const success = await copyToClipboard(mainResult.prompt_cn);
    if (success) {
      setCopiedMain(true);
      setTimeout(() => setCopiedMain(false), 2000);
    }
  };

  const handleCopyDiff = async () => {
    if (!diffResult) return;
    const success = await copyToClipboard(diffResult.prompt_cn);
    if (success) {
      setCopiedDiff(true);
      setTimeout(() => setCopiedDiff(false), 2000);
    }
  };

  if (configLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" text="加载配置..." />
      </div>
    );
  }

  if (!config) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>加载失败</AlertTitle>
        <AlertDescription>无法加载库配置</AlertDescription>
      </Alert>
    );
  }

  const requiredLibraries = config.enabled_libraries.filter((lib) => lib.type === 'required');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prompt生成</h1>
        <p className="text-muted-foreground">
          基于库选择生成主图和对比图的AI Prompt
        </p>
      </div>

      <Tabs defaultValue="main" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="main" className="gap-2">
            <Sparkles className="h-4 w-4" />
            主图生成
          </TabsTrigger>
          <TabsTrigger value="diff" className="gap-2">
            <FileText className="h-4 w-4" />
            对比图生成
          </TabsTrigger>
        </TabsList>

        {/* Main Prompt Tab */}
        <TabsContent value="main" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle>选择库元素</CardTitle>
                <CardDescription>
                  从每个库中选择一个元素来生成主图Prompt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {requiredLibraries
                  .sort((a, b) => a.order - b.order)
                  .map((lib) => (
                    <LibrarySelector
                      key={lib.name}
                      libraryName={lib.name}
                      displayName={lib.displayName}
                      displayField={lib.displayField}
                      value={mainSelections[lib.name]}
                      onChange={(value) =>
                        setMainSelections((prev) => ({ ...prev, [lib.name]: value }))
                      }
                    />
                  ))}

                <Separator />

                <Button
                  onClick={handleGenerateMain}
                  disabled={
                    generateMain.isPending ||
                    !requiredLibraries.every((lib) => mainSelections[lib.name])
                  }
                  className="w-full"
                  size="lg"
                >
                  {generateMain.isPending ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      生成主图Prompt
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Output Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>生成结果</CardTitle>
                    <CardDescription>生成的Prompt文本</CardDescription>
                  </div>
                  {mainResult && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyMain}
                    >
                      {copiedMain ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          复制
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {mainResult ? (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Image ID</Label>
                      <Badge variant="outline" className="mt-1 font-mono">
                        {mainResult.image_id}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">中文Prompt</Label>
                      <Textarea
                        value={mainResult.prompt_cn}
                        readOnly
                        className="mt-2 min-h-[300px] font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">英文Prompt</Label>
                      <Textarea
                        value={mainResult.prompt_en}
                        readOnly
                        className="mt-2 min-h-[200px] font-mono text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
                    选择库元素并点击生成按钮
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Diff Prompt Tab */}
        <TabsContent value="diff" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>对比图生成</AlertTitle>
            <AlertDescription>
              对比图功能需要先生成主图。请在主图生成页面完成主图后，再进行对比图生成。
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Library Selector Component
interface LibrarySelectorProps {
  libraryName: string;
  displayName: string;
  displayField: string;
  value?: string;
  onChange: (value: string) => void;
}

function LibrarySelector({
  libraryName,
  displayName,
  displayField,
  value,
  onChange,
}: LibrarySelectorProps) {
  const { data: library, isLoading } = useLibrary(libraryName);

  const entries = library?.entries ? Object.values(library.entries) : [];

  return (
    <div className="space-y-2">
      <Label>
        {displayName}
        <span className="ml-1 text-destructive">*</span>
      </Label>
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? '加载中...' : `选择${displayName}`} />
        </SelectTrigger>
        <SelectContent>
          {entries.map((entry) => (
            <SelectItem key={entry.id} value={entry.id}>
              {String(entry[displayField] || entry.id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
