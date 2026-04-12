import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends (Component as any) {
  state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">عذراً، حدث خطأ ما</h1>
          <p className="text-stone-600 mb-6">يرجى المحاولة مرة أخرى لاحقاً.</p>
          <pre className="bg-stone-100 p-4 rounded-lg text-xs text-left overflow-auto max-w-full">
            {this.state.error?.message || JSON.stringify(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
