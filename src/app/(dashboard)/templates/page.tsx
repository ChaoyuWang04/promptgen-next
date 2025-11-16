'use client';

/**
 * Template Editor Page
 * Interface for creating and editing prompt templates
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTemplates, useTemplateVariables, usePreviewTemplate } from '@/hooks/use-templates';
import { useLibraryConfig, useLibrary } from '@/hooks/use-libraries';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileCode2, Plus, Eye, Info, Sparkles } from 'lucide-react';

// Dynamically import Monaco editor with loading state
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-full" />,
});

export default function TemplatesPage() {
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const { data: variables, isLoading: variablesLoading } = useTemplateVariables('main');
  const { data: config } = useLibraryConfig();
  const previewMutation = usePreviewTemplate();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [previewSelections, setPreviewSelections] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<string | null>(null);

  const handlePreview = async () => {
    if (!editorContent || !config) return;

    const requiredLibs = config.enabled_libraries.filter((lib) => lib.type === 'required');
    const allSelected = requiredLibs.every((lib) => previewSelections[lib.name]);

    if (!allSelected) {
      return;
    }

    const result = await previewMutation.mutateAsync({
      template_content: editorContent,
      library_ids: previewSelections,
      type: 'main',
    });

    setPreviewResult(result.prompt_cn);
  };

  if (templatesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" text="加载模板..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">模板编辑器</h1>
          <p className="text-muted-foreground">
            创建和编辑Prompt生成模板
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Info className="mr-2 h-4 w-4" />
                变量参考
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>可用变量</SheetTitle>
                <SheetDescription>
                  在模板中使用这些变量来引用库数据
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="mt-6 h-[calc(100vh-120px)]">
                <div className="space-y-4">
                  {variablesLoading ? (
                    <LoadingSpinner text="加载变量..." />
                  ) : (
                    variables?.map((variable) => (
                      <div key={variable.name} className="rounded-lg border p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <code className="text-sm font-mono">
                            {`{{${variable.name}}}`}
                          </code>
                          <Badge variant="outline" className="text-xs">
                            {variable.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {variable.description}
                        </p>
                        {variable.example && (
                          <div className="mt-2">
                            <code className="text-xs text-muted-foreground">
                              示例: {variable.example}
                            </code>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建模板
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Editor Section */}
        <Card>
          <CardHeader>
            <CardTitle>模板编辑器</CardTitle>
            <CardDescription>
              使用 <code className="text-xs">{`{{变量名}}`}</code> 语法引用库数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Template Selector */}
              <div className="space-y-2">
                <Label>选择模板</Label>
                <Select value={selectedTemplate || ''} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择一个模板进行编辑" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        <Badge variant="outline" className="ml-2">
                          {template.category}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Monaco Editor */}
              <div className="rounded-md border">
                <Editor
                  height="500px"
                  defaultLanguage="plaintext"
                  value={editorContent}
                  onChange={(value) => setEditorContent(value || '')}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    fontSize: 14,
                  }}
                  theme="vs-dark"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  保存模板
                </Button>
                <Button variant="outline" className="flex-1">
                  另存为...
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              实时预览
            </CardTitle>
            <CardDescription>
              选择库元素查看渲染结果
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Library Selectors for Preview */}
            {config?.enabled_libraries
              .filter((lib) => lib.type === 'required')
              .sort((a, b) => a.order - b.order)
              .map((lib) => (
                <LibraryPreviewSelector
                  key={lib.name}
                  libraryName={lib.name}
                  displayName={lib.displayName}
                  displayField={lib.displayField}
                  value={previewSelections[lib.name]}
                  onChange={(value) =>
                    setPreviewSelections((prev) => ({ ...prev, [lib.name]: value }))
                  }
                />
              ))}

            <Button
              onClick={handlePreview}
              disabled={previewMutation.isPending || !editorContent}
              className="w-full"
            >
              {previewMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  预览中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  生成预览
                </>
              )}
            </Button>

            {previewResult && (
              <>
                <Separator />
                <div className="rounded-md bg-muted p-4">
                  <ScrollArea className="h-[300px]">
                    <pre className="whitespace-pre-wrap text-xs">{previewResult}</pre>
                  </ScrollArea>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Template List */}
      {templates && templates.length === 0 ? (
        <EmptyState
          icon={FileCode2}
          title="暂无模板"
          description='点击"新建模板"创建第一个模板'
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>模板列表</CardTitle>
            <CardDescription>所有可用的Prompt模板</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates?.map((template) => (
                <div
                  key={template.id}
                  className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent"
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setEditorContent(template.content);
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">{template.name}</h3>
                    <Badge variant={template.category === 'system' ? 'default' : 'secondary'}>
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.description || '无描述'}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {template.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Library Preview Selector Component
interface LibraryPreviewSelectorProps {
  libraryName: string;
  displayName: string;
  displayField: string;
  value?: string;
  onChange: (value: string) => void;
}

function LibraryPreviewSelector({
  libraryName,
  displayName,
  displayField,
  value,
  onChange,
}: LibraryPreviewSelectorProps) {
  const { data: library, isLoading } = useLibrary(libraryName);
  const entries = library?.entries ? Object.values(library.entries) : [];

  return (
    <div className="space-y-2">
      <Label className="text-xs">{displayName}</Label>
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={`选择${displayName}`} />
        </SelectTrigger>
        <SelectContent>
          {entries.map((entry) => (
            <SelectItem key={entry.id} value={entry.id} className="text-xs">
              {String(entry[displayField] || entry.id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
