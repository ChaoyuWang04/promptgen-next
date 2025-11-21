/**
 * Image Sync Checker
 * Verifies image generation status matches actual image variants
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

export class ImageSyncChecker implements IChecker {
  name = 'Image Sync Checker';
  description = 'Verifies image generation status matches actual image variants';

  async check(): Promise<CheckResult> {
    const startTime = Date.now();
    const issues: SyncIssue[] = [];

    try {
      const records = await prisma.record.findMany({
        include: {
          variants: true,
        },
      });

      for (const record of records) {
        // Check if imageGenerated is true but no variants exist
        if (record.imageGenerated && record.variants.length === 0) {
          issues.push({
            id: uuidv4(),
            type: IssueType.IMAGE_SYNC,
            severity: IssueSeverity.WARNING,
            description: `Record ${record.imageId} marked as imageGenerated but has no image variants`,
            recordId: record.imageId,
            entityType: 'Record',
            details: { imageId: record.imageId },
            canAutoRepair: true,
            repairAction: 'Set imageGenerated to false',
          });
        }

        // Check if variants exist but imageGenerated is false
        if (!record.imageGenerated && record.variants.length > 0) {
          issues.push({
            id: uuidv4(),
            type: IssueType.IMAGE_SYNC,
            severity: IssueSeverity.INFO,
            description: `Record ${record.imageId} has image variants but imageGenerated is false`,
            recordId: record.imageId,
            entityType: 'Record',
            details: {
              imageId: record.imageId,
              variantCount: record.variants.length,
            },
            canAutoRepair: true,
            repairAction: 'Set imageGenerated to true',
          });
        }
      }
    } catch (error) {
      issues.push({
        id: uuidv4(),
        type: IssueType.IMAGE_SYNC,
        severity: IssueSeverity.CRITICAL,
        description: 'Failed to check image synchronization',
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

        if (issue.description.includes('marked as imageGenerated but has no')) {
          await prisma.record.update({
            where: { imageId },
            data: { imageGenerated: false },
          });

          results.push({
            issueId: issue.id,
            success: true,
            message: `Set imageGenerated to false for ${imageId}`,
          });
        } else if (issue.description.includes('has image variants but imageGenerated is false')) {
          await prisma.record.update({
            where: { imageId },
            data: { imageGenerated: true },
          });

          results.push({
            issueId: issue.id,
            success: true,
            message: `Set imageGenerated to true for ${imageId}`,
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
