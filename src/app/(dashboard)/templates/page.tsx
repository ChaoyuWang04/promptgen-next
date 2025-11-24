'use client';

/**
 * Template Editor Page
 * Interface for creating and editing prompt templates
 */

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type * as Monaco from 'monaco-editor';
import {
  useTemplates,
  useTemplateVariables,
  usePreviewTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  type Template,
} from '@/hooks/use-templates';
import { useLibraryConfig, useLibrary } from '@/hooks/use-libraries';
import { createTemplateAutocomplete } from '@/lib/monaco/template-autocomplete';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Eye, Info, Sparkles, Save, SaveAll, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Dynamically import Monaco editor with loading state
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Skeleton className="h-[600px] w-full" />,
});

export default function TemplatesPage() {
  const { toast } = useToast();
  const { data: templates, isLoading: templatesLoading } = useTemplates();

  // State for selected template
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Get currently selected template object to determine its category
  const currentTemplate = templates?.find((t) => t.id === selectedTemplate);
  const currentCategory = currentTemplate?.category || 'MAIN';

  // Dynamically load variables based on current template's category
  const { data: variables, isLoading: variablesLoading } = useTemplateVariables(currentCategory);
  const { data: config } = useLibraryConfig();
  const previewMutation = usePreviewTemplate();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();
  const [editorContent, setEditorContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [previewSelections, setPreviewSelections] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<string | null>(null);

  // Dialog states
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  // Form states for dialogs
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<'MAIN' | 'DIFF'>('MAIN');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  // Monaco editor instance and autocomplete disposable refs
  const monacoRef = useRef<typeof Monaco | null>(null);
  const autocompleteDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const [monacoReady, setMonacoReady] = useState(false);

  // Handle Monaco editor mount - store monaco instance and trigger state update
  const handleEditorMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    monacoRef.current = monaco;
    setMonacoReady(true); // Trigger useEffect to register autocomplete
  };

  // Register/update autocomplete when variables data changes OR monaco becomes ready
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco || !monacoReady || !variables?.variables) {
      return;
    }

    // Dispose previous registration if exists
    if (autocompleteDisposableRef.current) {
      autocompleteDisposableRef.current.dispose();
    }

    // Register autocomplete with dynamic variables from API
    autocompleteDisposableRef.current = createTemplateAutocomplete(monaco, variables.variables);
  }, [variables?.variables, monacoReady]);

  // Cleanup autocomplete on unmount
  useEffect(() => {
    return () => {
      if (autocompleteDisposableRef.current) {
        autocompleteDisposableRef.current.dispose();
      }
    };
  }, []);

  // Check if current template is a system template
  const isSystemTemplate = currentTemplate?.type === 'SYSTEM';

  // Check if there are unsaved changes
  const hasUnsavedChanges = editorContent !== originalContent && selectedTemplate !== null;

  // Load template content when selection changes
  useEffect(() => {
    if (selectedTemplate && templates) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template && template.content !== undefined) {
        setEditorContent(template.content);
        setOriginalContent(template.content);
      }
    }
  }, [selectedTemplate, templates]);

  // Add beforeunload event listener to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle template selection with unsaved changes check
  const handleTemplateChange = (newTemplateId: string) => {
    if (hasUnsavedChanges) {
      setPendingTemplateId(newTemplateId);
      setShowUnsavedChangesDialog(true);
    } else {
      setSelectedTemplate(newTemplateId);
    }
  };

  // Handle unsaved changes dialog actions
  const handleSaveAndSwitch = async () => {
    if (selectedTemplate) {
      try {
        await updateMutation.mutateAsync({
          id: selectedTemplate,
          content: editorContent,
        });
        setOriginalContent(editorContent);
        if (pendingTemplateId) {
          setSelectedTemplate(pendingTemplateId);
          setPendingTemplateId(null);
        }
        setShowUnsavedChangesDialog(false);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const handleDiscardAndSwitch = () => {
    if (pendingTemplateId) {
      setSelectedTemplate(pendingTemplateId);
      setPendingTemplateId(null);
    }
    setShowUnsavedChangesDialog(false);
  };

  const handleCancelSwitch = () => {
    setPendingTemplateId(null);
    setShowUnsavedChangesDialog(false);
  };

  // Handle save template
  const handleSave = async () => {
    if (!selectedTemplate) {
      toast({
        title: '未选择模板',
        description: '请先选择一个模板',
        variant: 'destructive',
      });
      return;
    }

    if (currentTemplate?.type === 'SYSTEM') {
      toast({
        title: '无法保存',
        description: '系统模板不可修改，请使用"另存为"创建新模板',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: selectedTemplate,
        content: editorContent,
      });
      setOriginalContent(editorContent);
    } catch (error) {
      // Error toast handled by mutation
    }
  };

  // Handle save as
  const handleSaveAs = async () => {
    if (!newTemplateName.trim()) {
      toast({
        title: '验证失败',
        description: '模板名称不能为空',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newTemplate = await createMutation.mutateAsync({
        name: newTemplateName,
        type: 'USER', // User-created templates are always USER type
        category: newTemplateCategory,
        content: editorContent,
        description: newTemplateDescription || undefined,
      });

      // Select the newly created template
      setSelectedTemplate(newTemplate.id);
      setOriginalContent(editorContent);
      setShowSaveAsDialog(false);

      // Reset form
      setNewTemplateName('');
      setNewTemplateCategory('MAIN');
      setNewTemplateDescription('');
    } catch (error) {
      // Error toast handled by mutation
    }
  };

  // Handle new template
  const handleNewTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({
        title: '验证失败',
        description: '模板名称不能为空',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newTemplate = await createMutation.mutateAsync({
        name: newTemplateName,
        type: 'USER', // User-created templates are always USER type
        category: newTemplateCategory,
        content: '', // Empty content for new template
        description: newTemplateDescription || undefined,
      });

      // Select the newly created template and set default template content as guide
      setSelectedTemplate(newTemplate.id);
      const defaultContent =
        newTemplateCategory === 'MAIN'
          ? '// 在此处编写主模板内容\n// 使用 {{@module:variable}} 引用预定义模块\n// 使用 {{library.field}} 直接访问库字段\n\n角色: {{@character:name}}\n姿势: {{@pose:description}}\n场景: {{@scene:description}}\n'
          : '// 在此处编写差分模板内容\n// 使用 {{main.variable}} 引用主提示词变量\n// 使用 {{new_variable}} 引用新状态变量\n\n基于主提示词修改:\n{{main.character}}\n新增装饰: {{new_decorations.items}}\n';
      setEditorContent(defaultContent);
      setOriginalContent(defaultContent);
      setShowNewTemplateDialog(false);

      // Show success toast with guidance
      toast({
        title: '模板创建成功',
        description: '现在可以在编辑器中编写模板内容，完成后记得保存',
      });

      // Reset form
      setNewTemplateName('');
      setNewTemplateCategory('MAIN');
      setNewTemplateDescription('');
    } catch (error) {
      // Error toast handled by mutation
    }
  };

  // Handle delete template
  const handleDelete = async () => {
    if (!selectedTemplate) return;

    if (currentTemplate?.type === 'SYSTEM') {
      toast({
        title: '无法删除',
        description: '系统模板不可删除',
        variant: 'destructive',
      });
      return;
    }

    try {
      await deleteMutation.mutateAsync(selectedTemplate);
      setSelectedTemplate(null);
      setEditorContent('');
      setOriginalContent('');
      setShowDeleteDialog(false);
    } catch (error) {
      // Error toast handled by mutation
    }
  };

  // Handle preview
  const handlePreview = async () => {
    if (!editorContent || !config) return;

    // Check that all 5 core libraries are selected
    const coreLibraries = ['character', 'pose', 'scene', 'theme', 'style'];
    const missingLibraries = coreLibraries.filter((lib) => !previewSelections[lib]);

    if (missingLibraries.length > 0) {
      toast({
        title: '请选择所有必需的库',
        description: `缺少: ${missingLibraries.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await previewMutation.mutateAsync({
        content: editorContent,
        library_ids: previewSelections,
      });

      setPreviewResult(result.rendered);
    } catch (error) {
      // Error toast handled by mutation
    }
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
          <p className="text-muted-foreground">创建和编辑Prompt生成模板</p>
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
                <SheetDescription>在模板中使用这些变量来引用库数据</SheetDescription>
              </SheetHeader>
              <ScrollArea className="mt-6 h-[calc(100vh-120px)]">
                <div className="space-y-4">
                  {variablesLoading ? (
                    <LoadingSpinner text="加载变量..." />
                  ) : (
                    <>
                      {/* Display warnings if any */}
                      {variables?.warnings && variables.warnings.length > 0 && (
                        <div className="space-y-2">
                          {variables.warnings.map((warning, index) => (
                            <Alert key={index} variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                {warning.message}
                              </AlertDescription>
                            </Alert>
                          ))}
                          <Separator />
                        </div>
                      )}

                      {/* Display variables */}
                      {variables?.variables.map((variable) => (
                        <div key={variable.name} className="rounded-lg border p-3">
                          <div className="mb-1 flex items-center gap-2">
                            <code className="text-sm font-mono">{`{{${variable.name}}}`}</code>
                            <Badge variant="outline" className="text-xs">
                              {variable.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{variable.description}</p>
                          {variable.example && (
                            <div className="mt-2">
                              <code className="text-xs text-muted-foreground">
                                示例: {variable.example}
                              </code>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Show message if no variables available */}
                      {(!variables?.variables || variables.variables.length === 0) && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            暂无可用变量。请确保库已配置 JSON Schema。
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          <Button onClick={() => setShowNewTemplateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新建模板
          </Button>
        </div>
      </div>

      {/* Editor Section - Full Width */}
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
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label>选择模板</Label>
                <Select
                  value={selectedTemplate || ''}
                  onValueChange={handleTemplateChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择一个模板进行编辑" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          {template.name}
                          <Badge variant={template.type === 'SYSTEM' ? 'default' : 'secondary'}>
                            {template.type}
                          </Badge>
                          <Badge variant="outline">{template.category}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTemplate && currentTemplate?.type === 'USER' && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Monaco Editor */}
            <div className="rounded-md border">
              <Editor
                height="600px"
                defaultLanguage="plaintext"
                value={editorContent}
                onChange={(value) => setEditorContent(value || '')}
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  fontSize: 14,
                  quickSuggestions: true,
                  suggestOnTriggerCharacters: true,
                }}
                theme="vs-dark"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={handleSave}
                disabled={
                  !selectedTemplate ||
                  currentTemplate?.type === 'SYSTEM' ||
                  updateMutation.isPending
                }
              >
                {updateMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存模板
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSaveAsDialog(true)}
                disabled={createMutation.isPending}
              >
                <SaveAll className="mr-2 h-4 w-4" />
                另存为...
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section - Below Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            实时预览
          </CardTitle>
          <CardDescription>选择库元素查看渲染结果</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Library Selectors for Preview - show the 5 core libraries needed for template rendering */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {config?.enabled_libraries
              .filter((lib) => ['character', 'pose', 'scene', 'theme', 'style'].includes(lib.name))
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
          </div>

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
                <ScrollArea className="h-[400px]">
                  <pre className="whitespace-pre-wrap text-sm">{previewResult}</pre>
                </ScrollArea>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save As Dialog */}
      <Dialog open={showSaveAsDialog} onOpenChange={setShowSaveAsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>另存为新模板</DialogTitle>
            <DialogDescription>创建当前内容的副本作为新模板</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="save-as-name">模板名称 *</Label>
              <Input
                id="save-as-name"
                placeholder="例如: my-custom-template"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-as-type">模板类型 *</Label>
              <Select value={newTemplateCategory} onValueChange={(v: 'MAIN' | 'DIFF') => setNewTemplateCategory(v)}>
                <SelectTrigger id="save-as-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN">MAIN（主模板）</SelectItem>
                  <SelectItem value="DIFF">DIFF（差异模板）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-as-description">模板描述</Label>
              <Textarea
                id="save-as-description"
                placeholder="描述这个模板的用途..."
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveAsDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveAs} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  创建中...
                </>
              ) : (
                '创建模板'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Template Dialog */}
      <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建模板</DialogTitle>
            <DialogDescription>创建一个空白的新模板</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">模板名称 *</Label>
              <Input
                id="new-name"
                placeholder="例如: my-new-template"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-type">模板类型 *</Label>
              <Select value={newTemplateCategory} onValueChange={(v: 'MAIN' | 'DIFF') => setNewTemplateCategory(v)}>
                <SelectTrigger id="new-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN">MAIN（主模板）</SelectItem>
                  <SelectItem value="DIFF">DIFF（差异模板）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-description">模板描述</Label>
              <Textarea
                id="new-description"
                placeholder="描述这个模板的用途..."
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTemplateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleNewTemplate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  创建中...
                </>
              ) : (
                '创建模板'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除模板？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。模板 "{currentTemplate?.name}" 将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>有未保存的更改</AlertDialogTitle>
            <AlertDialogDescription>
              当前模板有未保存的更改。是否要保存更改后再切换模板？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwitch}>取消</AlertDialogCancel>
            <Button variant="outline" onClick={handleDiscardAndSwitch}>
              不保存
            </Button>
            <AlertDialogAction
              onClick={handleSaveAndSwitch}
              disabled={updateMutation.isPending || currentTemplate?.type === 'SYSTEM'}
            >
              {updateMutation.isPending ? '保存中...' : '保存并切换'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      <Label className="text-sm">{displayName}</Label>
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={`选择${displayName}`} />
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
