/**
 * Dashboard Data Hooks
 * React Query hooks for fetching dashboard statistics
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-client';

interface DashboardStats {
  libraries: {
    total: number;
    byType: Record<string, number>;
  };
  records: {
    total: number;
    withPrompts: number;
    withImages: number;
  };
  images: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
  templates: {
    total: number;
    system: number;
    user: number;
  };
  providers: {
    gemini: { success: number; failed: number };
    bytedance: { success: number; failed: number };
  };
  recentActivity: Array<{
    id: string;
    type: 'record' | 'image' | 'template';
    action: string;
    timestamp: string;
  }>;
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      // Fetch all necessary data in parallel
      const [libraries, records, imageStats, templates, providers] = await Promise.all([
        api.get<{ enabled_libraries: Array<{ name: string }> }>('/api/libraries/config'),
        api.get<{ records: any[] }>('/api/records'),
        api.get<any>('/api/images/stats'),
        api.get<any>('/api/templates'),
        api.get<any>('/api/providers/stats'),
      ]);

      // Calculate library stats
      const libraryStats = {
        total: libraries.enabled_libraries?.length || 0,
        byType: libraries.enabled_libraries?.reduce((acc: Record<string, number>, lib: any) => {
          const type = lib.type || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}) || {},
      };

      // Calculate record stats
      const recordsArray = Array.isArray(records) ? records : records.records || [];
      const recordStats = {
        total: recordsArray.length,
        withPrompts: recordsArray.filter((r: any) => r.prompts?.length > 0).length,
        withImages: recordsArray.filter((r: any) => r.variants?.length > 0).length,
      };

      // Process image stats
      const imageStatsData = {
        total: imageStats?.total_images || 0,
        pending: imageStats?.pending || 0,
        completed: imageStats?.completed || 0,
        failed: imageStats?.failed || 0,
      };

      // Process template stats
      const templatesArray = Array.isArray(templates) ? templates : templates.templates || [];
      const templateStats = {
        total: templatesArray.length,
        system: templatesArray.filter((t: any) => t.category === 'system').length,
        user: templatesArray.filter((t: any) => t.category === 'user').length,
      };

      // Process provider stats
      const providerStats = {
        gemini: providers?.gemini || { success: 0, failed: 0 },
        bytedance: providers?.bytedance || { success: 0, failed: 0 },
      };

      // Mock recent activity for now
      const recentActivity: DashboardStats['recentActivity'] = [];

      return {
        libraries: libraryStats,
        records: recordStats,
        images: imageStatsData,
        templates: templateStats,
        providers: providerStats,
        recentActivity,
      };
    },
    // Refetch every 30 seconds for real-time updates
    refetchInterval: 30000,
  });
}
