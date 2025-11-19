'use client';

/**
 * Library Management Page
 * Refactored with sidebar layout for dynamic library management
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLibraryConfig } from '@/hooks/use-libraries';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Database, Search, Plus, Settings } from 'lucide-react';
import { LibraryTable } from '@/components/library/library-table';
import { LibrarySidebar, type LibraryItem } from '@/components/library/library-sidebar';
import { CreateLibraryDialog } from '@/components/library/create-library-dialog';
import { LibraryConfigDialog } from '@/components/library/library-config-dialog';
import { EntryFormDialog } from '@/components/library/entry-form-dialog';
import { EntryDetailDialog } from '@/components/library/entry-detail-dialog';
import { useDebounce } from '@/hooks/use-debounce';

export default function LibrariesPage() {
  const { data: config, isLoading, error, refetch } = useLibraryConfig();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);

  // Transform config to LibraryItem[] for sidebar
  const libraries = useMemo<LibraryItem[]>(() => {
    if (!config?.enabled_libraries) return [];
    return config.enabled_libraries.map((lib) => ({
      name: lib.name,
      displayName: lib.displayName,
      entryCount: lib.entryCount,
      isActive: lib.isActive,
      order: lib.order,
    }));
  }, [config]);

  // Set first library as selected when data loads
  useEffect(() => {
    if (libraries.length > 0 && !selectedLibrary) {
      setSelectedLibrary(libraries[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraries]); // Only run when libraries data changes, not when selectedLibrary changes

  // Get currently selected library details
  const currentLibrary = useMemo(() => {
    if (!selectedLibrary || !config) return null;
    return config.enabled_libraries.find((lib) => lib.name === selectedLibrary);
  }, [selectedLibrary, config]);

  const handleCreateSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleConfigClick = useCallback(() => {
    setConfigDialogOpen(true);
  }, []);

  const handleAddEntryClick = useCallback(() => {
    setEditingEntryId(null); // null = create mode
    setEntryDialogOpen(true);
  }, []);

  const handleEntrySuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleViewEntry = useCallback((entryId: string) => {
    setViewingEntryId(entryId);
    setDetailDialogOpen(true);
  }, []);

  const handleEditEntry = useCallback((entryId: string) => {
    setEditingEntryId(entryId);
    setEntryDialogOpen(true);
  }, []);

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

  if (!config || libraries.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">库管理</h1>
            <p className="text-muted-foreground">
              管理所有数据库的内容，包括人物、姿态、场景、主题和画风
            </p>
          </div>
        </div>
        <EmptyState
          icon={Database}
          title="暂无库"
          description="系统中没有配置任何库。点击下方按钮创建第一个库。"
          action={{
            label: '创建库',
            onClick: () => setCreateDialogOpen(true),
          }}
        />
        <CreateLibraryDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={handleCreateSuccess}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">库管理</h1>
          <p className="text-muted-foreground">
            管理所有数据库的内容，包括人物、姿态、场景、主题和画风
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Database className="h-3 w-3" />
          {config.total_count} 个库
        </Badge>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left Sidebar */}
        <LibrarySidebar
          libraries={libraries}
          selectedLibrary={selectedLibrary}
          onSelectLibrary={setSelectedLibrary}
          onCreateLibrary={() => setCreateDialogOpen(true)}
          isLoading={isLoading}
        />

        {/* Main Content Area */}
        <div className="flex-1 space-y-4 overflow-auto">
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

          {/* Library Content */}
          {currentLibrary && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {currentLibrary.displayName}
                      <Badge variant={currentLibrary.isActive ? 'default' : 'secondary'}>
                        {currentLibrary.isActive ? '启用' : '禁用'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {currentLibrary.description || `管理 ${currentLibrary.displayName} 库的所有条目`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleConfigClick}>
                      <Settings className="mr-2 h-4 w-4" />
                      配置
                    </Button>
                    <Button onClick={handleAddEntryClick}>
                      <Plus className="mr-2 h-4 w-4" />
                      新增条目
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <LibraryTable
                  libraryName={currentLibrary.name}
                  displayField={currentLibrary.displayField}
                  searchQuery={debouncedSearch}
                  onView={handleViewEntry}
                  onEdit={handleEditEntry}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Library Dialog */}
      <CreateLibraryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Library Config Dialog */}
      {selectedLibrary && (
        <LibraryConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          libraryName={selectedLibrary}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Entry Form Dialog (Create/Edit) */}
      {selectedLibrary && (
        <EntryFormDialog
          open={entryDialogOpen}
          onOpenChange={setEntryDialogOpen}
          libraryName={selectedLibrary}
          entryId={editingEntryId}
          onSuccess={handleEntrySuccess}
        />
      )}

      {/* Entry Detail Dialog (View) */}
      {selectedLibrary && viewingEntryId && (
        <EntryDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          libraryName={selectedLibrary}
          entryId={viewingEntryId}
          onEdit={handleEditEntry}
        />
      )}
    </div>
  );
}
