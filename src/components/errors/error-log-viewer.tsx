'use client';

/**
 * Error Log Viewer Component
 * Displays error logs in a table with filtering and pagination
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { ErrorLogEntry, ErrorLevel } from '@/lib/errors/types';
import { AlertCircle, Info, AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ErrorLogViewerProps {
  level?: ErrorLevel;
  search?: string;
  limit?: number;
}

export function ErrorLogViewer({
  level,
  search,
  limit = 100,
}: ErrorLogViewerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedError, setSelectedError] = useState<ErrorLogEntry | null>(null);

  // Fetch error logs
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['errors', level, search, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (level) params.append('level', level);
      if (search) params.append('search', search);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/errors?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch errors');
      return response.json();
    },
  });

  // Delete all errors mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/errors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteAll' }),
      });
      if (!response.ok) throw new Error('Failed to delete errors');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Errors deleted',
        description: `Deleted ${data.data.deletedCount} error logs`,
      });
      queryClient.invalidateQueries({ queryKey: ['errors'] });
      queryClient.invalidateQueries({ queryKey: ['errorStats'] });
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Cleanup old errors mutation
  const cleanupMutation = useMutation({
    mutationFn: async (daysToKeep: number) => {
      const response = await fetch('/api/errors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup', daysToKeep }),
      });
      if (!response.ok) throw new Error('Failed to cleanup errors');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Cleanup complete',
        description: `Deleted ${data.data.deletedCount} old error logs`,
      });
      queryClient.invalidateQueries({ queryKey: ['errors'] });
      queryClient.invalidateQueries({ queryKey: ['errorStats'] });
    },
    onError: (error) => {
      toast({
        title: 'Cleanup failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
      ERROR: 'destructive',
      WARN: 'default',
      INFO: 'secondary',
    };

    return (
      <Badge variant={variants[level] || 'default'}>
        {level}
      </Badge>
    );
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">Error Loading Logs</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Unknown error'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const errors = data?.data?.errors || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Error Logs</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading...' : `${errors.length} errors found`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cleanup
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cleanup Old Errors</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete error logs older than 30 days. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => cleanupMutation.mutate(30)}
                  >
                    Cleanup
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Errors?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all error logs. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAllMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : errors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No errors found
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Level</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[180px]">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((error: ErrorLogEntry) => (
                  <TableRow
                    key={error.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedError(error)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getLevelIcon(error.level)}
                        {getLevelBadge(error.level)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {error.message.length > 100
                        ? `${error.message.substring(0, 100)}...`
                        : error.message}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(error.createdAt), 'MMM d, yyyy HH:mm:ss')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Error details dialog */}
      {selectedError && (
        <AlertDialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
          <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {getLevelIcon(selectedError.level)}
                Error Details
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Level</div>
                {getLevelBadge(selectedError.level)}
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Message</div>
                <div className="font-mono text-sm bg-muted p-2 rounded">
                  {selectedError.message}
                </div>
              </div>
              {selectedError.stack && (
                <div>
                  <div className="text-sm font-medium mb-1">Stack Trace</div>
                  <pre className="font-mono text-xs bg-muted p-2 rounded overflow-auto max-h-60">
                    {selectedError.stack}
                  </pre>
                </div>
              )}
              {selectedError.context && (
                <div>
                  <div className="text-sm font-medium mb-1">Context</div>
                  <pre className="font-mono text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(selectedError.context, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <div className="text-sm font-medium mb-1">Timestamp</div>
                <div className="text-sm">
                  {format(new Date(selectedError.createdAt), 'MMMM d, yyyy HH:mm:ss')}
                </div>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
