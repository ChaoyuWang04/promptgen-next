/**
 * Template Management Hooks
 * React Query hooks for template CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-client';
import { useToast } from '@/hooks/use-toast';

export interface Template {
  id: string;
  name: string;
  type: 'SYSTEM' | 'USER';
  category: 'MAIN' | 'DIFF';
  content: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  name: string;
  type: string;
  description: string;
  example?: string;
}

export interface TemplateVariableWarning {
  library: string;
  message: string;
}

export interface TemplateVariablesResponse {
  variables: TemplateVariable[];
  warnings: TemplateVariableWarning[];
}

export interface PreviewRequest {
  template_content: string;
  library_ids: Record<string, string>;
  type?: 'MAIN' | 'DIFF';
}

export interface PreviewResponse {
  prompt_cn: string;
  prompt_en: string;
  variables_used: string[];
}

/**
 * Hook to fetch templates list
 */
export function useTemplates(type?: 'SYSTEM' | 'USER', category?: 'MAIN' | 'DIFF') {
  return useQuery<Template[]>({
    queryKey: queryKeys.templates.list(type, category),
    queryFn: () => {
      const params: Record<string, string> = {};
      if (type) params.type = type;
      if (category) params.category = category;
      return api.get<Template[]>('/api/templates', params);
    },
  });
}

/**
 * Hook to fetch a single template
 */
export function useTemplate(id: string) {
  return useQuery<Template>({
    queryKey: queryKeys.templates.detail(id),
    queryFn: () => api.get<Template>(`/api/templates/${id}`),
    enabled: !!id,
  });
}

/**
 * Hook to fetch template variables
 */
export function useTemplateVariables(type: 'MAIN' | 'DIFF' = 'MAIN') {
  return useQuery<TemplateVariablesResponse>({
    queryKey: queryKeys.templates.variables(type),
    queryFn: async () => {
      const response = await fetch(`/api/templates/variables?type=${type}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch variables');
      }

      return {
        variables: result.data || [],
        warnings: result.warnings || [],
      };
    },
  });
}

/**
 * Hook to preview template
 */
export function usePreviewTemplate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: PreviewRequest) =>
      api.post<PreviewResponse>('/api/templates/render', request),
    onError: (error: Error) => {
      toast({
        title: '预览失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to create a template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) =>
      api.post<Template>('/api/templates', template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
      toast({
        title: '创建成功',
        description: '模板已创建',
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
 * Hook to update a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...template }: Partial<Template> & { id: string }) =>
      api.put<Template>(`/api/templates/${id}`, template),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.detail(variables.id) });
      toast({
        title: '更新成功',
        description: '模板已更新',
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
 * Hook to delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
      toast({
        title: '删除成功',
        description: '模板已删除',
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
