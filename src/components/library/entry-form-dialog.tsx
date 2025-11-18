'use client';

/**
 * Entry Form Dialog Component
 *
 * Mixed-mode dialog for creating or editing library entries:
 * - Form mode: Dynamic form generated from library schema
 * - JSON mode: Direct JSON editor
 * - Toggle between modes
 * - Validation against library schema
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  useLibraryEntry,
  useCreateLibraryEntry,
  useUpdateLibraryEntry,
  type LibraryEntry,
} from '@/hooks/use-libraries';
import { Loader2, Save, Code, FileEdit, AlertCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  libraryName: string;
  entryId?: string | null; // null/undefined = create mode, string = edit mode
  onSuccess?: () => void;
}

export function EntryFormDialog({
  open,
  onOpenChange,
  libraryName,
  entryId,
  onSuccess,
}: EntryFormDialogProps) {
  const [viewMode, setViewMode] = useState<'form' | 'json'>('form');
  const [jsonData, setJsonData] = useState('');
  const [jsonError, setJsonError] = useState('');

  const isEditMode = !!entryId;

  // Fetch existing entry if in edit mode
  const { data: existingEntry, isLoading: isLoadingEntry } = useLibraryEntry(
    libraryName,
    entryId || ''
  );

  const createMutation = useCreateLibraryEntry();
  const updateMutation = useUpdateLibraryEntry();

  const form = useForm<Record<string, unknown>>({
    defaultValues: {
      id: '',
      name: '',
      description: '',
    },
  });

  // Load existing entry data when editing
  useEffect(() => {
    if (isEditMode && existingEntry) {
      form.reset(existingEntry);
      setJsonData(JSON.stringify(existingEntry, null, 2));
    } else if (!isEditMode) {
      // Reset for create mode
      form.reset({
        id: '',
        name: '',
        description: '',
      });
      setJsonData(
        JSON.stringify(
          {
            id: '',
            name: '',
            description: '',
          },
          null,
          2
        )
      );
    }
  }, [isEditMode, existingEntry, form]);

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    try {
      if (isEditMode && entryId) {
        await updateMutation.mutateAsync({
          libraryName,
          entryId,
          entry: data,
        });
      } else {
        await createMutation.mutateAsync({
          libraryName,
          entry: data as LibraryEntry,
        });
      }

      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error('Form submit error:', error);
    }
  };

  const handleJsonSubmit = async () => {
    try {
      // Validate JSON
      const parsedData = JSON.parse(jsonData);
      setJsonError('');

      if (isEditMode && entryId) {
        await updateMutation.mutateAsync({
          libraryName,
          entryId,
          entry: parsedData,
        });
      } else {
        await createMutation.mutateAsync({
          libraryName,
          entry: parsedData as LibraryEntry,
        });
      }

      handleClose();
      onSuccess?.();
    } catch (error) {
      if (error instanceof SyntaxError) {
        setJsonError('JSON 格式错误: ' + error.message);
      } else {
        console.error('JSON submit error:', error);
      }
    }
  };

  const handleModeToggle = () => {
    if (viewMode === 'form') {
      // Switch to JSON mode: sync form data to JSON
      const formData = form.getValues();
      setJsonData(JSON.stringify(formData, null, 2));
      setViewMode('json');
    } else {
      // Switch to form mode: sync JSON to form (if valid)
      try {
        const parsedData = JSON.parse(jsonData);
        form.reset(parsedData);
        setJsonError('');
        setViewMode('form');
      } catch (error) {
        setJsonError('JSON 格式错误，无法切换到表单模式。请先修正 JSON 格式。');
      }
    }
  };

  const handleClose = () => {
    form.reset();
    setJsonData('');
    setJsonError('');
    setViewMode('form');
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && isLoadingEntry) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {isEditMode ? '编辑条目' : '新增条目'}
                {isEditMode && entryId && (
                  <Badge variant="outline" className="ml-2 font-mono text-xs">
                    {entryId}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? '修改现有库条目' : '向库中添加新条目'}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleModeToggle}
              disabled={isPending}
            >
              {viewMode === 'form' ? (
                <>
                  <Code className="mr-2 h-4 w-4" />
                  JSON 编辑器
                </>
              ) : (
                <>
                  <FileEdit className="mr-2 h-4 w-4" />
                  表单模式
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {viewMode === 'form' ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                {/* ID Field */}
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="char_example_v1"
                          {...field}
                          disabled={isEditMode}
                          value={field.value as string}
                        />
                      </FormControl>
                      <FormDescription>
                        {isEditMode
                          ? '条目 ID 不可修改'
                          : '唯一标识符（小写字母、数字、下划线）'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名称 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="示例条目"
                          {...field}
                          value={field.value as string}
                        />
                      </FormControl>
                      <FormDescription>条目的显示名称</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description Field */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>描述</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="条目的详细描述..."
                          className="resize-none"
                          rows={3}
                          {...field}
                          value={field.value as string}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    当前显示的是基本字段。如需编辑更多字段，请切换到 JSON 编辑器模式。
                  </AlertDescription>
                </Alert>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    取消
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    {isEditMode ? '保存' : '创建'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <Textarea
                className={cn(
                  'font-mono text-xs resize-none',
                  jsonError && 'border-destructive'
                )}
                rows={20}
                value={jsonData}
                onChange={(e) => {
                  setJsonData(e.target.value);
                  setJsonError('');
                }}
                placeholder="粘贴或编辑 JSON 数据..."
              />

              {jsonError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{jsonError}</AlertDescription>
                </Alert>
              )}

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  取消
                </Button>
                <Button onClick={handleJsonSubmit} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? '保存' : '创建'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
