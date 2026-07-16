import { Component, ErrorInfo, ReactNode } from 'react'
import * as Sentry from '@sentry/electron/renderer'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 保留原有 console.error 日志
    console.error('[ErrorBoundary] 捕获到未处理错误:', error, errorInfo)
    // 上报到 Sentry
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            {/* 错误图标 */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            {/* 标题和描述 */}
            <h1 className="text-xl font-bold text-gray-800 mb-2">应用遇到错误</h1>
            <p className="text-sm text-gray-500 mb-4">
              抱歉，应用遇到了意外错误。您可以尝试重新加载页面。
            </p>
            {/* 错误详情（可折叠） */}
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600">
                  查看错误详情
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-red-600 overflow-auto max-h-40">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            {/* 操作按钮 */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
