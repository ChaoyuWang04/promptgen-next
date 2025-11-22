/**
 * React Query Hooks for Combination Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type {
  Combination,
  CombinationListResponse,
  CombinationWithRecords,
  StrategyGenerationRequest,
} from '@/schemas/combination.schema';

// Query keys for cache management
export const combinationKeys = {
  all: ['combinations'] as const,
  lists: () => [...combinationKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) =>
    [...combinationKeys.lists(), filters] as const,
  details: () => [...combinationKeys.all, 'detail'] as const,
  detail: (id: string) => [...combinationKeys.details(), id] as const,
};

// API base URL
const API_BASE = '/api/combinations';

// Types for API responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface GenerateVariantResponse {
  record: {
    id: string;
    imageId: string;
    variantNumber: number;
  };
  variant: any;
  provider: string;
  totalTimeMs: number;
}

interface GenerateLanguageResponse {
  language: string;
  path: string;
  cached: boolean;
}

interface StrategyGenerationResponse {
  total: number;
  created: number;
  skipped: number;
  createdKeys: string[];
  skippedKeys: string[];
}

// Fetch helpers
async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data;
}

// ========================================
// Query Hooks
// ========================================

/**
 * Hook to fetch combinations list with filters
 */
export function useCombinations(filters: {
  templateId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  libraryFilters?: Record<string, string>;
} = {}) {
  return useQuery({
    queryKey: combinationKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.templateId) params.set('templateId', filters.templateId);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

      // Add library filters
      if (filters.libraryFilters) {
        for (const [key, value] of Object.entries(filters.libraryFilters)) {
          params.set(`library_${key}`, value);
        }
      }

      const url = `${API_BASE}?${params.toString()}`;
      const response = await fetchApi<CombinationListResponse>(url);
      return response.data!;
    },
  });
}

/**
 * Hook to fetch a single combination with all records and variants
 */
export function useCombination(id: string | null) {
  return useQuery({
    queryKey: combinationKeys.detail(id || ''),
    queryFn: async () => {
      const response = await fetchApi<CombinationWithRecords>(
        `${API_BASE}/${id}`
      );
      return response.data!;
    },
    enabled: !!id,
  });
}

// ========================================
// Mutation Hooks
// ========================================

/**
 * Hook to generate a new variant for a combination
 */
export function useGenerateVariant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (combinationId: string) => {
      const response = await fetchApi<GenerateVariantResponse>(
        `${API_BASE}/${combinationId}/generate`,
        { method: 'POST' }
      );
      return response.data!;
    },
    onSuccess: (data, combinationId) => {
      // Invalidate the combination detail to refresh variants
      queryClient.invalidateQueries({
        queryKey: combinationKeys.detail(combinationId),
      });

      toast({
        title: '变体生成成功',
        description: `v${data.record.variantNumber} 已生成 (${Math.round(data.totalTimeMs / 1000)}s)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '变体生成失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to generate a language version of a final image
 */
export function useGenerateLanguage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      combinationId,
      variantId,
      language,
    }: {
      combinationId: string;
      variantId: string;
      language: string;
    }) => {
      const response = await fetchApi<GenerateLanguageResponse>(
        `${API_BASE}/${combinationId}/variants/${variantId}/language`,
        {
          method: 'POST',
          body: JSON.stringify({ language }),
        }
      );
      return response.data!;
    },
    onSuccess: (data, variables) => {
      // Invalidate the combination detail to refresh variants
      queryClient.invalidateQueries({
        queryKey: combinationKeys.detail(variables.combinationId),
      });

      if (!data.cached) {
        toast({
          title: '语言版本生成成功',
          description: `${data.language.toUpperCase()} 版本已生成`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: '语言版本生成失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to generate combinations from strategy
 */
export function useGenerateCombinations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: StrategyGenerationRequest) => {
      const response = await fetchApi<StrategyGenerationResponse>(
        `${API_BASE}/strategy`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );
      return response.data!;
    },
    onSuccess: (data) => {
      // Invalidate all combination lists
      queryClient.invalidateQueries({
        queryKey: combinationKeys.lists(),
      });

      toast({
        title: '组合生成成功',
        description: `创建了 ${data.created} 个组合 (${data.skipped} 个已存在)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '组合生成失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a combination
 */
export function useDeleteCombination() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await fetchApi(`${API_BASE}/${id}`, { method: 'DELETE' });
      return id;
    },
    onSuccess: () => {
      // Invalidate all combination lists
      queryClient.invalidateQueries({
        queryKey: combinationKeys.lists(),
      });

      toast({
        title: '删除成功',
        description: '组合已删除',
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
 * Hook to create a single combination
 */
export function useCreateCombination() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      libraryIds: Record<string, string>;
      templateId?: string;
    }) => {
      const response = await fetchApi<Combination>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data!;
    },
    onSuccess: (data) => {
      // Invalidate all combination lists
      queryClient.invalidateQueries({
        queryKey: combinationKeys.lists(),
      });

      toast({
        title: '组合创建成功',
        description: `已创建: ${data.combinationKey}`,
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
 * ============================================================
 * NEW: Strategy Generation v2 Hooks (Multi-Select Support)
 * ============================================================
 */

export interface LibrarySummary {
  library: string;
  displayName: string;
  selectedCount: number;
  totalCount: number;
  isAll: boolean;
  selectedElements: Array<{ id: string; name: string }> | null;
}

export interface PreviewCombinationsRequest {
  templateId: string;
  strategyConfig: Record<string, string[]>;
}

export interface PreviewCombinationsResponse {
  templateId: string;
  templateName: string;
  templateCategory: 'MAIN' | 'DIFF';
  totalCombinations: number;
  librarySummary: LibrarySummary[];
  strategyConfig: Record<string, string[]>;
}

/**
 * Hook to preview combination count without generating
 *
 * @example
 * const preview = usePreviewCombinations();
 * preview.mutate({
 *   templateId: 'template_main_v1',
 *   strategyConfig: {
 *     character: ['char_betty_v1'],
 *     theme: ['theme_christmas_v1', 'theme_halloween_v1'],
 *     scene: [], // empty = all
 *   }
 * });
 */
export function usePreviewCombinations() {
  return useMutation({
    mutationFn: async (request: PreviewCombinationsRequest) => {
      const response = await fetchApi<PreviewCombinationsResponse>(
        `${API_BASE}/preview`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );
      return response.data!;
    },
  });
}
