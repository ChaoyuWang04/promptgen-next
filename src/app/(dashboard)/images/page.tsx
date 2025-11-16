'use client';

/**
 * Image Management Page
 * Batch image generation and management interface
 */

import { useState } from 'react';
import { useImageStats, useImageBatches, useGenerateBatch, useRetryFailed } from '@/hooks/use-images';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { StatCard } from '@/components/shared/stat-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Image,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { formatNumber, formatPercentage, formatRelativeTime } from '@/lib/utils/format';
import { BatchGenerationDialog } from '@/components/images/batch-generation-dialog';

export default function ImagesPage() {
  const { data: stats, isLoading: statsLoading } = useImageStats();
  const { data: batches, isLoading: batchesLoading } = useImageBatches();
  const retryFailed = useRetryFailed();
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  if (statsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" text="加载图片统计..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">图片管理</h1>
          <p className="text-muted-foreground">
            批量生成图片和管理生成历史
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => retryFailed.mutate()}
            disabled={retryFailed.isPending || !stats || stats.failed === 0}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${retryFailed.isPending ? 'animate-spin' : ''}`} />
            重试失败
          </Button>
          <Button onClick={() => setShowBatchDialog(true)}>
            <Play className="mr-2 h-4 w-4" />
            批量生成
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="总图片数"
            value={formatNumber(stats.total_images)}
            icon={Image}
            description="所有已生成的图片"
          />
          <StatCard
            title="已完成"
            value={formatNumber(stats.completed)}
            icon={CheckCircle2}
            description={formatPercentage(stats.completed, stats.total_images)}
          />
          <StatCard
            title="待生成"
            value={formatNumber(stats.pending)}
            icon={Clock}
            description={formatPercentage(stats.pending, stats.total_images)}
          />
          <StatCard
            title="失败"
            value={formatNumber(stats.failed)}
            icon={XCircle}
            description={formatPercentage(stats.failed, stats.total_images)}
          />
        </div>
      )}

      {/* Provider Statistics */}
      {stats && Object.keys(stats.by_provider).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Provider统计</CardTitle>
            <CardDescription>各AI Provider的使用情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(stats.by_provider).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium capitalize">{provider}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch History */}
      <Card>
        <CardHeader>
          <CardTitle>批次历史</CardTitle>
          <CardDescription>最近的批量生成任务</CardDescription>
        </CardHeader>
        <CardContent>
          {batchesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <LoadingSpinner text="加载批次历史..." />
            </div>
          ) : !batches || batches.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              暂无批次历史，点击"批量生成"开始第一次批量生成
            </div>
          ) : (
            <div className="space-y-4">
              {batches.slice(0, 5).map((batch) => (
                <div key={batch.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          batch.status === 'completed'
                            ? 'default'
                            : batch.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {batch.status}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {batch.id}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(batch.created_at)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">进度</span>
                      <span className="font-medium">
                        {batch.completed + batch.failed} / {batch.total}
                      </span>
                    </div>
                    <Progress
                      value={((batch.completed + batch.failed) / batch.total) * 100}
                    />
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        <CheckCircle2 className="mr-1 inline h-3 w-3 text-green-500" />
                        成功: {batch.completed}
                      </span>
                      <span>
                        <XCircle className="mr-1 inline h-3 w-3 text-red-500" />
                        失败: {batch.failed}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Generation Dialog */}
      <BatchGenerationDialog
        open={showBatchDialog}
        onOpenChange={setShowBatchDialog}
      />
    </div>
  );
}
