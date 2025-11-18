/**
 * Health Monitoring Types
 * Defines types for system health checks and monitoring
 */

/**
 * Overall system health status
 */
export enum HealthStatus {
  HEALTHY = 'HEALTHY',       // All systems operational
  DEGRADED = 'DEGRADED',     // Some non-critical issues
  UNHEALTHY = 'UNHEALTHY',   // Critical issues present
}

/**
 * Individual component health check result
 */
export interface ComponentHealth {
  /**
   * Component name
   */
  name: string;

  /**
   * Health status
   */
  status: HealthStatus;

  /**
   * Human-readable status message
   */
  message: string;

  /**
   * Last check timestamp
   */
  lastChecked: Date;

  /**
   * Response time in milliseconds (for performance metrics)
   */
  responseTime?: number;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;

  /**
   * Error details (if unhealthy)
   */
  error?: string;
}

/**
 * Provider-specific health status
 */
export interface ProviderHealth extends ComponentHealth {
  /**
   * Provider name (gemini, bytedance)
   */
  providerName: string;

  /**
   * Success rate (0-100)
   */
  successRate?: number;

  /**
   * Average response time in ms
   */
  avgResponseTime?: number;

  /**
   * Total requests count
   */
  totalRequests?: number;
}

/**
 * Database health metrics
 */
export interface DatabaseHealth extends ComponentHealth {
  /**
   * Active connections count
   */
  activeConnections?: number;

  /**
   * Connection pool size
   */
  poolSize?: number;

  /**
   * Average query time in ms
   */
  avgQueryTime?: number;
}

/**
 * Queue health metrics
 */
export interface QueueHealth extends ComponentHealth {
  /**
   * Waiting jobs count
   */
  waiting?: number;

  /**
   * Active jobs count
   */
  active?: number;

  /**
   * Completed jobs count
   */
  completed?: number;

  /**
   * Failed jobs count
   */
  failed?: number;

  /**
   * Delayed jobs count
   */
  delayed?: number;
}

/**
 * File system health metrics
 */
export interface FileSystemHealth extends ComponentHealth {
  /**
   * Total disk space in bytes
   */
  totalSpace?: number;

  /**
   * Free disk space in bytes
   */
  freeSpace?: number;

  /**
   * Used disk space in bytes
   */
  usedSpace?: number;

  /**
   * Usage percentage (0-100)
   */
  usagePercent?: number;

  /**
   * Images directory path
   */
  imagesPath?: string;
}

/**
 * Complete system health report
 */
export interface SystemHealth {
  /**
   * Overall system status
   */
  status: HealthStatus;

  /**
   * Timestamp of health check
   */
  timestamp: Date;

  /**
   * Provider health statuses
   */
  providers: ProviderHealth[];

  /**
   * Database health
   */
  database: DatabaseHealth;

  /**
   * Queue health
   */
  queue: QueueHealth;

  /**
   * File system health
   */
  fileSystem: FileSystemHealth;

  /**
   * Summary message
   */
  summary: string;

  /**
   * Total check duration in ms
   */
  checkDuration: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /**
   * Timeout for each health check in ms
   */
  timeout?: number;

  /**
   * Whether to include detailed metrics
   */
  includeMetrics?: boolean;

  /**
   * Disk usage warning threshold (%)
   */
  diskWarningThreshold?: number;

  /**
   * Disk usage critical threshold (%)
   */
  diskCriticalThreshold?: number;
}
