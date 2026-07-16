import { Component, ErrorInfo, ReactNode } from 'react'

interface PluginSlotProps {
  name: string
  children?: ReactNode
  fallback?: ReactNode
  maxHeight?: string
}

interface PluginSlotState {
  hasError: boolean
  error: Error | null
}

class PluginSlotInner extends Component<PluginSlotProps, PluginSlotState> {
  constructor(props: PluginSlotProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): PluginSlotState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[PluginSlot:${this.props.name}] Plugin component error:`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm">
            <p className="text-red-600 font-medium mb-1">插件组件异常</p>
            {this.state.error && (
              <pre className="text-xs text-red-500 mt-1 overflow-auto max-h-20">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="mt-2 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
            >
              重试
            </button>
          </div>
        )
      )
    }
    return (
      <div className="plugin-slot plugin-slot-{this.props.name}" style={{ contain: 'content', isolation: 'isolate', maxHeight: this.props.maxHeight || 'auto' }}>
        {this.props.children}
      </div>
    )
  }
}

export default function PluginSlot(props: PluginSlotProps) {
  return <PluginSlotInner {...props} />
}
