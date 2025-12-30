'use client';

/**
 * Create Library Dialog Component
 *
 * 创建新库对话框（两步骤）：
 * Step 1: 填写基本信息
 * Step 2: 定义 Schema
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCreateLibrary } from '@/hooks/use-libraries';
import { Loader2, ChevronLeft } from 'lucide-react';
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
  category: z.enum(['MAIN', 'DIFF'], {
    errorMap: () => ({ message: '必须选择库类型' }),
  }),
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
  const [step, setStep] = useState<1 | 2>(1);
  const [customSchema, setCustomSchema] = useState<Record<string, unknown> | null>(null);

  const createLibrary = useCreateLibrary();

  const form = useForm<CreateLibraryFormData>({
    resolver: zodResolver(createLibrarySchema),
    defaultValues: {
      name: '',
      displayName: '',
      displayField: 'name',
      category: 'MAIN',
    },
  });

  const handleNext = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (data: CreateLibraryFormData) => {
    try {
      await createLibrary.mutateAsync({
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        displayField: data.displayField || 'name',
        category: data.category,
        schema: customSchema || undefined,
      });

      // Reset and close
      form.reset();
      setStep(1);
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
    setCustomSchema(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && '创建新库 - 填写信息'}
            {step === 2 && '创建新库 - 定义 Schema'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && '填写库的基本信息'}
            {step === 2 && '定义库的字段结构（JSON Schema 格式）'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <Form {...form}>
            <form className="space-y-4">
              {/* Library Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>库名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="my_library" {...field} />
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
                      <Input placeholder="我的库" {...field} />
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

              {/* Library Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>库类型 *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="MAIN" id="category-main" />
                          <Label htmlFor="category-main" className="font-normal cursor-pointer">
                            <span className="font-medium">MAIN</span> - 主图库（用于主图模板）
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="DIFF" id="category-diff" />
                          <Label htmlFor="category-diff" className="font-normal cursor-pointer">
                            <span className="font-medium">DIFF</span> - 差异图库（用于差异图模板）
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      选择此库用于主图模板还是差异图模板
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  取消
                </Button>
                <Button type="button" onClick={handleNext}>
                  下一步
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <SchemaEditor
              value={customSchema || undefined}
              onChange={(schema) => setCustomSchema(schema)}
              height="450px"
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleBack}>
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
      </DialogContent>
    </Dialog>
  );
}
