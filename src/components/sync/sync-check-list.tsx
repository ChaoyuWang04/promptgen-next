'use client';

/**
 * Sync Check List Component
 * Displays detailed list of sync issues with repair actions
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SyncIssue, IssueSeverity, SyncCheckSummary } from '@/lib/sync/types';
import { AlertCircle, AlertTriangle, Info, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SyncCheckList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['syncCheck'],
    queryFn: async () => {
      const response = await fetch('/api/sync/check');
      if (!response.ok) throw new Error('Failed to run sync check');
      return response.json();
    },
  });

  const repairMutation = useMutation({
    mutationFn: async (issueIds: string[]) => {
      const response = await fetch('/api/sync/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'manual', issueIds }),
      });
      if (!response.ok) throw new Error('Repair failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Repair complete',
        description: `${data.data.successCount} issues repaired, ${data.data.failureCount} failed`,
      });
      setSelectedIssues(new Set());
      queryClient.invalidateQueries({ queryKey: ['syncCheck'] });
    },
    onError: (error) => {
      toast({
        title: 'Repair failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary: SyncCheckSummary = data?.data;
  const allIssues = summary?.checkerResults.flatMap((r) => r.issues) || [];

  const toggleIssue = (issueId: string) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedIssues(newSelected);
  };

  const toggleAll = () => {
    if (selectedIssues.size === allIssues.length) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(allIssues.map((i) => i.id)));
    }
  };

  const getSeverityIcon = (severity: IssueSeverity) => {
    const config = {
      [IssueSeverity.CRITICAL]: <AlertCircle className="h-4 w-4 text-red-500" />,
      [IssueSeverity.WARNING]: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
      [IssueSeverity.INFO]: <Info className="h-4 w-4 text-blue-500" />,
    };
    return config[severity];
  };

  const getSeverityBadge = (severity: IssueSeverity) => {
    const variants: Record<IssueSeverity, 'destructive' | 'default' | 'secondary'> = {
      [IssueSeverity.CRITICAL]: 'destructive',
      [IssueSeverity.WARNING]: 'default',
      [IssueSeverity.INFO]: 'secondary',
    };
    return <Badge variant={variants[severity]}>{severity}</Badge>;
  };

  const selectedRepairableIssues = Array.from(selectedIssues).filter((id) => {
    const issue = allIssues.find((i) => i.id === id);
    return issue?.canAutoRepair;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sync Issues ({allIssues.length})</CardTitle>
            <CardDescription>Detailed list of all synchronization issues</CardDescription>
          </div>
          {selectedRepairableIssues.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" size="sm">
                  <Wrench className="h-4 w-4 mr-2" />
                  Repair Selected ({selectedRepairableIssues.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Repair Selected Issues?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will attempt to repair {selectedRepairableIssues.length} selected issue(s).
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => repairMutation.mutate(selectedRepairableIssues)}
                  >
                    Repair
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {allIssues.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No issues found. All systems synchronized.
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIssues.size === allIssues.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-[80px]">Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[100px]">Auto-Repair</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allIssues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIssues.has(issue.id)}
                        onCheckedChange={() => toggleIssue(issue.id)}
                        disabled={!issue.canAutoRepair}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(issue.severity)}
                        {getSeverityBadge(issue.severity)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{issue.description}</div>
                        {issue.repairAction && (
                          <div className="text-xs text-muted-foreground">
                            Repair: {issue.repairAction}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {issue.canAutoRepair ? (
                        <Badge className="bg-green-500">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
