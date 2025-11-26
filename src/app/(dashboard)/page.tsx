'use client';

/**
 * Dashboard Home Page
 * Overview of system statistics and recent activity
 */

import { useDashboardStats } from '@/hooks/use-dashboard';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  FileText,
  Image,
  FileCode2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { formatNumber, formatPercentage } from '@/lib/utils/format';

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" text="加载仪表板数据..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>加载失败</AlertTitle>
        <AlertDescription>
          无法加载仪表板数据。请稍后重试或检查网络连接。
        </AlertDescription>
      </Alert>
    );
  }

  if (!stats) return null;

  const imageCompletionRate =
    stats.images.total > 0
      ? formatPercentage(stats.images.completed, stats.images.total)
      : '0%';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">仪表板</h1>
        <p className="text-muted-foreground">
          PromptGen AI素材生成系统 - 系统概览与统计
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="数据库库"
          value={formatNumber(stats.libraries.total)}
          icon={Database}
          description={`${stats.libraries.total}个启用的库`}
        />
        <StatCard
          title="生成记录"
          value={formatNumber(stats.records.total)}
          icon={FileText}
          description={`${stats.records.withPrompts}个含Prompt`}
        />
        <StatCard
          title="模板"
          value={formatNumber(stats.templates.total)}
          icon={FileCode2}
          description={`${stats.templates.system}个系统模板`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Image Generation Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              图片生成状态
            </CardTitle>
            <CardDescription>当前图片生成任务的状态分布</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">已完成</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.images.completed}</span>
                <span className="text-sm text-muted-foreground">
                  ({formatPercentage(stats.images.completed, stats.images.total)})
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">待生成</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.images.pending}</span>
                <span className="text-sm text-muted-foreground">
                  ({formatPercentage(stats.images.pending, stats.images.total)})
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">失败</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.images.failed}</span>
                <span className="text-sm text-muted-foreground">
                  ({formatPercentage(stats.images.failed, stats.images.total)})
                </span>
              </div>
            </div>
            <div className="pt-4">
              <Link href="/combinations">
                <Button className="w-full">
                  管理图片
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Provider Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Provider性能
            </CardTitle>
            <CardDescription>各AI Provider的成功率统计</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Gemini */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Google Gemini</span>
                <Badge variant="outline">
                  {formatPercentage(
                    stats.providers.gemini.success,
                    stats.providers.gemini.success + stats.providers.gemini.failed
                  )}
                </Badge>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>成功: {stats.providers.gemini.success}</span>
                <span>失败: {stats.providers.gemini.failed}</span>
              </div>
            </div>

            {/* Bytedance */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">字节跳动</span>
                <Badge variant="outline">
                  {formatPercentage(
                    stats.providers.bytedance.success,
                    stats.providers.bytedance.success + stats.providers.bytedance.failed
                  )}
                </Badge>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>成功: {stats.providers.bytedance.success}</span>
                <span>失败: {stats.providers.bytedance.failed}</span>
              </div>
            </div>

            <div className="pt-4">
              <Link href="/status">
                <Button variant="outline" className="w-full">
                  查看详细状态
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>常用功能快速访问</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/libraries">
            <Button variant="outline" className="w-full justify-start">
              <Database className="mr-2 h-4 w-4" />
              管理库
            </Button>
          </Link>
          <Link href="/prompts">
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              生成Prompt
            </Button>
          </Link>
          <Link href="/templates">
            <Button variant="outline" className="w-full justify-start">
              <FileCode2 className="mr-2 h-4 w-4" />
              编辑模板
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
