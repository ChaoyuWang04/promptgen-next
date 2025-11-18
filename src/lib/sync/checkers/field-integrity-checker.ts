/**
 * Field Integrity Checker
 * Validates required fields and data types
 */

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/db/prisma';
import {
  IChecker,
  CheckResult,
  SyncIssue,
  RepairResult,
  IssueType,
  IssueSeverity,
} from '../types';

export class FieldIntegrityChecker implements IChecker {
  name = 'Field Integrity Checker';
  description = 'Validates required fields and data types';

  async check(): Promise<CheckResult> {
    const startTime = Date.now();
    const issues: SyncIssue[] = [];

    try {
      const records = await prisma.record.findMany();

      for (const record of records) {
        // Check imageId format
        if (!record.imageId || typeof record.imageId !== 'string') {
          issues.push({
            id: uuidv4(),
            type: IssueType.FIELD_INTEGRITY,
            severity: IssueSeverity.CRITICAL,
            description: `Record has invalid imageId`,
            recordId: record.imageId,
            entityType: 'Record',
            details: { imageId: record.imageId },
            canAutoRepair: false,
            repairAction: 'Manual intervention required',
          });
        }

        // Check libraryIds field
        if (!record.libraryIds || typeof record.libraryIds !== 'object') {
          issues.push({
            id: uuidv4(),
            type: IssueType.FIELD_INTEGRITY,
            severity: IssueSeverity.CRITICAL,
            description: `Record ${record.imageId} has invalid libraryIds field`,
            recordId: record.imageId,
            entityType: 'Record',
            details: { imageId: record.imageId, libraryIds: record.libraryIds },
            canAutoRepair: false,
            repairAction: 'Manual intervention required',
          });
        }

        // Check providerAttempts field (if exists)
        if (record.providerAttempts && !Array.isArray(record.providerAttempts)) {
          issues.push({
            id: uuidv4(),
            type: IssueType.FIELD_INTEGRITY,
            severity: IssueSeverity.WARNING,
            description: `Record ${record.imageId} has invalid providerAttempts (not an array)`,
            recordId: record.imageId,
            entityType: 'Record',
            details: { imageId: record.imageId },
            canAutoRepair: true,
            repairAction: 'Reset providerAttempts to empty array',
          });
        }
      }
    } catch (error) {
      issues.push({
        id: uuidv4(),
        type: IssueType.FIELD_INTEGRITY,
        severity: IssueSeverity.CRITICAL,
        description: 'Failed to check field integrity',
        details: { error: error instanceof Error ? error.message : String(error) },
        canAutoRepair: false,
      });
    }

    return {
      checkerName: this.name,
      issueCount: issues.length,
      issues,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  async repair(issues: SyncIssue[]): Promise<RepairResult[]> {
    const results: RepairResult[] = [];

    for (const issue of issues) {
      if (!issue.canAutoRepair) {
        results.push({
          issueId: issue.id,
          success: false,
          message: 'Issue cannot be auto-repaired',
          error: issue.repairAction,
        });
        continue;
      }

      try {
        const { imageId } = issue.details as any;

        if (issue.description.includes('invalid providerAttempts')) {
          await prisma.record.update({
            where: { imageId },
            data: { providerAttempts: [] },
          });

          results.push({
            issueId: issue.id,
            success: true,
            message: `Reset providerAttempts for ${imageId}`,
          });
        }
      } catch (error) {
        results.push({
          issueId: issue.id,
          success: false,
          message: 'Repair failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }
}
