'use client';

/**
 * Library Management Page
 * Main page for managing all library data
 */

import { useState } from 'react';
import { useLibraryConfig } from '@/hooks/use-libraries';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Database, Search, Plus, Settings } from 'lucide-react';
import { LibraryTable } from '@/components/library/library-table';
import { useDebounce } from '@/hooks/use-debounce';

export default function LibrariesPage() {
  const { data: config, isLoading, error } = useLibraryConfig();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [activeLibrary, setActiveLibrary] = useState<string | null>(null);

  // Set first library as active when data loads
  if (config && !activeLibrary && config.enabled_libraries.length > 0) {
    setActiveLibrary(config.enabled_libraries[0].name);
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" text="加载库配置..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>加载失败</AlertTitle>
        <AlertDescription>
          无法加载库配置。请稍后重试或检查网络连接。
        </AlertDescription>
      </Alert>
    );
  }

  if (!config || config.enabled_libraries.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="暂无库"
        description="系统中没有配置任何库。请检查配置文件。"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">库管理</h1>
          <p className="text-muted-foreground">
            管理所有数据库的内容，包括人物、姿态、场景、主题和画风
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Database className="h-3 w-3" />
            {config.total_count} 个库
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            配置
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索库条目 (ID, 名称, 描述...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Library Tabs */}
      <Tabs
        value={activeLibrary || undefined}
        onValueChange={setActiveLibrary}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-6">
          {config.enabled_libraries
            .sort((a, b) => a.order - b.order)
            .map((lib) => (
              <TabsTrigger key={lib.name} value={lib.name} className="gap-2">
                <Database className="h-4 w-4" />
                {lib.displayName}
                {lib.type === 'required' && (
                  <span className="text-xs text-destructive">*</span>
                )}
              </TabsTrigger>
            ))}
        </TabsList>

        {config.enabled_libraries.map((lib) => (
          <TabsContent key={lib.name} value={lib.name} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {lib.displayName}
                      <Badge variant={lib.type === 'required' ? 'default' : 'secondary'}>
                        {lib.type === 'required' ? '必填' : '可选'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      管理 {lib.displayName} 库的所有条目
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    新增条目
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <LibraryTable
                  libraryName={lib.name}
                  displayField={lib.displayField}
                  searchQuery={debouncedSearch}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
