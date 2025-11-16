/**
 * Prompt Generation Hooks
 * React Query hooks for prompt generation operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-client';
import { useToast } from '@/hooks/use-toast';

export interface GenerateMainPromptRequest {
  library_ids: {
    character: string;
    pose: string;
    scene: string;
    theme: string;
    style: string;
  };
}

export interface GenerateMainPromptResponse {
  image_id: string;
  prompt_cn: string;
  prompt_en: string;
  library_ids: Record<string, string>;
}

export interface GenerateDiffPromptRequest {
  image_id: string;
  library_ids?: {
    pose?: string;
    scene?: string;
    style?: string;
  };
  custom_changes?: {
    color_changes?: Array<{ element: string; new_color: string }>;
    decorations?: string[];
  };
}

export interface GenerateDiffPromptResponse {
  diff_id: string;
  image_id: string;
  prompt_cn: string;
  prompt_en: string;
  changes: {
    color_changes: number;
    decorations_added: number;
  };
}

/**
 * Hook to generate main prompt
 */
export function useGenerateMainPrompt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: GenerateMainPromptRequest) =>
      api.post<GenerateMainPromptResponse>('/api/prompts/generate/main', request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.records.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all });
      toast({
        title: '主图Prompt生成成功',
        description: `Image ID: ${data.image_id}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '生成失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to generate diff prompt
 */
export function useGenerateDiffPrompt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: GenerateDiffPromptRequest) =>
      api.post<GenerateDiffPromptResponse>('/api/prompts/generate/diff', request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.records.detail(data.image_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all });
      toast({
        title: '对比图Prompt生成成功',
        description: `修改了 ${data.changes.color_changes} 处颜色，添加了 ${data.changes.decorations_added} 个装饰`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '生成失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
