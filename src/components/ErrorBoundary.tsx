import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** When this changes (e.g. on navigation) the boundary resets. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/** Stops one broken page from blanking the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    // A failed lazy chunk usually means a new version was deployed.
    const isChunkError = /Loading chunk|dynamically imported module|Importing a module script failed/i.test(
      this.state.error.message,
    );

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {isChunkError ? 'A new version is available' : 'Something went wrong on this page'}
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {isChunkError
            ? 'Reload to get the latest version of the Tender Tracker.'
            : 'Try again, or reload the page. If it keeps happening, let the system administrator know.'}
        </p>
        <div className="flex gap-2">
          {!isChunkError && (
            <Button variant="outline" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          )}
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
        </div>
      </div>
    );
  }
}
