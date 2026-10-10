import React from 'react'

type Props = {
  children: React.ReactNode
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleReload = () => {
    const api = window.api
    if (api?.invoke) {
      void api.invoke('web-force-reload')
      return
    }
    window.location.reload()
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Foodpos hit an unexpected error. Reload the app to continue.
        </p>
        <p className="max-w-lg break-all font-mono text-xs text-muted-foreground/80">
          {this.state.error.message}
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background"
        >
          Reload
        </button>
      </div>
    )
  }
}
