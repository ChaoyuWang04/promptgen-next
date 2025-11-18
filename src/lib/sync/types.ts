/**
 * Sync Management Types
 * Defines types for sync checking and auto-repair functionality
 */

/**
 * Sync issue severity levels
 */
export enum IssueSeverity {
  CRITICAL = 'CRITICAL',   // Data integrity issues
  WARNING = 'WARNING',     // Consistency issues
  INFO = 'INFO',          // Minor issues or suggestions
}

/**
 * Sync issue types
 */
export enum IssueType {
  LIBRARY_CONFIG = 'LIBRARY_CONFIG',           // Library configuration issues
  INVALID_REFS = 'INVALID_REFS',              // Invalid foreign key references
  PROMPT_SYNC = 'PROMPT_SYNC',                 // Prompt synchronization issues
  IMAGE_SYNC = 'IMAGE_SYNC',                   // Image synchronization issues
  COMBO_STATUS = 'COMBO_STATUS',               // Combination status issues
  FIELD_INTEGRITY = 'FIELD_INTEGRITY',         // Field integrity issues
  ORPHAN_RECORDS = 'ORPHAN_RECORDS',           // Orphaned records
  DUPLICATE_RECORDS = 'DUPLICATE_RECORDS',     // Duplicate records
}

/**
 * Sync issue interface
 */
export interface SyncIssue {
  /**
   * Unique issue ID
   */
  id: string;

  /**
   * Issue type
   */
  type: IssueType;

  /**
   * Severity level
   */
  severity: IssueSeverity;

  /**
   * Human-readable description
   */
  description: string;

  /**
   * Affected record ID (if applicable)
   */
  recordId?: string;

  /**
   * Affected entity type
   */
  entityType?: 'Record' | 'Prompt' | 'ImageVariant' | 'Template' | 'Library';

  /**
   * Additional details
   */
  details?: Record<string, any>;

  /**
   * Whether this issue can be auto-repaired
   */
  canAutoRepair: boolean;

  /**
   * Suggested repair action
   */
  repairAction?: string;
}

/**
 * Checker result interface
 */
export interface CheckResult {
  /**
   * Checker name
   */
  checkerName: string;

  /**
   * Number of issues found
   */
  issueCount: number;

  /**
   * List of issues
   */
  issues: SyncIssue[];

  /**
   * Check duration in milliseconds
   */
  duration: number;

  /**
   * Check timestamp
   */
  timestamp: Date;
}

/**
 * Repair result interface
 */
export interface RepairResult {
  /**
   * Issue ID that was repaired
   */
  issueId: string;

  /**
   * Whether repair was successful
   */
  success: boolean;

  /**
   * Repair message
   */
  message: string;

  /**
   * Error details (if failed)
   */
  error?: string;
}

/**
 * Sync check summary
 */
export interface SyncCheckSummary {
  /**
   * Total issues found
   */
  totalIssues: number;

  /**
   * Issues by severity
   */
  bySeverity: {
    [IssueSeverity.CRITICAL]: number;
    [IssueSeverity.WARNING]: number;
    [IssueSeverity.INFO]: number;
  };

  /**
   * Issues by type
   */
  byType: Record<IssueType, number>;

  /**
   * Auto-repairable issues count
   */
  autoRepairableCount: number;

  /**
   * All checker results
   */
  checkerResults: CheckResult[];

  /**
   * Total check duration
   */
  totalDuration: number;

  /**
   * Check timestamp
   */
  timestamp: Date;
}

/**
 * Repair history entry
 */
export interface RepairHistoryEntry {
  /**
   * History entry ID
   */
  id: string;

  /**
   * Repair timestamp
   */
  timestamp: Date;

  /**
   * Issues repaired
   */
  issuesRepaired: string[];

  /**
   * Repair results
   */
  results: RepairResult[];

  /**
   * Success count
   */
  successCount: number;

  /**
   * Failure count
   */
  failureCount: number;

  /**
   * Repair mode (auto or manual)
   */
  mode: 'auto' | 'manual';
}

/**
 * Checker interface
 */
export interface IChecker {
  /**
   * Checker name
   */
  name: string;

  /**
   * Checker description
   */
  description: string;

  /**
   * Check for issues
   */
  check(): Promise<CheckResult>;

  /**
   * Repair specific issues
   */
  repair(issues: SyncIssue[]): Promise<RepairResult[]>;
}
