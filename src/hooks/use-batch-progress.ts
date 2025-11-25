/**
 * Batch Progress Management Hooks
 * React Query hooks for managing batch generation progress
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-client';
import { useToast } from '@/hooks/use-toast';

export interface BatchProgress {
  batchId: string;
  totalImages: number;
  completed: number;
  failed: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to poll batch progress
 * Polls every 2 seconds until batch is complete or failed
 */
export function useBatchProgress(batchId: string | null) {
  return useQuery<BatchProgress>({
    queryKey: queryKeys.images.batchProgress(batchId || ''),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: BatchProgress }>(
        `/api/images/generate/batch/${batchId}`
      );
      return response.data;
    },
    enabled: !!batchId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling if batch is complete or failed
      if (data?.status === 'COMPLETED' || data?.status === 'FAILED') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
}

/**
 * Hook to cancel running batch
 * Stops the batch generation (queued tasks won't start, running tasks complete)
 */
export function useCancelBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      return api.delete(`/api/images/generate/batch/${batchId}`);
    },
    onSuccess: (_, batchId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.batchProgress(batchId) });
      toast({
        title: '已停止批量生成',
        description: '当前任务已取消，已发出的请求将完成',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '停止失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to retry failed images in batch
 * Retries all failed images in the specified batch
 */
export function useRetryBatchFailed() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      return api.post(`/api/images/generate/batch/${batchId}/retry`);
    },
    onSuccess: (_, batchId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.batchProgress(batchId) });
      toast({
        title: '重试已开始',
        description: '正在重新生成失败的图片',
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
