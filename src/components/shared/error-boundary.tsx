'use client';

/**
 * Error Boundary Component
 * Catches and displays errors in a user-friendly way
 */

import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-2xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>发生错误</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="text-sm">
                抱歉，应用程序遇到了一个错误。请尝试刷新页面或联系技术支持。
              </p>
              {this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-medium">
                    错误详情
                  </summary>
                  <pre className="mt-2 overflow-auto rounded bg-muted p-4 text-xs">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  刷新页面
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => this.setState({ hasError: false, error: null })}
                >
                  重试
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
