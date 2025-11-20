/**
 * Library Management Hooks
 * React Query hooks for library CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys, invalidateQueries } from '@/lib/api/query-client';
import { useToast } from '@/hooks/use-toast';
import { getTemplateByName } from '@/lib/templates/library-templates';

// Types
export interface LibraryConfig {
  name: string;
  displayName: string;
  displayField: string;
  type: 'required' | 'optional';
  order: number;
  structureType: 'standard' | 'nested_array';
  description?: string;
}

export interface LibraryEntry {
  id: string;
  [key: string]: unknown;
}

export interface Library {
  name: string;
  displayName: string;
  entries: Record<string, LibraryEntry>;
  schema?: Record<string, unknown>;
}

interface LibraryConfigApiResponse {
  enabled_libraries: Array<{
    name: string;
    display_name: string;
    display_field: string;
    type: 'required' | 'optional';
    order: number;
    structure_type: 'standard' | 'nested_array';
    description?: string;
    is_active: boolean;
    entry_count: number;
  }>;
  total_count: number;
}

interface LibraryConfigResponse {
  enabled_libraries: Array<LibraryConfig & { entryCount: number; isActive: boolean }>;
  total_count: number;
}

/**
 * Hook to fetch library configuration
 */
export function useLibraryConfig() {
  return useQuery<LibraryConfigResponse>({
    queryKey: queryKeys.libraries.config(),
    queryFn: async () => {
      const response = await api.get<LibraryConfigApiResponse>('/api/libraries/config');
      // Transform snake_case API response to camelCase for frontend
      return {
        enabled_libraries: response.enabled_libraries.map((lib) => ({
          name: lib.name,
          displayName: lib.display_name,
          displayField: lib.display_field,
          type: lib.type,
          order: lib.order,
          structureType: lib.structure_type,
          description: lib.description,
          isActive: lib.is_active,
          entryCount: lib.entry_count,
        })),
        total_count: response.total_count,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single library's data
 */
export function useLibrary(libraryName: string) {
  return useQuery<Library>({
    queryKey: queryKeys.libraries.list(libraryName),
    queryFn: async () => {
      // API returns just the entries object
      const rawEntries = await api.get<any>(`/api/libraries/${libraryName}`);

      // Transform nested_array structure (decorative_props) to standard object format
      let entries: Record<string, LibraryEntry>;

      if (rawEntries.common_props && Array.isArray(rawEntries.common_props)) {
        // Convert array to object keyed by id
        entries = rawEntries.common_props.reduce((acc: Record<string, LibraryEntry>, item: LibraryEntry) => {
          acc[item.id] = item;
          return acc;
        }, {});
      } else {
        // Standard object structure
        entries = rawEntries;
      }

      // Transform to Library format expected by components
      return {
        name: libraryName,
        displayName: libraryName, // Will be properly set from config if needed
        entries,
      };
    },
    enabled: !!libraryName,
  });
}

/**
 * Hook to fetch a single library entry
 */
export function useLibraryEntry(libraryName: string, entryId: string) {
  return useQuery<LibraryEntry>({
    queryKey: queryKeys.libraries.detail(libraryName, entryId),
    queryFn: () => api.get<LibraryEntry>(`/api/libraries/${libraryName}/${entryId}`),
    enabled: !!libraryName && !!entryId,
  });
}

/**
 * Hook to fetch library template (for new entries)
 */
export function useLibraryTemplate(libraryName: string) {
  return useQuery<LibraryEntry>({
    queryKey: queryKeys.libraries.template(libraryName),
    queryFn: () => api.get<LibraryEntry>(`/api/libraries/${libraryName}/template`),
    enabled: !!libraryName,
  });
}

/**
 * Hook to create a new library entry
 */
export function useCreateLibraryEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      libraryName,
      entry,
    }: {
      libraryName: string;
      entry: LibraryEntry;
    }) => {
      // Determine structure type from library template
      const template = getTemplateByName(libraryName);
      const isNestedArray = template?.structureType === 'nested_array';

      if (isNestedArray) {
        // Nested array structure (decorative_props): only send entry_data
        return api.post(`/api/libraries/${libraryName}`, {
          entry_data: entry,
        });
      } else {
        // Standard structure: send entry_id + entry_data
        return api.post(`/api/libraries/${libraryName}`, {
          entry_id: entry.id,
          entry_data: entry,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.libraries.list(variables.libraryName),
      });
      toast({
        title: '创建成功',
        description: `新条目已添加到 ${variables.libraryName} 库`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '创建失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a library entry
 */
export function useUpdateLibraryEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      libraryName,
      entryId,
      entry,
    }: {
      libraryName: string;
      entryId: string;
      entry: Partial<LibraryEntry>;
    }) =>
      api.put(`/api/libraries/${libraryName}/${entryId}`, {
        entry_data: entry,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.libraries.list(variables.libraryName),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.libraries.detail(variables.libraryName, variables.entryId),
      });
      toast({
        title: '更新成功',
        description: `条目已更新`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '更新失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a library entry
 */
export function useDeleteLibraryEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      libraryName,
      entryId,
    }: {
      libraryName: string;
      entryId: string;
    }) => api.delete(`/api/libraries/${libraryName}/${entryId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.libraries.list(variables.libraryName),
      });
      toast({
        title: '删除成功',
        description: `条目已从库中移除`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to validate a library entry
 */
export function useValidateLibraryEntry() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      libraryName,
      entry,
      isNew,
      excludeId,
    }: {
      libraryName: string;
      entry: LibraryEntry;
      isNew?: boolean;
      excludeId?: string;
    }) =>
      api.post<{ valid: boolean; errors: Array<{ field: string; message: string }> }>(
        '/api/libraries/validate',
        {
          library_name: libraryName,
          entry_data: entry,
          is_new: isNew,
          exclude_id: excludeId,
        }
      ),
    onError: (error: Error) => {
      toast({
        title: '验证失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ========================================
// Library Management Hooks (New)
// ========================================

export interface LibraryTemplate {
  name: string;
  displayName: string;
  description: string;
  displayField: string;
  category?: string;
  structureType: 'standard' | 'nested_array';
  schema: Record<string, unknown>;
  exampleEntry: Record<string, unknown>;
}

export interface LibraryStats {
  name: string;
  displayName: string;
  description?: string;
  displayField: string;
  category?: string;
  entryCount: number;
  schemaVersion: string;
  isActive: boolean;
  structureType: 'standard' | 'nested_array';
  order: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  schema?: Record<string, unknown>; // JSON Schema for library entries
}

/**
 * Hook to fetch all library templates
 */
export function useLibraryTemplates() {
  return useQuery<LibraryTemplate[]>({
    queryKey: queryKeys.libraries.templates(),
    queryFn: async () => {
      const templates = await api.get<LibraryTemplate[]>('/api/libraries/templates');
      return templates;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (templates rarely change)
  });
}

/**
 * Hook to create a new library
 */
export function useCreateLibrary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: {
      name: string;
      displayName: string;
      description?: string;
      displayField?: string;
      category?: string;
      order?: number;
      templateName?: string;
      schema?: Record<string, unknown>;
      entries?: Record<string, unknown> | unknown[];
    }) => api.post('/api/libraries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libraries.all() });
      toast({
        title: '创建成功',
        description: '新库已创建',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '创建失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update library metadata
 */
export function useUpdateLibrary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      name,
      data,
    }: {
      name: string;
      data: {
        displayName?: string;
        description?: string;
        displayField?: string;
        category?: string;
        order?: number;
        schema?: Record<string, unknown>;
        isActive?: boolean;
      };
    }) => api.patch(`/api/libraries/${name}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libraries.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.libraries.list(variables.name) });
      toast({
        title: '更新成功',
        description: '库配置已更新',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '更新失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a library
 */
export function useDeleteLibrary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (libraryName: string) => api.delete(`/api/libraries/${libraryName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libraries.all() });
      toast({
        title: '删除成功',
        description: '库已删除',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to fetch library statistics
 */
export function useLibraryStats(libraryName: string) {
  return useQuery<LibraryStats>({
    queryKey: queryKeys.libraries.stats(libraryName),
    queryFn: async () => {
      const stats = await api.get<LibraryStats>(`/api/libraries/${libraryName}/stats`);
      return stats;
    },
    enabled: !!libraryName,
  });
}

/**
 * Hook to import library entries
 */
export function useImportEntries() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      libraryName,
      data,
      mode = 'replace',
    }: {
      libraryName: string;
      data: Record<string, unknown> | unknown[];
      mode?: 'replace' | 'merge';
    }) =>
      api.post(`/api/libraries/${libraryName}/import`, {
        data,
        mode,
      }),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libraries.list(variables.libraryName) });
      const count = (response as any).data?.count || 0;
      toast({
        title: '导入成功',
        description: `成功导入 ${count} 条数据`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '导入失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to bulk delete library entries
 */
export function useBulkDeleteLibraryEntries() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      libraryName,
      entryIds,
    }: {
      libraryName: string;
      entryIds: string[];
    }) =>
      api.post(`/api/libraries/${libraryName}/bulk-delete`, {
        entryIds,
      }),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.libraries.list(variables.libraryName),
      });
      const deletedCount = (response as any).data?.deletedCount || 0;
      toast({
        title: '批量删除成功',
        description: `已成功删除 ${deletedCount} 个条目`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '批量删除失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to reorder libraries by swapping their order values
 */
export function useReorderLibraries() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      library1,
      library2,
    }: {
      library1: string;
      library2: string;
    }) =>
      api.post('/api/libraries/reorder', {
        library1,
        library2,
      }),
    onSuccess: () => {
      // Invalidate all library-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: queryKeys.libraries.all() });
      toast({
        title: '排序已更新',
        description: '库顺序已成功调整',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '排序失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
