// components/ErrorBoundary.jsx
// Error boundary component for React error handling
/* eslint-env browser */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // You can log to an error reporting service here
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
          <div className="max-w-md mx-auto p-6 text-center">
            <h1 className="text-3xl font-bold mb-4 text-red-500">Đã xảy ra lỗi</h1>
            <p className="text-gray-300 mb-6">
              Xin lỗi, đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            >
              Quay về trang chủ
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-400">
                  Chi tiết lỗi (Development)
                </summary>
                <pre className="mt-2 text-xs bg-slate-800 p-4 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


