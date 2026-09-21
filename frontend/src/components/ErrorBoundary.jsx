import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-lg w-full text-center">
            <h1 className="text-3xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              An unexpected error has occurred. Our team has been notified.
            </p>
            {this.state.error && (
              <pre className="text-left bg-gray-200 p-4 rounded text-xs overflow-auto max-h-48 mb-4 text-red-700">
                {this.state.error.toString()}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
            <a
              href="/"
              className="bg-[#2c3e50] hover:bg-[#1a252f] text-white px-6 py-3 rounded font-medium transition inline-block"
              onClick={() => this.setState({ hasError: false })}
            >
              Return Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
