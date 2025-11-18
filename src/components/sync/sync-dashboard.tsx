'use client';

/**
 * Sync Dashboard Component
 * Overview of sync status and quick actions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { SyncCheckSummary, IssueSeverity } from '@/lib/sync/types';
import { RefreshCw, Wrench, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SyncDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sync check results
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['syncCheck'],
    queryFn: async () => {
      const response = await fetch('/api/sync/check');
      if (!response.ok) throw new Error('Failed to run sync check');
      return response.json();
    },
  });

  // Auto-repair mutation
  const autoRepairMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sync/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'auto' }),
      });
      if (!response.ok) throw new Error('Auto-repair failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Auto-repair complete',
        description: `${data.data.successCount} issues repaired, ${data.data.failureCount} failed`,
      });
      queryClient.invalidateQueries({ queryKey: ['syncCheck'] });
    },
    onError: (error) => {
      toast({
        title: 'Auto-repair failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load sync check: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
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

  const summary: SyncCheckSummary = data?.data;

  const getSeverityBadge = (severity: IssueSeverity, count: number) => {
    if (count === 0) return null;

    const config = {
      [IssueSeverity.CRITICAL]: { color: 'bg-red-500', icon: AlertCircle, label: 'Critical' },
      [IssueSeverity.WARNING]: { color: 'bg-yellow-500', icon: AlertTriangle, label: 'Warning' },
      [IssueSeverity.INFO]: { color: 'bg-blue-500', icon: Info, label: 'Info' },
    };

    const { color, icon: Icon, label } = config[severity];

    return (
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4" />
        <span>{label}:</span>
        <Badge className={color}>{count}</Badge>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {summary.totalIssues === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                Sync Status
              </CardTitle>
              <CardDescription>
                {summary.totalIssues === 0
                  ? 'All systems synchronized'
                  : `${summary.totalIssues} issue(s) found`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-check
              </Button>
              {summary.autoRepairableCount > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => autoRepairMutation.mutate()}
                  disabled={autoRepairMutation.isPending}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Auto-Repair ({summary.autoRepairableCount})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {summary.totalIssues === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No synchronization issues detected. All systems are healthy.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Issues by severity */}
              <div className="flex flex-wrap gap-4">
                {getSeverityBadge(IssueSeverity.CRITICAL, summary.bySeverity.CRITICAL)}
                {getSeverityBadge(IssueSeverity.WARNING, summary.bySeverity.WARNING)}
                {getSeverityBadge(IssueSeverity.INFO, summary.bySeverity.INFO)}
              </div>

              {/* Checker results summary */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Issues by Checker:</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {summary.checkerResults.map((result) => (
                    <div
                      key={result.checkerName}
                      className="flex items-center justify-between p-2 rounded-md bg-muted"
                    >
                      <span className="text-sm">{result.checkerName}</span>
                      <Badge variant={result.issueCount > 0 ? 'destructive' : 'secondary'}>
                        {result.issueCount}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            Last check: {new Date(summary.timestamp).toLocaleString()} (Duration: {summary.totalDuration}ms)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
