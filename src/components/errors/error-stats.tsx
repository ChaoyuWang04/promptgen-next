'use client';

/**
 * Error Statistics Component
 * Displays error statistics dashboard with metrics and trends
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorStats as ErrorStatsType } from '@/lib/errors/types';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function ErrorStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['errorStats'],
    queryFn: async () => {
      const response = await fetch('/api/errors/stats');
      if (!response.ok) throw new Error('Failed to fetch error statistics');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">Error Loading Statistics</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Unknown error'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats: ErrorStatsType = data?.data;

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-red-500';
    if (trend < 0) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <div className="space-y-4">
      {/* Main stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
            {getTrendIcon(stats.trend)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last24Hours.toLocaleString()}</div>
            <p className={`text-xs ${getTrendColor(stats.trend)}`}>
              {stats.trend > 0 && '+'}
              {stats.trend}% from previous day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats.byLevel.ERROR.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.byLevel.ERROR / stats.total) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {stats.byLevel.WARN.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.byLevel.WARN / stats.total) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top errors */}
      {stats.topErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Common Errors</CardTitle>
            <CardDescription>Top 10 error messages by occurrence</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topErrors.map((error, index) => (
                <div key={index} className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate">{error.message}</p>
                  </div>
                  <Badge variant="secondary">{error.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
