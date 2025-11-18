/**
 * Prompt Sync Checker
 * Verifies prompt generation status matches actual prompts
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

export class PromptSyncChecker implements IChecker {
  name = 'Prompt Sync Checker';
  description = 'Verifies prompt generation status matches actual prompts';

  async check(): Promise<CheckResult> {
    const startTime = Date.now();
    const issues: SyncIssue[] = [];

    try {
      // Get all records
      const records = await prisma.record.findMany({
        include: {
          prompts: true,
        },
      });

      for (const record of records) {
        // Check if promptGenerated is true but no prompts exist
        if (record.promptGenerated && record.prompts.length === 0) {
          issues.push({
            id: uuidv4(),
            type: IssueType.PROMPT_SYNC,
            severity: IssueSeverity.WARNING,
            description: `Record ${record.imageId} marked as promptGenerated but has no prompts`,
            recordId: record.imageId,
            entityType: 'Record',
            details: { imageId: record.imageId },
            canAutoRepair: true,
            repairAction: 'Set promptGenerated to false',
          });
        }

        // Check if prompts exist but promptGenerated is false
        if (!record.promptGenerated && record.prompts.length > 0) {
          issues.push({
            id: uuidv4(),
            type: IssueType.PROMPT_SYNC,
            severity: IssueSeverity.INFO,
            description: `Record ${record.imageId} has prompts but promptGenerated is false`,
            recordId: record.imageId,
            entityType: 'Record',
            details: { imageId: record.imageId, promptCount: record.prompts.length },
            canAutoRepair: true,
            repairAction: 'Set promptGenerated to true',
          });
        }

        // Check if MAIN and DIFF prompts both exist
        if (record.prompts.length > 0) {
          const hasMain = record.prompts.some((p) => p.type === 'MAIN');
          const hasDiff = record.prompts.some((p) => p.type === 'DIFF');

          if (!hasMain) {
            issues.push({
              id: uuidv4(),
              type: IssueType.PROMPT_SYNC,
              severity: IssueSeverity.WARNING,
              description: `Record ${record.imageId} missing MAIN prompt`,
              recordId: record.imageId,
              entityType: 'Record',
              details: { imageId: record.imageId },
              canAutoRepair: false,
              repairAction: 'Generate MAIN prompt',
            });
          }

          if (!hasDiff) {
            issues.push({
              id: uuidv4(),
              type: IssueType.PROMPT_SYNC,
              severity: IssueSeverity.WARNING,
              description: `Record ${record.imageId} missing DIFF prompt`,
              recordId: record.imageId,
              entityType: 'Record',
              details: { imageId: record.imageId },
              canAutoRepair: false,
              repairAction: 'Generate DIFF prompt',
            });
          }
        }
      }
    } catch (error) {
      issues.push({
        id: uuidv4(),
        type: IssueType.PROMPT_SYNC,
        severity: IssueSeverity.CRITICAL,
        description: 'Failed to check prompt synchronization',
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

        // Fix promptGenerated flag
        if (issue.description.includes('marked as promptGenerated but has no prompts')) {
          await prisma.record.update({
            where: { imageId },
            data: { promptGenerated: false },
          });

          results.push({
            issueId: issue.id,
            success: true,
            message: `Set promptGenerated to false for ${imageId}`,
          });
        } else if (issue.description.includes('has prompts but promptGenerated is false')) {
          await prisma.record.update({
            where: { imageId },
            data: { promptGenerated: true },
          });

          results.push({
            issueId: issue.id,
            success: true,
            message: `Set promptGenerated to true for ${imageId}`,
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
