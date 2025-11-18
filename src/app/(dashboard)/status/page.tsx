'use client';

/**
 * System Status Page
 * Displays real-time system health, provider status, queue metrics, and error logs
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertCircle, Database, TrendingUp } from 'lucide-react';

// Real monitoring components
import { HealthStatusCard } from '@/components/monitoring/health-status-card';
import { ProviderStatus } from '@/components/monitoring/provider-status';
import { QueueStatus } from '@/components/monitoring/queue-status';

// Error management components
import { ErrorStats } from '@/components/errors/error-stats';
import { ErrorLogViewer } from '@/components/errors/error-log-viewer';
import { ErrorFilter } from '@/components/errors/error-filter';
import { ErrorLevel } from '@/lib/errors/types';

export default function StatusPage() {
  const [errorFilters, setErrorFilters] = useState<{
    level?: ErrorLevel;
    search?: string;
  }>({});

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
        <p className="text-muted-foreground">
          Real-time system health monitoring and diagnostics
        </p>
      </div>

      {/* Tabs for different status views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Queue
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Error Logs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <HealthStatusCard />

          <div className="grid gap-4 md:grid-cols-2">
            <ProviderStatus />
            <QueueStatus />
          </div>

          <ErrorStats />
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <ProviderStatus />
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <QueueStatus />
        </TabsContent>

        {/* Error Logs Tab */}
        <TabsContent value="errors" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <ErrorFilter onFilterChange={setErrorFilters} />
            </div>
            <div className="lg:col-span-3 space-y-4">
              <ErrorStats />
              <ErrorLogViewer
                level={errorFilters.level}
                search={errorFilters.search}
                limit={50}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
