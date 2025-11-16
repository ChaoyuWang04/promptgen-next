/**
 * TanStack Query Client Configuration
 * Centralized configuration for React Query with optimized defaults
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

const queryConfig: DefaultOptions = {
  queries: {
    // Refetch on window focus for fresh data
    refetchOnWindowFocus: true,

    // Retry failed requests with exponential backoff
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && 'code' in error) {
        const apiError = error as { code: string };
        if (apiError.code.startsWith('4')) return false;
      }
      return failureCount < 2;
    },

    // Stale time: Data considered fresh for 1 minute
    staleTime: 60 * 1000,

    // Cache time: Keep unused data in cache for 5 minutes
    gcTime: 5 * 60 * 1000,

    // Refetch interval for real-time updates (disabled by default)
    refetchInterval: false,
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,
  },
};

export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

/**
 * Query key factories for consistent cache management
 */
export const queryKeys = {
  // Library keys
  libraries: {
    all: ['libraries'] as const,
    config: () => [...queryKeys.libraries.all, 'config'] as const,
    list: (name: string) => [...queryKeys.libraries.all, name] as const,
    detail: (name: string, id: string) => [...queryKeys.libraries.all, name, id] as const,
    template: (name: string) => [...queryKeys.libraries.all, name, 'template'] as const,
  },

  // Record keys
  records: {
    all: ['records'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.records.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.records.all, id] as const,
    variants: (id: string) => [...queryKeys.records.all, id, 'variants'] as const,
  },

  // Prompt keys
  prompts: {
    all: ['prompts'] as const,
    detail: (id: string) => [...queryKeys.prompts.all, id] as const,
  },

  // Template keys
  templates: {
    all: ['templates'] as const,
    list: (type?: 'main' | 'diff', category?: 'system' | 'user') =>
      [...queryKeys.templates.all, 'list', { type, category }] as const,
    detail: (id: string) => [...queryKeys.templates.all, id] as const,
    variables: (type?: 'main' | 'diff') =>
      [...queryKeys.templates.all, 'variables', type] as const,
  },

  // Image keys
  images: {
    all: ['images'] as const,
    stats: () => [...queryKeys.images.all, 'stats'] as const,
    batches: () => [...queryKeys.images.all, 'batches'] as const,
    batchProgress: (batchId: string) =>
      [...queryKeys.images.all, 'batch', batchId, 'progress'] as const,
  },

  // Combination keys
  combinations: {
    all: ['combinations'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.combinations.all, 'list', filters] as const,
    count: (filters?: Record<string, unknown>) =>
      [...queryKeys.combinations.all, 'count', filters] as const,
  },

  // Provider keys
  providers: {
    all: ['providers'] as const,
    status: () => [...queryKeys.providers.all, 'status'] as const,
    stats: () => [...queryKeys.providers.all, 'stats'] as const,
  },

  // Sync keys
  sync: {
    all: ['sync'] as const,
    check: () => [...queryKeys.sync.all, 'check'] as const,
    report: () => [...queryKeys.sync.all, 'report'] as const,
  },

  // Dashboard keys
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
  },
};

/**
 * Helper to invalidate related queries after mutations
 */
export const invalidateQueries = {
  libraries: () => queryClient.invalidateQueries({ queryKey: queryKeys.libraries.all }),
  records: () => queryClient.invalidateQueries({ queryKey: queryKeys.records.all }),
  prompts: () => queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all }),
  templates: () => queryClient.invalidateQueries({ queryKey: queryKeys.templates.all }),
  images: () => queryClient.invalidateQueries({ queryKey: queryKeys.images.all }),
  combinations: () => queryClient.invalidateQueries({ queryKey: queryKeys.combinations.all }),
  providers: () => queryClient.invalidateQueries({ queryKey: queryKeys.providers.all }),
  sync: () => queryClient.invalidateQueries({ queryKey: queryKeys.sync.all }),
  dashboard: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
  all: () => queryClient.invalidateQueries(),
};
