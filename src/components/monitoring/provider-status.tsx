'use client';

/**
 * Provider Status Component
 * Displays detailed AI provider statistics and health
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, TrendingUp, Clock } from 'lucide-react';

interface ProviderStats {
  name: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  avgResponseTime: number;
  lastUsed: string | null;
}

export function ProviderStatus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['providerStats'],
    queryFn: async () => {
      const response = await fetch('/api/providers/stats');
      if (!response.ok) throw new Error('Failed to fetch provider stats');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">Provider Stats Error</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Failed to fetch provider statistics'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provider Statistics</CardTitle>
          <CardDescription>Loading provider data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const providers: ProviderStats[] = data?.data?.providers || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Statistics</CardTitle>
        <CardDescription>AI provider performance and reliability metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {providers.map((provider) => (
            <div key={provider.name} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{provider.name}</h3>
                  {provider.successRate >= 90 ? (
                    <Badge className="bg-green-500 hover:bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Healthy
                    </Badge>
                  ) : provider.successRate >= 70 ? (
                    <Badge variant="secondary">
                      Degraded
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Issues
                    </Badge>
                  )}
                </div>
                <span className="text-2xl font-bold">{provider.successRate.toFixed(1)}%</span>
              </div>

              {/* Success Rate Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Success Rate</span>
                  <span>
                    {provider.successfulRequests} / {provider.totalRequests} requests
                  </span>
                </div>
                <Progress
                  value={provider.successRate}
                  className="h-2"
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>Total Requests</span>
                  </div>
                  <div className="text-lg font-semibold">{provider.totalRequests.toLocaleString()}</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Avg Response</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {provider.avgResponseTime > 0 ? `${provider.avgResponseTime.toFixed(0)}ms` : 'N/A'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <XCircle className="h-3 w-3" />
                    <span>Failed</span>
                  </div>
                  <div className="text-lg font-semibold text-red-600">{provider.failedRequests}</div>
                </div>
              </div>

              {/* Last Used */}
              {provider.lastUsed && (
                <div className="text-xs text-muted-foreground">
                  Last used: {new Date(provider.lastUsed).toLocaleString()}
                </div>
              )}
            </div>
          ))}

          {providers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No provider usage data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
