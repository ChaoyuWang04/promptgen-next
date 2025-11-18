/**
 * Invalid References Checker
 * Finds records with invalid foreign key references
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

export class InvalidRefsChecker implements IChecker {
  name = 'Invalid References Checker';
  description = 'Finds records with invalid library IDs or missing references';

  async check(): Promise<CheckResult> {
    const startTime = Date.now();
    const issues: SyncIssue[] = [];

    try {
      // Get all records
      const records = await prisma.record.findMany();

      // Get all library names for validation
      const libraries = await prisma.library.findMany({ select: { name: true } });
      const validLibraryNames = new Set(libraries.map((l) => l.name));

      for (const record of records) {
        const libraryIds = record.libraryIds as Record<string, string>;

        // Check if libraryIds is valid
        if (!libraryIds || typeof libraryIds !== 'object') {
          issues.push({
            id: uuidv4(),
            type: IssueType.INVALID_REFS,
            severity: IssueSeverity.CRITICAL,
            description: `Record ${record.imageId} has invalid libraryIds structure`,
            recordId: record.imageId,
            entityType: 'Record',
            details: { imageId: record.imageId, libraryIds },
            canAutoRepair: false,
            repairAction: 'Manual intervention required',
          });
          continue;
        }

        // Check each library reference
        for (const [libraryName, entryId] of Object.entries(libraryIds)) {
          // Check if library exists
          if (!validLibraryNames.has(libraryName)) {
            issues.push({
              id: uuidv4(),
              type: IssueType.INVALID_REFS,
              severity: IssueSeverity.CRITICAL,
              description: `Record ${record.imageId} references non-existent library "${libraryName}"`,
              recordId: record.imageId,
              entityType: 'Record',
              details: { imageId: record.imageId, libraryName, entryId },
              canAutoRepair: false,
              repairAction: 'Remove invalid library reference',
            });
            continue;
          }

          // Check if entry exists in library
          const library = await prisma.library.findUnique({
            where: { name: libraryName },
          });

          if (library && Array.isArray(library.entries)) {
            const entries = library.entries as any[];
            const entryExists = entries.some((e) => e.id === entryId);

            if (!entryExists) {
              issues.push({
                id: uuidv4(),
                type: IssueType.INVALID_REFS,
                severity: IssueSeverity.WARNING,
                description: `Record ${record.imageId} references non-existent entry "${entryId}" in library "${libraryName}"`,
                recordId: record.imageId,
                entityType: 'Record',
                details: { imageId: record.imageId, libraryName, entryId },
                canAutoRepair: false,
                repairAction: 'Update to valid entry ID or remove reference',
              });
            }
          }
        }
      }
    } catch (error) {
      issues.push({
        id: uuidv4(),
        type: IssueType.INVALID_REFS,
        severity: IssueSeverity.CRITICAL,
        description: 'Failed to check invalid references',
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
    // Most invalid reference issues require manual intervention
    return issues.map((issue) => ({
      issueId: issue.id,
      success: false,
      message: 'Invalid references require manual intervention',
      error: issue.repairAction,
    }));
  }
}
