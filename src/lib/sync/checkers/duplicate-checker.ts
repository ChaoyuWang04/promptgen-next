/**
 * Duplicate Checker
 * Finds duplicate records, prompts, and image variants
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

export class DuplicateChecker implements IChecker {
  name = 'Duplicate Checker';
  description = 'Finds duplicate records, prompts, and image variants';

  async check(): Promise<CheckResult> {
    const startTime = Date.now();
    const issues: SyncIssue[] = [];

    try {
      // Check for duplicate imageIds (should be unique)
      const records = await prisma.record.findMany();
      const imageIdCounts = new Map<string, number>();

      for (const record of records) {
        imageIdCounts.set(record.imageId, (imageIdCounts.get(record.imageId) || 0) + 1);
      }

      for (const [imageId, count] of imageIdCounts) {
        if (count > 1) {
          issues.push({
            id: uuidv4(),
            type: IssueType.DUPLICATE_RECORDS,
            severity: IssueSeverity.CRITICAL,
            description: `Duplicate imageId found: ${imageId} appears ${count} times`,
            recordId: imageId,
            entityType: 'Record',
            details: { imageId, count },
            canAutoRepair: false,
            repairAction: 'Manual intervention required to resolve duplicates',
          });
        }
      }

      // Check for duplicate prompts (same recordId + type)
      const prompts = await prisma.prompt.findMany();
      const promptKeys = new Map<string, number>();

      for (const prompt of prompts) {
        const key = `${prompt.recordId}_${prompt.type}`;
        promptKeys.set(key, (promptKeys.get(key) || 0) + 1);
      }

      for (const [key, count] of promptKeys) {
        if (count > 1) {
          const [recordId, type] = key.split('_');
          issues.push({
            id: uuidv4(),
            type: IssueType.DUPLICATE_RECORDS,
            severity: IssueSeverity.WARNING,
            description: `Duplicate prompt found for record ${recordId} (type: ${type})`,
            recordId: recordId,
            entityType: 'Prompt',
            details: { recordId, type, count },
            canAutoRepair: true,
            repairAction: 'Keep newest prompt, delete older duplicates',
          });
        }
      }

      // Check for duplicate image variants (same recordId + version)
      const imageVariants = await prisma.imageVariant.findMany();
      const variantKeys = new Map<string, number>();

      for (const variant of imageVariants) {
        const key = `${variant.recordId}_${variant.version}`;
        variantKeys.set(key, (variantKeys.get(key) || 0) + 1);
      }

      for (const [key, count] of variantKeys) {
        if (count > 1) {
          const [recordId, version] = key.split('_');
          issues.push({
            id: uuidv4(),
            type: IssueType.DUPLICATE_RECORDS,
            severity: IssueSeverity.WARNING,
            description: `Duplicate image variant found for record ${recordId} (version: ${version})`,
            recordId: recordId,
            entityType: 'ImageVariant',
            details: { recordId, version, count },
            canAutoRepair: true,
            repairAction: 'Keep newest variant, delete older duplicates',
          });
        }
      }
    } catch (error) {
      issues.push({
        id: uuidv4(),
        type: IssueType.DUPLICATE_RECORDS,
        severity: IssueSeverity.CRITICAL,
        description: 'Failed to check for duplicates',
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
          const { recordId, type } = issue.details as any;

          // Find all duplicate prompts
          const duplicates = await prisma.prompt.findMany({
            where: { recordId, type },
            orderBy: { createdAt: 'desc' },
          });

          // Keep the newest, delete others
          for (let i = 1; i < duplicates.length; i++) {
            await prisma.prompt.delete({ where: { id: duplicates[i].id } });
          }

          results.push({
            issueId: issue.id,
            success: true,
            message: `Deleted ${duplicates.length - 1} duplicate prompts`,
          });
        } else if (issue.entityType === 'ImageVariant') {
          const { recordId, version } = issue.details as any;

          // Find all duplicate variants
          const duplicates = await prisma.imageVariant.findMany({
            where: { recordId, version: parseInt(version) },
            orderBy: { generatedAt: 'desc' },
          });

          // Keep the newest, delete others
          for (let i = 1; i < duplicates.length; i++) {
            await prisma.imageVariant.delete({ where: { id: duplicates[i].id } });
          }

          results.push({
            issueId: issue.id,
            success: true,
            message: `Deleted ${duplicates.length - 1} duplicate image variants`,
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
