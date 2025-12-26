import { Component } from 'react';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark flex items-center justify-center px-4">
          <div className="max-w-2xl w-full text-center">
            <div className="bg-dark-light border-2 border-red-500 rounded-xl p-8">
              <FaExclamationTriangle className="text-6xl text-red-500 mx-auto mb-6" />
              
              <h1 className="text-3xl font-display font-bold text-white mb-4">
                Что-то пошло не так
              </h1>
              
              <p className="text-gray-400 mb-6">
                Произошла непредвиденная ошибка. Попробуйте обновить страницу.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left mb-6 bg-dark border border-gray-700 rounded-lg p-4">
                  <summary className="text-red-400 font-mono text-sm cursor-pointer mb-2">
                    Детали ошибки (только для разработки)
                  </summary>
                  <pre className="text-xs text-gray-300 overflow-auto">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="btn-primary flex items-center space-x-2"
                >
                  <FaRedo />
                  <span>Попробовать снова</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn-secondary"
                >
                  На главную
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
