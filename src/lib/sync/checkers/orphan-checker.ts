/**
 * Orphan Checker
 * Finds orphaned prompts and image variants without parent records
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

export class OrphanChecker implements IChecker {
  name = 'Orphan Checker';
  description = 'Finds orphaned prompts and image variants without parent records';

  async check(): Promise<CheckResult> {
    const startTime = Date.now();
    const issues: SyncIssue[] = [];

    try {
      // Get all valid imageIds
      const records = await prisma.record.findMany({ select: { imageId: true } });
      const validImageIds = new Set(records.map((r) => r.imageId));

      // Check orphaned prompts
      const prompts = await prisma.prompt.findMany();
      for (const prompt of prompts) {
        if (!validImageIds.has(prompt.imageId)) {
          issues.push({
            id: uuidv4(),
            type: IssueType.ORPHAN_RECORDS,
            severity: IssueSeverity.WARNING,
            description: `Prompt ${prompt.id} references non-existent record ${prompt.imageId}`,
            recordId: prompt.imageId,
            entityType: 'Prompt',
            details: { promptId: prompt.id, imageId: prompt.imageId, type: prompt.type },
            canAutoRepair: true,
            repairAction: 'Delete orphaned prompt',
          });
        }
      }

      // Check orphaned image variants
      const imageVariants = await prisma.imageVariant.findMany();
      for (const variant of imageVariants) {
        if (!validImageIds.has(variant.imageId)) {
          issues.push({
            id: uuidv4(),
            type: IssueType.ORPHAN_RECORDS,
            severity: IssueSeverity.WARNING,
            description: `ImageVariant ${variant.id} references non-existent record ${variant.imageId}`,
            recordId: variant.imageId,
            entityType: 'ImageVariant',
            details: {
              variantId: variant.id,
              imageId: variant.imageId,
              version: variant.version,
            },
            canAutoRepair: true,
            repairAction: 'Delete orphaned image variant',
          });
        }
      }
    } catch (error) {
      issues.push({
        id: uuidv4(),
        type: IssueType.ORPHAN_RECORDS,
        severity: IssueSeverity.CRITICAL,
        description: 'Failed to check for orphaned records',
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
        if (issue.entityType === 'Prompt') {
          const { promptId } = issue.details as any;
          await prisma.prompt.delete({ where: { id: promptId } });

          results.push({
            issueId: issue.id,
            success: true,
            message: `Deleted orphaned prompt ${promptId}`,
          });
        } else if (issue.entityType === 'ImageVariant') {
          const { variantId } = issue.details as any;
          await prisma.imageVariant.delete({ where: { id: variantId } });

          results.push({
            issueId: issue.id,
            success: true,
            message: `Deleted orphaned image variant ${variantId}`,
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
