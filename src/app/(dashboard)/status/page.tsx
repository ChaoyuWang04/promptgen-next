'use client';

/**
 * System Status Page
 * Displays system health, provider status, and diagnostics
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Activity, CheckCircle2, XCircle, AlertCircle, Server, Database } from 'lucide-react';

export default function StatusPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">系统状态</h1>
        <p className="text-muted-foreground">
          监控系统健康状况和Provider性能
        </p>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            系统健康
          </CardTitle>
          <CardDescription>核心服务运行状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <StatusItem
              label="API服务器"
              status="healthy"
              icon={Server}
              description="运行正常"
            />
            <StatusItem
              label="数据库连接"
              status="healthy"
              icon={Database}
              description="PostgreSQL 连接正常"
            />
            <StatusItem
              label="文件系统"
              status="healthy"
              icon={Database}
              description="读写正常"
            />
          </div>
        </CardContent>
      </Card>

      {/* Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle>AI Provider 状态</CardTitle>
          <CardDescription>各Provider的健康状态和性能指标</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ProviderStatusItem
              name="Google Gemini"
              status="operational"
              latency={245}
              successRate={98.5}
            />
            <ProviderStatusItem
              name="字节跳动"
              status="operational"
              latency={189}
              successRate={99.2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>开发中</AlertTitle>
        <AlertDescription>
          完整的系统状态监控功能正在开发中，将在后续版本中提供实时监控、历史数据和告警功能。
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Status Item Component
interface StatusItemProps {
  label: string;
  status: 'healthy' | 'degraded' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

function StatusItem({ label, status, icon: Icon, description }: StatusItemProps) {
  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900',
      badge: 'default',
    },
    degraded: {
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      badge: 'secondary',
    },
    down: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900',
      badge: 'destructive',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg ${config.bgColor} p-2`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusIcon className={`h-5 w-5 ${config.color}`} />
        <Badge variant={config.badge as any}>{status}</Badge>
      </div>
    </div>
  );
}

// Provider Status Item Component
interface ProviderStatusItemProps {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency: number;
  successRate: number;
}

function ProviderStatusItem({ name, status, latency, successRate }: ProviderStatusItemProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-medium">{name}</h4>
        <Badge variant={status === 'operational' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">平均延迟</p>
          <p className="text-lg font-semibold">{latency}ms</p>
        </div>
        <div>
          <p className="text-muted-foreground">成功率</p>
          <p className="text-lg font-semibold">{successRate}%</p>
        </div>
      </div>
    </div>
  );
}
