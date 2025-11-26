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
  imageIds: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  completed: number;
  failed: number;
  totalImages: number;
  createdAt: string;
  updatedAt: string;
}

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

export interface GenerateSingleRequest {
  imageId: string;
  languageIds?: number[];
  overwrite?: boolean;
}

export interface GenerateBatchRequest {
  // Direct mode: Provide imageIds array
  imageIds?: string[];

  // Filter mode: Use library filters to enumerate combinations
  libraryFilter?: {
    character?: string[];
    pose?: string[];
    scene?: string[];
    theme?: string[];
    style?: string[];
  };

  // For filter mode: Which combinations to generate
  mode?: 'all' | 'ungenerated' | 'unimaged';

  // Generation options
  languageIds?: number[];
  concurrency?: number;
  continueOnError?: boolean;
}

export interface ManualStitchRequest {
  imageId: string;
  version?: string;
  languageIds?: number[];
}

/**
 * Hook to fetch image statistics
 */
export function useImageStats() {
  return useQuery<ImageStats>({
    queryKey: queryKeys.images.stats(),
    queryFn: async () => {
      // API returns snake_case fields
      const apiResponse = await api.get<{
        total_records: number;
        completed_images: number;
        pending_images: number;
        total_variants: number;
        recent_images_7d: number;
        by_provider: Record<string, number>;
      }>('/api/images/stats');

      // Transform to expected format
      return {
        total_images: apiResponse.total_records || 0,
        completed: apiResponse.completed_images || 0,
        pending: apiResponse.pending_images || 0,
        failed: 0, // Not provided by API yet
        by_provider: apiResponse.by_provider || {},
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to fetch image batches
 */
export function useImageBatches() {
  return useQuery<ImageBatch[]>({
    queryKey: queryKeys.images.batches(),
    queryFn: async () => {
      // API returns {batches: [], pagination: {...}}
      const apiResponse = await api.get<{
        batches: ImageBatch[];
        pagination: any;
      }>('/api/images/batches');

      // Return just the batches array
      return apiResponse.batches || [];
    },
  });
}

/**
 * Hook to fetch batch progress
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
    refetchInterval: 2000, // Poll every 2 seconds when active
  });
}

/**
 * Hook to generate a single image
 */
export function useGenerateSingle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: GenerateSingleRequest) =>
      api.post<{
        success: boolean;
        data: {
          imageId: string;
          version: string;
          provider: string;
          paths: Record<string, string>;
          totalTimeMs: number;
          languagesGenerated: number;
        };
        message: string;
      }>('/api/images/generate/single', request),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.all });
      toast({
        title: 'Image Generated',
        description: `Successfully generated ${response.data.languagesGenerated} language variant(s) for ${variables.imageId}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to generate batch of images
 * Starts batch generation and returns batchId for progress tracking
 */
export function useGenerateBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: GenerateBatchRequest) =>
      api.post<{
        batchId: string;
        totalImages: number;
        status: string;
        queuedJobs: number;
      }>('/api/images/generate/batch', request),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.batches() });
      // Don't show toast here - let the caller handle it
      // This allows customized messages based on context
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
 * Hook to manually stitch existing images
 */
export function useManualStitch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: ManualStitchRequest) =>
      api.post<{
        success: boolean;
        data: {
          imageId: string;
          version: string;
          paths: Record<string, string>;
          languagesGenerated: number;
        };
        message: string;
      }>('/api/images/stitch', request),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.all });
      toast({
        title: 'Stitch Complete',
        description: `Successfully stitched ${response.data.languagesGenerated} language variant(s) for ${variables.imageId}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Stitch Failed',
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
