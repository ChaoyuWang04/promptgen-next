/**
 * Error State Component
 * Displays error messages with retry functionality
 * Inspired by Stripe and Airbnb error handling
 */

import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | unknown;
  onRetry?: () => void;
  onGoHome?: () => void;
  variant?: 'inline' | 'full' | 'card';
  showErrorCode?: boolean;
}

/**
 * Extract error code from error object
 */
function getErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code;
  }
  return null;
}

/**
 * Extract error message from error object
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message;
  }
  return 'An unknown error occurred';
}

export function ErrorState({
  title = '加载失败',
  message,
  error,
  onRetry,
  onGoHome,
  variant = 'full',
  showErrorCode = true,
}: ErrorStateProps) {
  const errorMessage = message || (error ? getErrorMessage(error) : '无法加载数据。请稍后重试或检查网络连接。');
  const errorCode = error ? getErrorCode(error) : null;

  // Inline variant - simple alert
  if (variant === 'inline') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{errorMessage}</span>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="ml-4 shrink-0"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              重试
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Card variant - contained in card
  if (variant === 'card') {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              {showErrorCode && errorCode && (
                <p className="text-xs font-mono text-muted-foreground">
                  错误代码: {errorCode}
                </p>
              )}
              {(onRetry || onGoHome) && (
                <div className="flex gap-2 pt-2">
                  {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      重试
                    </Button>
                  )}
                  {onGoHome && (
                    <Button variant="ghost" size="sm" onClick={onGoHome}>
                      <Home className="mr-2 h-3 w-3" />
                      返回首页
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant - centered full page error
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="max-w-md text-muted-foreground">{errorMessage}</p>
        {showErrorCode && errorCode && (
          <p className="text-sm font-mono text-muted-foreground pt-2">
            错误代码: {errorCode}
          </p>
        )}
      </div>
      {(onRetry || onGoHome) && (
        <div className="flex gap-3 pt-4">
          {onRetry && (
            <Button variant="default" onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
          )}
          {onGoHome && (
            <Button variant="outline" onClick={onGoHome}>
              <Home className="mr-2 h-4 w-4" />
              返回首页
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Empty State Component
 * Displays when there's no data to show
 */
interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title = '暂无数据',
  message = '还没有任何内容。开始创建吧!',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center space-y-4 text-center">
      {icon && <div className="text-muted-foreground/50">{icon}</div>}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      </div>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
