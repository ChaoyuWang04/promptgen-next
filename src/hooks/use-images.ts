/**
 * Image Management Hooks
 * React Query hooks for image generation and batch operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-client';
import { useToast } from '@/hooks/use-toast';

export interface ImageStats {
  total_images: number;
  pending: number;
  completed: number;
  failed: number;
  by_provider: Record<string, number>;
}

export interface ImageBatch {
  id: string;
  image_ids: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completed: number;
  failed: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface BatchProgress {
  batch_id: string;
  status: string;
  completed: number;
  failed: number;
  total: number;
  current_image_id?: string;
  current_provider?: string;
}

export interface GenerateBatchRequest {
  language_id?: number;
  provider?: string;
  library_filter?: {
    character_ids?: string[];
    pose_ids?: string[];
    scene_ids?: string[];
    theme_ids?: string[];
    style_ids?: string[];
  };
}

/**
 * Hook to fetch image statistics
 */
export function useImageStats() {
  return useQuery<ImageStats>({
    queryKey: queryKeys.images.stats(),
    queryFn: () => api.get<ImageStats>('/api/images/stats'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to fetch image batches
 */
export function useImageBatches() {
  return useQuery<ImageBatch[]>({
    queryKey: queryKeys.images.batches(),
    queryFn: () => api.get<ImageBatch[]>('/api/images/batches'),
  });
}

/**
 * Hook to fetch batch progress
 */
export function useBatchProgress(batchId: string | null) {
  return useQuery<BatchProgress>({
    queryKey: queryKeys.images.batchProgress(batchId || ''),
    queryFn: () => api.get<BatchProgress>(`/api/images/batches/${batchId}/progress`),
    enabled: !!batchId,
    refetchInterval: 2000, // Poll every 2 seconds when active
  });
}

/**
 * Hook to generate batch of images
 */
export function useGenerateBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: GenerateBatchRequest) =>
      api.post<{ batch_id: string; total: number }>('/api/images/generate/batch', request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.batches() });
      toast({
        title: '批量生成已开始',
        description: `共 ${data.total} 个图片，批次ID: ${data.batch_id}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '批量生成失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to retry failed images
 */
export function useRetryFailed() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => api.post<{ count: number }>('/api/images/retry-failed'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.all });
      toast({
        title: '重试已开始',
        description: `正在重试 ${data.count} 个失败的图片`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '重试失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
