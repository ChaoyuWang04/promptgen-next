'use client';

/**
 * Library Configuration Dialog Component
 *
 * 4-tab dialog for managing library settings:
 * - Tab 1: Basic information (displayName, description, displayField, order, isActive)
 * - Tab 2: Schema Editor (preview + JSON toggle)
 * - Tab 3: Import/Export data
 * - Tab 4: Statistics
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useLibraryStats,
  useUpdateLibrary,
  useImportEntries,
  type LibraryStats,
} from '@/hooks/use-libraries';
import {
  Loader2,
  Save,
  Info,
  Code,
  FileJson,
  Upload,
  Download,
  BarChart3,
  Settings,
  Eye,
  AlertCircle,
} from 'lucide-react';

// Form validation schema for basic info tab
const basicInfoSchema = z.object({
  displayName: z.string().min(1, '显示名称不能为空').max(100, '显示名称最多 100 个字符'),
  description: z.string().max(500, '描述最多 500 个字符').optional(),
  displayField: z.string().min(1, '显示字段不能为空'),
  order: z.number().int().min(0, '排序值不能为负'),
  isActive: z.boolean(),
});

type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

interface LibraryConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  libraryName: string;
  onSuccess?: () => void;
}

export function LibraryConfigDialog({
  open,
  onOpenChange,
  libraryName,
  onSuccess,
}: LibraryConfigDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [schemaViewMode, setSchemaViewMode] = useState<'preview' | 'json'>('preview');
  const [importData, setImportData] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');

  const { data: stats, isLoading: isLoadingStats } = useLibraryStats(libraryName);
  const updateLibrary = useUpdateLibrary();
  const importEntries = useImportEntries();

  const form = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      displayName: stats?.displayName || '',
      description: stats?.description || '',
      displayField: stats?.displayField || 'name',
      order: stats?.order || 0,
      isActive: stats?.isActive ?? true,
    },
  });

  // Update form when stats load
  if (stats && !form.formState.isDirty) {
    form.reset({
      displayName: stats.displayName,
      description: stats.description || '',
      displayField: stats.displayField,
      order: stats.order,
      isActive: stats.isActive,
    });
  }

  const handleBasicInfoSubmit = async (data: BasicInfoFormData) => {
    try {
      await updateLibrary.mutateAsync({
        name: libraryName,
        data: {
          displayName: data.displayName,
          description: data.description,
          displayField: data.displayField,
          order: data.order,
          isActive: data.isActive,
        },
      });
      onSuccess?.();
    } catch (error) {
      console.error('Update library error:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/libraries/${libraryName}/export?format=object&pretty=true`
      );
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${libraryName}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) return;

    try {
      const data = JSON.parse(importData);
      await importEntries.mutateAsync({
        libraryName,
        data,
        mode: importMode,
      });
      setImportData('');
      onSuccess?.();
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>库配置 - {stats?.displayName || libraryName}</DialogTitle>
          <DialogDescription>
            配置库的基本信息、字段结构、数据导入导出等
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="gap-2">
              <Settings className="h-4 w-4" />
              基本信息
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-2">
              <Code className="h-4 w-4" />
              字段结构
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
              <FileJson className="h-4 w-4" />
              数据管理
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              统计信息
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Basic Information */}
          <TabsContent value="basic" className="flex-1 overflow-auto space-y-4 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleBasicInfoSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>显示名称 *</FormLabel>
                      <FormControl>
                        <Input placeholder="人物" {...field} />
                      </FormControl>
                      <FormDescription>在界面中显示的中文名称</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="displayField"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>显示字段 *</FormLabel>
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

                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>排序值</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormDescription>
                        控制库在侧边栏中的显示顺序（数字越小越靠前）
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">启用状态</FormLabel>
                        <FormDescription>
                          禁用后，该库将不会在侧边栏中显示（不影响已有数据）
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={updateLibrary.isPending}>
                    {updateLibrary.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    保存
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Tab 2: Schema Editor */}
          <TabsContent value="schema" className="flex-1 overflow-auto space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {stats?.structureType === 'nested_array' ? '嵌套数组' : '标准对象'}
                </Badge>
                <Badge variant="secondary">Schema Version: {stats?.schemaVersion}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSchemaViewMode(schemaViewMode === 'preview' ? 'json' : 'preview')
                  }
                >
                  {schemaViewMode === 'preview' ? (
                    <>
                      <Code className="mr-2 h-4 w-4" />
                      JSON 编辑器
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      预览
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Schema 编辑器功能即将推出。当前版本仅支持查看字段结构。
              </AlertDescription>
            </Alert>

            {schemaViewMode === 'preview' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">字段结构预览</CardTitle>
                  <CardDescription>当前库的字段定义</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">
                    {JSON.stringify(stats?.metadata || {}, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">JSON 编辑器</CardTitle>
                  <CardDescription>编辑字段结构（即将推出）</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="font-mono text-xs resize-none"
                    rows={15}
                    disabled
                    value={JSON.stringify(stats?.metadata || {}, null, 2)}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 3: Data Management */}
          <TabsContent value="data" className="flex-1 overflow-auto space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Export Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    导出数据
                  </CardTitle>
                  <CardDescription>将当前库的所有条目导出为 JSON 文件</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExport} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    下载 JSON 文件
                  </Button>
                </CardContent>
              </Card>

              {/* Import Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    导入数据
                  </CardTitle>
                  <CardDescription>从 JSON 文件导入条目</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={(e) => setImportMode(e.target.value as 'merge')}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">合并</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={(e) => setImportMode(e.target.value as 'replace')}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">替换</span>
                    </label>
                  </div>
                  <Textarea
                    placeholder="粘贴 JSON 数据..."
                    className="font-mono text-xs resize-none"
                    rows={10}
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                  />
                  <Button
                    onClick={handleImport}
                    className="w-full"
                    disabled={!importData.trim() || importEntries.isPending}
                  >
                    {importEntries.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Upload className="mr-2 h-4 w-4" />
                    导入
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>导入提示：</strong>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                  <li>合并模式：保留现有条目，只添加或更新新条目</li>
                  <li>替换模式：删除所有现有条目，使用导入的数据</li>
                  <li>
                    支持对象格式 {`{id: {...}}`} 和数组格式 {`[{...}]`}，系统会自动识别
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Tab 4: Statistics */}
          <TabsContent value="stats" className="flex-1 overflow-auto space-y-4 mt-4">
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">基本信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">库名称:</span>
                      <Badge variant="outline">{stats.name}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">显示名称:</span>
                      <span className="font-medium">{stats.displayName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">分类:</span>
                      <span>{stats.category || '未分类'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">状态:</span>
                      <Badge variant={stats.isActive ? 'default' : 'secondary'}>
                        {stats.isActive ? '启用' : '禁用'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">数据统计</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">条目数量:</span>
                      <span className="font-medium text-lg">{stats.entryCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">结构类型:</span>
                      <Badge variant="outline">
                        {stats.structureType === 'nested_array' ? '嵌套数组' : '标准对象'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Schema 版本:</span>
                      <span>{stats.schemaVersion}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm">时间信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">创建时间:</span>
                      <span>{new Date(stats.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">最后更新:</span>
                      <span>{new Date(stats.updatedAt).toLocaleString('zh-CN')}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
