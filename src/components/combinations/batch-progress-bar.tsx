'use client';

/**
 * Batch Progress Bar Component
 * Collapsible notification bar showing real-time batch generation progress
 * Features:
 * - Real-time progress display (polling every 2s)
 * - Expandable/collapsible
 * - Statistics (total, completed, failed, pending)
 * - Retry failed button
 * - Stop generation button
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useBatchProgress } from '@/hooks/use-batch-progress';

interface BatchProgressBarProps {
  batchId: string | null;
  onDismiss: () => void;
}

export function BatchProgressBar({ batchId, onDismiss }: BatchProgressBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: progress, isLoading } = useBatchProgress(batchId);

  if (!batchId || !progress) return null;

  const progressPercentage = progress.totalImages > 0
    ? (progress.completed / progress.totalImages) * 100
    : 0;
  const isComplete = progress.status === 'COMPLETED' || progress.status === 'FAILED';
  const pendingCount = progress.totalImages - progress.completed - progress.failed;

  return (
    <Card className="mb-4 border-l-4 border-l-primary">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {!isComplete && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {progress.status === 'COMPLETED' && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            {progress.status === 'FAILED' && (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}

            <div>
              <h3 className="font-semibold">批量生成进度</h3>
              <p className="text-sm text-muted-foreground">
                批次 ID: {batchId.slice(0, 8)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <Badge
              variant={
                progress.status === 'COMPLETED'
                  ? 'default'
                  : progress.status === 'FAILED'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {progress.status}
            </Badge>

            {/* Expand/Collapse */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {/* Dismiss (only when complete) */}
            {isComplete && (
              <Button variant="ghost" size="icon" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <span>
              {progress.completed} / {progress.totalImages} 已完成
            </span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold">{progress.totalImages}</div>
                <div className="text-xs text-muted-foreground">总数</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{progress.completed}</div>
                <div className="text-xs text-muted-foreground">成功</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{progress.failed}</div>
                <div className="text-xs text-muted-foreground">失败</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
                <div className="text-xs text-muted-foreground">待处理</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {progress.failed > 0 && isComplete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // TODO: Implement retry logic
                    console.log('Retry failed images');
                  }}
                >
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  重试失败 ({progress.failed})
                </Button>
              )}
              {!isComplete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    // TODO: Implement cancel logic
                    console.log('Cancel batch');
                  }}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  停止生成
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
