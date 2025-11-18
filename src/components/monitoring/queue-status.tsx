'use client';

/**
 * Queue Status Component
 * Displays BullMQ job queue statistics and health
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Timer
} from 'lucide-react';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  health: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
}

export function QueueStatus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['queueStats'],
    queryFn: async () => {
      const response = await fetch('/api/queue/stats');
      if (!response.ok) throw new Error('Failed to fetch queue stats');
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds (more frequent for queue)
  });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">Queue Stats Error</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Failed to fetch queue statistics'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Queue Status</CardTitle>
          <CardDescription>Loading queue data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats: QueueStats = data?.data;
  const total = stats.completed + stats.failed;
  const successRate = total > 0 ? (stats.completed / total) * 100 : 100;

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Healthy
          </Badge>
        );
      case 'degraded':
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Degraded
          </Badge>
        );
      case 'unhealthy':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Unhealthy
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Job Queue Status</CardTitle>
            <CardDescription>BullMQ image generation queue metrics</CardDescription>
          </div>
          {getHealthBadge(stats.health)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Active Jobs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                <span className="text-sm font-medium">Active Jobs</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{stats.active}</span>
            </div>
            {stats.active > 0 && (
              <Progress value={100} className="h-2" indicatorClassName="bg-blue-500" />
            )}
          </div>

          {/* Waiting Jobs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Waiting Jobs</span>
              </div>
              <span className="text-2xl font-bold text-yellow-600">{stats.waiting}</span>
            </div>
            {stats.waiting > 0 && (
              <Progress value={100} className="h-2" indicatorClassName="bg-yellow-500" />
            )}
          </div>

          {/* Delayed Jobs */}
          {stats.delayed > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Delayed Jobs</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">{stats.delayed}</span>
              </div>
              <Progress value={100} className="h-2" indicatorClassName="bg-orange-500" />
            </div>
          )}

          {/* Success Rate */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Success Rate</span>
              <span>
                {stats.completed} / {total} jobs
              </span>
            </div>
            <Progress
              value={successRate}
              className="h-2"
              indicatorClassName={
                successRate >= 90
                  ? 'bg-green-500'
                  : successRate >= 70
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {successRate.toFixed(1)}% successful
              </span>
              {stats.failed > 0 && (
                <span className="text-red-600">{stats.failed} failed</span>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>Completed</span>
              </div>
              <div className="text-lg font-semibold text-green-600">
                {stats.completed.toLocaleString()}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <XCircle className="h-3 w-3 text-red-500" />
                <span>Failed</span>
              </div>
              <div className="text-lg font-semibold text-red-600">
                {stats.failed.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            Last updated: {new Date(stats.timestamp).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
