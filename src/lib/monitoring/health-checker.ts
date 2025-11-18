/**
 * System Health Checker
 * Aggregates health checks from all system components
 */

import { prisma } from '@/lib/db/prisma';
import { ProviderManager } from '@/lib/providers/provider-manager';
import { getQueueStats } from '@/lib/queue/image-generation-queue';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  SystemHealth,
  HealthStatus,
  ComponentHealth,
  ProviderHealth,
  DatabaseHealth,
  QueueHealth,
  FileSystemHealth,
  HealthCheckConfig,
} from './types';

/**
 * System health checker
 */
export class HealthChecker {
  private static providerManager: ProviderManager | null = null;

  /**
   * Initialize provider manager (lazy initialization)
   */
  private static getProviderManager(): ProviderManager {
    if (!this.providerManager) {
      this.providerManager = ProviderManager.getInstance();
    }
    return this.providerManager;
  }

  /**
   * Perform complete system health check
   */
  static async checkSystemHealth(
    config: HealthCheckConfig = {}
  ): Promise<SystemHealth> {
    const startTime = Date.now();

    try {
      // Run all health checks in parallel
      const [providers, database, queue, fileSystem] = await Promise.all([
        this.checkProviders(config),
        this.checkDatabase(config),
        this.checkQueue(config),
        this.checkFileSystem(config),
      ]);

      // Determine overall status
      const allComponents = [database, queue, fileSystem];
      const overallStatus = this.determineOverallStatus([
        ...providers,
        ...allComponents,
      ]);

      const checkDuration = Date.now() - startTime;

      return {
        status: overallStatus,
        timestamp: new Date(),
        providers,
        database,
        queue,
        fileSystem,
        summary: this.generateSummary(overallStatus, {
          providers,
          database,
          queue,
          fileSystem,
        }),
        checkDuration,
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        providers: [],
        database: this.createUnhealthyComponent('Database', error),
        queue: this.createUnhealthyComponent('Queue', error),
        fileSystem: this.createUnhealthyComponent('FileSystem', error),
        summary: `Health check failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        checkDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Check AI providers health
   */
  private static async checkProviders(
    config: HealthCheckConfig
  ): Promise<ProviderHealth[]> {
    try {
      const manager = this.getProviderManager();
      const healthStatuses = await manager.checkHealthAll();

      return healthStatuses.map((status) => ({
        name: `Provider: ${status.name}`,
        providerName: status.name,
        status: status.healthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        message: status.healthy
          ? `${status.name} is operational`
          : `${status.name} is unavailable`,
        lastChecked: status.lastChecked,
        error: status.error,
      }));
    } catch (error) {
      return [
        {
          name: 'Provider: Unknown',
          providerName: 'unknown',
          status: HealthStatus.UNHEALTHY,
          message: 'Failed to check provider health',
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : String(error),
        },
      ];
    }
  }

  /**
   * Check database health
   */
  private static async checkDatabase(
    config: HealthCheckConfig
  ): Promise<DatabaseHealth> {
    const startTime = Date.now();

    try {
      // Test database connection with a simple query
      await prisma.$queryRaw`SELECT 1`;

      // Get connection pool metrics (if available)
      const metrics = await prisma.$metrics.json();

      const responseTime = Date.now() - startTime;

      return {
        name: 'Database',
        status: responseTime > 1000 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
        message:
          responseTime > 1000
            ? 'Database responding slowly'
            : 'Database is operational',
        lastChecked: new Date(),
        responseTime,
        metadata: {
          metrics,
        },
      };
    } catch (error) {
      return {
        name: 'Database',
        status: HealthStatus.UNHEALTHY,
        message: 'Database connection failed',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check queue health
   */
  private static async checkQueue(
    config: HealthCheckConfig
  ): Promise<QueueHealth> {
    try {
      const stats = await getQueueStats();

      // Determine status based on failed jobs
      let status = HealthStatus.HEALTHY;
      let message = 'Queue is operational';

      if (stats.failed > 10) {
        status = HealthStatus.DEGRADED;
        message = `${stats.failed} failed jobs in queue`;
      }

      if (stats.failed > 50) {
        status = HealthStatus.UNHEALTHY;
        message = `High number of failed jobs: ${stats.failed}`;
      }

      return {
        name: 'Queue',
        status,
        message,
        lastChecked: new Date(),
        waiting: stats.waiting,
        active: stats.active,
        completed: stats.completed,
        failed: stats.failed,
        delayed: stats.delayed,
      };
    } catch (error) {
      return {
        name: 'Queue',
        status: HealthStatus.UNHEALTHY,
        message: 'Queue health check failed',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check file system health
   */
  private static async checkFileSystem(
    config: HealthCheckConfig
  ): Promise<FileSystemHealth> {
    const diskWarningThreshold = config.diskWarningThreshold || 80;
    const diskCriticalThreshold = config.diskCriticalThreshold || 90;

    try {
      const imagesPath = join(process.cwd(), 'public', 'images');

      // Check if images directory exists
      try {
        await fs.access(imagesPath);
      } catch {
        // Create directory if it doesn't exist
        await fs.mkdir(imagesPath, { recursive: true });
      }

      // Get disk space info (cross-platform approach)
      let totalSpace = 0;
      let freeSpace = 0;
      let usagePercent = 0;

      try {
        // This is a simplified check - in production, you might want to use a library
        // like 'check-disk-space' for accurate cross-platform disk usage
        const stat = await fs.stat(imagesPath);

        // For now, we'll just verify the directory is accessible
        // Real disk space checking would require additional libraries
        totalSpace = 0;
        freeSpace = 0;
        usagePercent = 0;
      } catch (error) {
        // If we can't get disk stats, just verify directory access
      }

      let status = HealthStatus.HEALTHY;
      let message = 'File system is accessible';

      if (usagePercent >= diskCriticalThreshold) {
        status = HealthStatus.UNHEALTHY;
        message = `Critical: ${usagePercent}% disk usage`;
      } else if (usagePercent >= diskWarningThreshold) {
        status = HealthStatus.DEGRADED;
        message = `Warning: ${usagePercent}% disk usage`;
      }

      return {
        name: 'File System',
        status,
        message,
        lastChecked: new Date(),
        totalSpace,
        freeSpace,
        usedSpace: totalSpace - freeSpace,
        usagePercent,
        imagesPath,
      };
    } catch (error) {
      return {
        name: 'File System',
        status: HealthStatus.UNHEALTHY,
        message: 'File system check failed',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Determine overall status from component statuses
   */
  private static determineOverallStatus(
    components: ComponentHealth[]
  ): HealthStatus {
    if (components.some((c) => c.status === HealthStatus.UNHEALTHY)) {
      return HealthStatus.UNHEALTHY;
    }

    if (components.some((c) => c.status === HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Generate summary message
   */
  private static generateSummary(
    status: HealthStatus,
    components: {
      providers: ProviderHealth[];
      database: DatabaseHealth;
      queue: QueueHealth;
      fileSystem: FileSystemHealth;
    }
  ): string {
    if (status === HealthStatus.HEALTHY) {
      return 'All systems operational';
    }

    const issues: string[] = [];

    // Check providers
    const unhealthyProviders = components.providers.filter(
      (p) => p.status === HealthStatus.UNHEALTHY
    );
    if (unhealthyProviders.length > 0) {
      issues.push(
        `${unhealthyProviders.length} provider(s) unavailable`
      );
    }

    // Check database
    if (components.database.status !== HealthStatus.HEALTHY) {
      issues.push('Database issues detected');
    }

    // Check queue
    if (components.queue.status !== HealthStatus.HEALTHY) {
      issues.push('Queue issues detected');
    }

    // Check file system
    if (components.fileSystem.status !== HealthStatus.HEALTHY) {
      issues.push('File system issues detected');
    }

    return issues.join(', ');
  }

  /**
   * Create unhealthy component health status
   */
  private static createUnhealthyComponent(
    name: string,
    error: unknown
  ): ComponentHealth {
    return {
      name,
      status: HealthStatus.UNHEALTHY,
      message: 'Health check failed',
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
