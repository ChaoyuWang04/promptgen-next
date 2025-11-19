'use client';

/**
 * Create Library Dialog Component
 *
 * 创建新库对话框（三步骤）：
 * Step 1: 选择模板或空白库
 * Step 2: 填写基本信息
 * Step 3: 定义 Schema（仅空白库）
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { useLibraryTemplates, useCreateLibrary, type LibraryTemplate } from '@/hooks/use-libraries';
import { Loader2, FileText, Sparkles, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SchemaEditor } from './schema-editor';

// Form validation schema
const createLibrarySchema = z.object({
  name: z
    .string()
    .min(1, '库名称不能为空')
    .regex(/^[a-z][a-z0-9_]*$/, '库名称只能包含小写字母、数字和下划线，且必须以字母开头')
    .max(50, '库名称最多 50 个字符'),
  displayName: z.string().min(1, '显示名称不能为空').max(100, '显示名称最多 100 个字符'),
  description: z.string().max(500, '描述最多 500 个字符').optional(),
  displayField: z.string().min(1).optional(),
});

type CreateLibraryFormData = z.infer<typeof createLibrarySchema>;

interface CreateLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateLibraryDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateLibraryDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<LibraryTemplate | null>(null);
  const [customSchema, setCustomSchema] = useState<Record<string, unknown> | null>(null);

  const { data: templates, isLoading: isLoadingTemplates } = useLibraryTemplates();
  const createLibrary = useCreateLibrary();

  const form = useForm<CreateLibraryFormData>({
    resolver: zodResolver(createLibrarySchema),
    defaultValues: {
      name: '',
      displayName: '',
      displayField: 'name',
    },
  });

  const handleTemplateSelect = (template: LibraryTemplate | null) => {
    setSelectedTemplate(template);

    // Pre-fill form if template is selected
    if (template) {
      form.setValue('displayField', template.displayField);
      form.setValue('description', template.description);
    }

    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleNext = () => {
    // For blank library, go to schema definition step
    if (!selectedTemplate) {
      setStep(3);
    }
  };

  const handleSubmit = async (data: CreateLibraryFormData) => {
    try {
      await createLibrary.mutateAsync({
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        displayField: data.displayField || 'name',
        templateName: selectedTemplate?.name,
        schema: !selectedTemplate ? customSchema || undefined : undefined,
      });

      // Reset and close
      form.reset();
      setStep(1);
      setSelectedTemplate(null);
      setCustomSchema(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the hook
      console.error('Create library error:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    setStep(1);
    setSelectedTemplate(null);
    setCustomSchema(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && '创建新库 - 选择模板'}
            {step === 2 && '创建新库 - 填写信息'}
            {step === 3 && '创建新库 - 定义 Schema'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && '选择一个预定义模板快速开始，或创建空白库自定义结构'}
            {step === 2 && '填写库的基本信息'}
            {step === 3 && '定义库的字段结构（JSON Schema 格式）'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Blank Library Option */}
                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary',
                    'hover:shadow-md'
                  )}
                  onClick={() => handleTemplateSelect(null)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">空白库</CardTitle>
                    </div>
                    <CardDescription className="text-sm">
                      创建一个空白库，自定义字段结构
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Template Options */}
                {templates?.map((template) => (
                  <Card
                    key={template.name}
                    className={cn(
                      'cursor-pointer transition-all hover:border-primary',
                      'hover:shadow-md'
                    )}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{template.displayName}</CardTitle>
                      </div>
                      <CardDescription className="text-sm line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      分类: {template.category || '未分类'} • 类型: {template.structureType === 'standard' ? '标准' : '嵌套数组'}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Selected Template Info */}
              {selectedTemplate && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm">
                        使用模板: {selectedTemplate.displayName}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {selectedTemplate.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}

              {/* Library Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>库名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="character" {...field} />
                    </FormControl>
                    <FormDescription>
                      小写字母开头，只能包含字母、数字和下划线（例如: my_library）
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Display Name */}
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>显示名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="人物" {...field} />
                    </FormControl>
                    <FormDescription>
                      在界面中显示的中文名称
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="库的用途和说明..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Display Field */}
              <FormField
                control={form.control}
                name="displayField"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>显示字段</FormLabel>
                    <FormControl>
                      <Input placeholder="name" {...field} />
                    </FormControl>
                    <FormDescription>
                      在列表中显示的主要字段名（默认: name）
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  返回
                </Button>
                {selectedTemplate ? (
                  <Button type="submit" disabled={createLibrary.isPending}>
                    {createLibrary.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    创建
                  </Button>
                ) : (
                  <Button type="button" onClick={handleNext}>
                    下一步
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <SchemaEditor
              value={customSchema || undefined}
              onChange={(schema) => setCustomSchema(schema)}
              height="450px"
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <Button
                type="button"
                onClick={() => form.handleSubmit(handleSubmit)()}
                disabled={createLibrary.isPending || !customSchema}
              >
                {createLibrary.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                创建
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 1 && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
