'use client';

/**
 * Entry Form Dialog Component
 *
 * Unified JSON editor dialog for creating or editing library entries:
 * - Real-time ID and name preview from JSON
 * - Monaco JSON editor with schema validation
 * - Template loading for new entries
 * - Format and load template buttons
 */

import { useState, useEffect, useMemo } from 'react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { JsonEntryEditor } from '@/components/library/json-entry-editor';
import {
  getFormattedExampleJson,
  getLibraryTemplate,
  type LibraryType,
} from '@/lib/utils/monaco-schema-provider';
import {
  useLibraryEntry,
  useCreateLibraryEntry,
  useUpdateLibraryEntry,
  useLibraryStats,
  type LibraryEntry,
} from '@/hooks/use-libraries';
import {
  generateFormattedTemplateFromSchema,
  canGenerateTemplate,
} from '@/lib/utils/schema-template-generator';
import { Loader2, Save, Code, FileJson } from 'lucide-react';
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
  const [jsonData, setJsonData] = useState('');

  const isEditMode = !!entryId;

  // Fetch existing entry if in edit mode
  const { data: existingEntry, isLoading: isLoadingEntry } = useLibraryEntry(
    libraryName,
    entryId || ''
  );

  // Fetch library stats (includes schema and structureType)
  const { data: libraryStats } = useLibraryStats(libraryName);

  const createMutation = useCreateLibraryEntry();
  const updateMutation = useUpdateLibraryEntry();

  // Get library template information
  const libraryTemplate = useMemo(
    () => getLibraryTemplate(libraryName as LibraryType),
    [libraryName]
  );

  // Real-time preview: parse JSON to extract ID and display name
  const previewInfo = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonData);

      // Get display field based on library type
      const displayField = libraryTemplate?.displayField || 'name';

      return {
        id: parsed.id || '',
        name: parsed[displayField] || '',
        isValid: true,
        error: null,
      };
    } catch (error) {
      return {
        id: '',
        name: '',
        isValid: false,
        error: error instanceof Error ? error.message : 'JSON格式错误',
      };
    }
  }, [jsonData, libraryTemplate]);

  // Load existing entry data when editing
  useEffect(() => {
    if (isEditMode && existingEntry) {
      setJsonData(JSON.stringify(existingEntry, null, 2));
    }
  }, [isEditMode, existingEntry]);

  // Load template JSON for create mode
  useEffect(() => {
    if (!isEditMode && open && !jsonData) {
      try {
        // Priority 1: Generate from database schema if available
        if (libraryStats?.schema && canGenerateTemplate(libraryStats.schema)) {
          const template = generateFormattedTemplateFromSchema(
            libraryStats.schema,
            libraryStats.structureType
          );
          setJsonData(template);
          return;
        }

        // Priority 2: Fallback to static hardcoded template
        const staticTemplate = getFormattedExampleJson(libraryName as LibraryType);
        if (staticTemplate) {
          setJsonData(staticTemplate);
        }
      } catch (error) {
        console.error('Failed to load initial template:', error);
        // Fallback to static template on error
        const staticTemplate = getFormattedExampleJson(libraryName as LibraryType);
        if (staticTemplate) {
          setJsonData(staticTemplate);
        }
      }
    }
  }, [isEditMode, open, libraryName, jsonData, libraryStats]);

  // Format JSON
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonData);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonData(formatted);
    } catch (error) {
      // If JSON is invalid, keep as is
      console.warn('Cannot format invalid JSON');
    }
  };

  // Load template JSON (direct override)
  const handleLoadTemplate = () => {
    try {
      // Priority 1: Generate from database schema if available
      if (libraryStats?.schema && canGenerateTemplate(libraryStats.schema)) {
        const template = generateFormattedTemplateFromSchema(
          libraryStats.schema,
          libraryStats.structureType
        );
        setJsonData(template);
        return;
      }

      // Priority 2: Fallback to static hardcoded template
      const staticTemplate = getFormattedExampleJson(libraryName as LibraryType);
      if (staticTemplate) {
        setJsonData(staticTemplate);
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      // Fallback to static template on error
      const staticTemplate = getFormattedExampleJson(libraryName as LibraryType);
      if (staticTemplate) {
        setJsonData(staticTemplate);
      }
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    try {
      // Validate and parse JSON
      const parsedData = JSON.parse(jsonData);

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
      console.error('Submit error:', error);
      // Error will be shown in JsonEntryEditor validation
    }
  };

  const handleClose = () => {
    setJsonData('');
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Loading state
  if (isEditMode && isLoadingEntry) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <VisuallyHidden.Root>
            <DialogTitle>加载中</DialogTitle>
          </VisuallyHidden.Root>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[80vw] h-[90vh] flex flex-col gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? '编辑条目' : '新增条目'}
            {libraryTemplate && (
              <span className="ml-2 text-muted-foreground font-normal text-sm">
                {libraryTemplate.displayName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Preview Area: ID | Name */}
        <div className="flex items-center gap-4 px-4 py-3 bg-muted/30 rounded-lg border">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-muted-foreground">ID:</span>
            <span
              className={cn(
                'ml-2 text-sm font-mono truncate inline-block max-w-[200px]',
                previewInfo.isValid && previewInfo.id
                  ? 'text-foreground'
                  : 'text-muted-foreground/50'
              )}
              title={previewInfo.id || '未设置'}
            >
              {previewInfo.id || '未设置'}
            </span>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-muted-foreground">名称:</span>
            <span
              className={cn(
                'ml-2 text-sm truncate inline-block max-w-[200px]',
                previewInfo.isValid && previewInfo.name
                  ? 'text-foreground'
                  : 'text-muted-foreground/50'
              )}
              title={previewInfo.name || '未设置'}
            >
              {previewInfo.name || '未设置'}
            </span>
          </div>

          {!previewInfo.isValid && previewInfo.error && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <Badge variant="destructive" className="text-xs shrink-0">
                {previewInfo.error}
              </Badge>
            </>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex gap-2">
          <Button onClick={handleFormat} variant="outline" size="sm" type="button">
            <Code className="mr-2 h-4 w-4" />
            格式化JSON
          </Button>
          <Button onClick={handleLoadTemplate} variant="outline" size="sm" type="button">
            <FileJson className="mr-2 h-4 w-4" />
            加载库标准配置JSON
          </Button>
        </div>

        {/* JSON Editor - Takes remaining space */}
        <div className="flex-1 min-h-0">
          <JsonEntryEditor
            libraryType={libraryName as LibraryType}
            value={jsonData}
            onChange={setJsonData}
            height="100%"
            showFormatButton={false}
            showExampleButton={false}
            compact={true}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!previewInfo.isValid || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isEditMode ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
