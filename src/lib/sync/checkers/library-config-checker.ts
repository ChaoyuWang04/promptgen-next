/**
 * Library Configuration Checker
 * Verifies library entries match schema and have required fields
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

export class LibraryConfigChecker implements IChecker {
  name = 'Library Configuration Checker';
  description = 'Verifies library entries have required fields and valid structure';

  async check(): Promise<CheckResult> {
    const startTime = Date.now();
    const issues: SyncIssue[] = [];

    try {
      // Get all libraries
      const libraries = await prisma.library.findMany();

      for (const library of libraries) {
        // Check if entries is valid JSON array
        if (!Array.isArray(library.entries)) {
          issues.push({
            id: uuidv4(),
            type: IssueType.LIBRARY_CONFIG,
            severity: IssueSeverity.CRITICAL,
            description: `Library "${library.name}" has invalid entries (not an array)`,
            entityType: 'Library',
            details: { libraryId: library.id, libraryName: library.name },
            canAutoRepair: false,
            repairAction: 'Manual intervention required to fix entries structure',
          });
          continue;
        }

        // Check each entry has required fields
        const entries = library.entries as any[];
        entries.forEach((entry, index) => {
          // Check for id field
          if (!entry.id) {
            issues.push({
              id: uuidv4(),
              type: IssueType.LIBRARY_CONFIG,
              severity: IssueSeverity.WARNING,
              description: `Library "${library.name}" entry at index ${index} missing 'id' field`,
              entityType: 'Library',
              details: {
                libraryId: library.id,
                libraryName: library.name,
                entryIndex: index,
                entry,
              },
              canAutoRepair: true,
              repairAction: 'Generate UUID for missing id',
            });
          }

          // Check for name_en field (required for most libraries)
          if (!entry.name_en && library.name !== 'decorative_props') {
            issues.push({
              id: uuidv4(),
              type: IssueType.LIBRARY_CONFIG,
              severity: IssueSeverity.INFO,
              description: `Library "${library.name}" entry at index ${index} missing 'name_en' field`,
              entityType: 'Library',
              details: {
                libraryId: library.id,
                libraryName: library.name,
                entryIndex: index,
                entry,
              },
              canAutoRepair: false,
              repairAction: 'Manually add name_en field',
            });
          }
        });
      }
    } catch (error) {
      issues.push({
        id: uuidv4(),
        type: IssueType.LIBRARY_CONFIG,
        severity: IssueSeverity.CRITICAL,
        description: 'Failed to check library configuration',
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
        // Repair missing id fields
        if (issue.description.includes('missing \'id\' field')) {
          const { libraryId, entryIndex } = issue.details as any;

          const library = await prisma.library.findUnique({
            where: { id: libraryId },
          });

          if (library && Array.isArray(library.entries)) {
            const entries = library.entries as any[];
            if (entries[entryIndex]) {
              entries[entryIndex].id = uuidv4();

              await prisma.library.update({
                where: { id: libraryId },
                data: { entries: entries as any },
              });

              results.push({
                issueId: issue.id,
                success: true,
                message: `Generated id for entry at index ${entryIndex}`,
              });
            }
          }
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
