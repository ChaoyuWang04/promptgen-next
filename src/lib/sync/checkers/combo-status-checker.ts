/**
 * Combination Status Checker
 * Validates outfit states and decoration combinations
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

export class ComboStatusChecker implements IChecker {
  name = 'Combination Status Checker';
  description = 'Validates outfit states and decoration combinations';

  async check(): Promise<CheckResult> {
    const startTime = Date.now();
    const issues: SyncIssue[] = [];

    try {
      const records = await prisma.record.findMany();

      for (const record of records) {
        // Check outfitMinorState structure
        if (record.outfitMinorState) {
          if (typeof record.outfitMinorState !== 'object') {
            issues.push({
              id: uuidv4(),
              type: IssueType.COMBO_STATUS,
              severity: IssueSeverity.WARNING,
              description: `Record ${record.imageId} has invalid outfitMinorState (not an object)`,
              recordId: record.imageId,
              entityType: 'Record',
              details: { imageId: record.imageId, outfitMinorState: record.outfitMinorState },
              canAutoRepair: true,
              repairAction: 'Reset outfitMinorState to null',
            });
          }
        }

        // Check usedDecorations structure
        if (record.usedDecorations) {
          if (!Array.isArray(record.usedDecorations)) {
            issues.push({
              id: uuidv4(),
              type: IssueType.COMBO_STATUS,
              severity: IssueSeverity.WARNING,
              description: `Record ${record.imageId} has invalid usedDecorations (not an array)`,
              recordId: record.imageId,
              entityType: 'Record',
              details: { imageId: record.imageId, usedDecorations: record.usedDecorations },
              canAutoRepair: true,
              repairAction: 'Reset usedDecorations to empty array',
            });
          }
        }
      }
    } catch (error) {
      issues.push({
        id: uuidv4(),
        type: IssueType.COMBO_STATUS,
        severity: IssueSeverity.CRITICAL,
        description: 'Failed to check combination status',
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

        if (issue.description.includes('invalid outfitMinorState')) {
          await prisma.record.update({
            where: { imageId },
            data: { outfitMinorState: null },
          });

          results.push({
            issueId: issue.id,
            success: true,
            message: `Reset outfitMinorState for ${imageId}`,
          });
        } else if (issue.description.includes('invalid usedDecorations')) {
          await prisma.record.update({
            where: { imageId },
            data: { usedDecorations: [] },
          });

          results.push({
            issueId: issue.id,
            success: true,
            message: `Reset usedDecorations for ${imageId}`,
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
