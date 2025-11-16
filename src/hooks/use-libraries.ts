/**
 * Library Management Hooks
 * React Query hooks for library CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys, invalidateQueries } from '@/lib/api/query-client';
import { useToast } from '@/hooks/use-toast';

// Types
export interface LibraryConfig {
  name: string;
  displayName: string;
  displayField: string;
  type: 'required' | 'optional';
  order: number;
  structureType: 'standard' | 'nested_array';
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

interface LibraryConfigResponse {
  enabled_libraries: LibraryConfig[];
  total_count: number;
}

/**
 * Hook to fetch library configuration
 */
export function useLibraryConfig() {
  return useQuery<LibraryConfigResponse>({
    queryKey: queryKeys.libraries.config(),
    queryFn: () => api.get<LibraryConfigResponse>('/api/libraries/config'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single library's data
 */
export function useLibrary(libraryName: string) {
  return useQuery<Library>({
    queryKey: queryKeys.libraries.list(libraryName),
    queryFn: () => api.get<Library>(`/api/libraries/${libraryName}`),
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
    }) => api.post(`/api/libraries/${libraryName}`, { entry }),
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
    }) => api.put(`/api/libraries/${libraryName}/${entryId}`, { entry }),
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
