import { Component, type ErrorInfo, type ReactNode } from 'react';
import { sendTelegramErrorAlert } from '../lib/telegramAlerts';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Crash:', error, errorInfo);

    // Send immediate alert to Telegram
    sendTelegramErrorAlert({
      action: 'Frontend Component Crash (ErrorBoundary)',
      error: error.message || String(error),
      context: {
        componentStack: errorInfo.componentStack?.slice(0, 300),
      },
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center shadow-xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-6">
              An unexpected error occurred. The technical team has already been automatically alerted.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

