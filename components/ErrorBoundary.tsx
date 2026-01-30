"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 text-center" role="alert">
            <p className="text-red-600 mb-2">Something went wrong</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-sm underline"
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export function ChatErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center p-4" role="alert">
      <div className="text-center">
        <p className="text-red-600 mb-2">Failed to load chat</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm underline"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
