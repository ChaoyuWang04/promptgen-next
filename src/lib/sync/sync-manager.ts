/**
 * Sync Manager
 * Orchestrates all sync checkers and coordinates repairs
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SyncCheckSummary,
  CheckResult,
  SyncIssue,
  RepairResult,
  RepairHistoryEntry,
  IssueSeverity,
  IssueType,
  IChecker,
} from './types';

// Import checkers
import { LibraryConfigChecker } from './checkers/library-config-checker';
import { InvalidRefsChecker } from './checkers/invalid-refs-checker';
import { PromptSyncChecker } from './checkers/prompt-sync-checker';
import { ImageSyncChecker } from './checkers/image-sync-checker';
import { ComboStatusChecker } from './checkers/combo-status-checker';
import { FieldIntegrityChecker } from './checkers/field-integrity-checker';
import { OrphanChecker } from './checkers/orphan-checker';
import { DuplicateChecker } from './checkers/duplicate-checker';

/**
 * Sync Manager class
 * Coordinates all sync checkers and repair operations
 */
export class SyncManager {
  private checkers: IChecker[];
  private repairHistory: RepairHistoryEntry[] = [];

  constructor() {
    // Initialize all checkers
    this.checkers = [
      new LibraryConfigChecker(),
      new InvalidRefsChecker(),
      new PromptSyncChecker(),
      new ImageSyncChecker(),
      new ComboStatusChecker(),
      new FieldIntegrityChecker(),
      new OrphanChecker(),
      new DuplicateChecker(),
    ];
  }

  /**
   * Run all sync checks
   * @returns Promise<SyncCheckSummary>
   */
  async runAllChecks(): Promise<SyncCheckSummary> {
    const startTime = Date.now();

    // Run all checkers in parallel
    const checkerResults = await Promise.all(
      this.checkers.map((checker) => checker.check())
    );

    // Aggregate results
    const allIssues = checkerResults.flatMap((result) => result.issues);

    const summary: SyncCheckSummary = {
      totalIssues: allIssues.length,
      bySeverity: {
        [IssueSeverity.CRITICAL]: allIssues.filter(
          (i) => i.severity === IssueSeverity.CRITICAL
        ).length,
        [IssueSeverity.WARNING]: allIssues.filter(
          (i) => i.severity === IssueSeverity.WARNING
        ).length,
        [IssueSeverity.INFO]: allIssues.filter((i) => i.severity === IssueSeverity.INFO)
          .length,
      },
      byType: this.countByType(allIssues),
      autoRepairableCount: allIssues.filter((i) => i.canAutoRepair).length,
      checkerResults,
      totalDuration: Date.now() - startTime,
      timestamp: new Date(),
    };

    return summary;
  }

  /**
   * Repair specific issues
   * @param issueIds - Array of issue IDs to repair
   * @param mode - Repair mode (auto or manual)
   * @returns Promise<RepairHistoryEntry>
   */
  async repairIssues(
    issueIds: string[],
    mode: 'auto' | 'manual' = 'manual'
  ): Promise<RepairHistoryEntry> {
    // First, get current issues to find the ones to repair
    const summary = await this.runAllChecks();
    const allIssues = summary.checkerResults.flatMap((r) => r.issues);

    const issuesToRepair = allIssues.filter((issue) => issueIds.includes(issue.id));

    if (issuesToRepair.length === 0) {
      return {
        id: uuidv4(),
        timestamp: new Date(),
        issuesRepaired: [],
        results: [],
        successCount: 0,
        failureCount: 0,
        mode,
      };
    }

    // Group issues by checker
    const issuesByChecker = new Map<string, SyncIssue[]>();

    for (const issue of issuesToRepair) {
      // Find which checker this issue belongs to
      const checkerResult = summary.checkerResults.find((r) =>
        r.issues.some((i) => i.id === issue.id)
      );

      if (checkerResult) {
        const checkerName = checkerResult.checkerName;
        if (!issuesByChecker.has(checkerName)) {
          issuesByChecker.set(checkerName, []);
        }
        issuesByChecker.get(checkerName)!.push(issue);
      }
    }

    // Repair issues by checker
    const allResults: RepairResult[] = [];

    for (const [checkerName, issues] of issuesByChecker) {
      const checker = this.checkers.find((c) => c.name === checkerName);
      if (checker) {
        const results = await checker.repair(issues);
        allResults.push(...results);
      }
    }

    // Create history entry
    const historyEntry: RepairHistoryEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      issuesRepaired: issueIds,
      results: allResults,
      successCount: allResults.filter((r) => r.success).length,
      failureCount: allResults.filter((r) => !r.success).length,
      mode,
    };

    this.repairHistory.push(historyEntry);

    return historyEntry;
  }

  /**
   * Auto-repair all repairable issues
   * @returns Promise<RepairHistoryEntry>
   */
  async autoRepairAll(): Promise<RepairHistoryEntry> {
    const summary = await this.runAllChecks();
    const allIssues = summary.checkerResults.flatMap((r) => r.issues);

    const repairableIssues = allIssues.filter((i) => i.canAutoRepair);
    const issueIds = repairableIssues.map((i) => i.id);

    return this.repairIssues(issueIds, 'auto');
  }

  /**
   * Get repair history
   * @param limit - Number of entries to return
   * @returns RepairHistoryEntry[]
   */
  getRepairHistory(limit: number = 10): RepairHistoryEntry[] {
    return this.repairHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Count issues by type
   */
  private countByType(issues: SyncIssue[]): Record<IssueType, number> {
    const counts: Record<IssueType, number> = {
      [IssueType.LIBRARY_CONFIG]: 0,
      [IssueType.INVALID_REFS]: 0,
      [IssueType.PROMPT_SYNC]: 0,
      [IssueType.IMAGE_SYNC]: 0,
      [IssueType.COMBO_STATUS]: 0,
      [IssueType.FIELD_INTEGRITY]: 0,
      [IssueType.ORPHAN_RECORDS]: 0,
      [IssueType.DUPLICATE_RECORDS]: 0,
    };

    for (const issue of issues) {
      counts[issue.type]++;
    }

    return counts;
  }
}
