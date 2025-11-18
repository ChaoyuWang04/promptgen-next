'use client';

/**
 * Health Status Card Component
 * Displays overall system health with visual indicators
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SystemHealth, HealthStatus } from '@/lib/monitoring/types';
import { CheckCircle2, AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HealthStatusCard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('Failed to fetch system health');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case HealthStatus.HEALTHY:
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case HealthStatus.DEGRADED:
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case HealthStatus.UNHEALTHY:
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: HealthStatus) => {
    const variants: Record<HealthStatus, 'default' | 'destructive' | 'secondary'> = {
      [HealthStatus.HEALTHY]: 'default',
      [HealthStatus.DEGRADED]: 'secondary',
      [HealthStatus.UNHEALTHY]: 'destructive',
    };

    const colors: Record<HealthStatus, string> = {
      [HealthStatus.HEALTHY]: 'bg-green-500 hover:bg-green-600',
      [HealthStatus.DEGRADED]: 'bg-yellow-500 hover:bg-yellow-600',
      [HealthStatus.UNHEALTHY]: 'bg-red-500 hover:bg-red-600',
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">System Health Error</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Failed to fetch health status'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-6 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const health: SystemHealth = data?.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle>System Health</CardTitle>
            {getStatusBadge(health.status)}
          </div>
          <CardDescription>{health.summary}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(health.status)}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Providers */}
          <div className="space-y-2">
            <div className="text-sm font-medium">AI Providers</div>
            <div className="space-y-1">
              {health.providers.map((provider) => (
                <div key={provider.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{provider.providerName}</span>
                  <div className="flex items-center gap-2">
                    {provider.status === HealthStatus.HEALTHY ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={provider.status === HealthStatus.HEALTHY ? 'text-green-600' : 'text-red-600'}>
                      {provider.status === HealthStatus.HEALTHY ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Database */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Database</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">PostgreSQL</span>
              <div className="flex items-center gap-2">
                {health.database.status === HealthStatus.HEALTHY ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={health.database.status === HealthStatus.HEALTHY ? 'text-green-600' : 'text-red-600'}>
                  {health.database.responseTime}ms
                </span>
              </div>
            </div>
          </div>

          {/* Queue */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Job Queue</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  {health.queue.status === HealthStatus.HEALTHY ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : health.queue.status === HealthStatus.DEGRADED ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={
                    health.queue.status === HealthStatus.HEALTHY
                      ? 'text-green-600'
                      : health.queue.status === HealthStatus.DEGRADED
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }>
                    {health.queue.failed || 0} failed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* File System */}
          <div className="space-y-2">
            <div className="text-sm font-medium">File System</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Images Directory</span>
              <div className="flex items-center gap-2">
                {health.fileSystem.status === HealthStatus.HEALTHY ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={health.fileSystem.status === HealthStatus.HEALTHY ? 'text-green-600' : 'text-red-600'}>
                  Accessible
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          Last checked: {new Date(health.timestamp).toLocaleString()} (Check duration: {health.checkDuration}ms)
        </div>
      </CardContent>
    </Card>
  );
}
