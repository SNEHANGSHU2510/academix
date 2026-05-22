import React from 'react';

export class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '20px', color: 'red', backgroundColor: 'black', height: '100vh', width: '100vw', overflow: 'auto'}}>
          <h1 style={{fontSize: '24px', fontWeight: 'bold'}}>React Error</h1>
          <pre style={{whiteSpace: 'pre-wrap', marginTop: '10px'}}>{this.state.error?.stack || this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
