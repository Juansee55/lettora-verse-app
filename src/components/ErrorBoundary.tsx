import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Algo salió mal</h1>
            <p className="text-muted-foreground max-w-xs mx-auto">
              La aplicación encontró un error inesperado al cargar esta sección.
            </p>
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            className="rounded-full px-8 gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Recargar aplicación
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-4 p-4 bg-muted rounded-lg text-left text-xs overflow-auto max-w-full">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.children;
  }
}

export default ErrorBoundary;
