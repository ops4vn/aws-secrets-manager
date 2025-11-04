import { AlertCircle, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ErrorPageProps {
  error?: Error;
  resetError?: () => void;
  statusCode?: number;
  message?: string;
}

export function ErrorPage({
  error,
  statusCode = 500,
  message = "Oops! Something went wrong",
}: ErrorPageProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 text-base-content p-4">
      <div className="flex flex-col items-center gap-6 max-w-md">
        {/* Error Icon */}
        <div className="rounded-full bg-error/10 p-4">
          <AlertCircle className="h-16 w-16 text-error" />
        </div>

        {/* Error Code */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-error mb-2">{statusCode}</h1>
          <h2 className="text-2xl font-semibold text-base-content mb-2">
            {message}
          </h2>
        </div>

        {/* Error Details */}
        {error && (
          <div className="w-full bg-base-300 rounded-lg p-4 max-h-32 overflow-y-auto">
            <p className="text-xs font-mono text-error mb-2 font-semibold">
              Error Details:
            </p>
            <p className="text-xs text-base-content/70 whitespace-pre-wrap wrap-break-word">
              {error.message}
            </p>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs font-semibold cursor-pointer text-base-content/60 hover:text-base-content">
                  Stack Trace
                </summary>
                <pre className="text-xs mt-2 text-base-content/50 overflow-auto max-h-24">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleGoHome}
            className="btn btn-outline w-full gap-2"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </button>
          <button
            onClick={handleReload}
            className="btn btn-ghost w-full text-sm"
          >
            Reload Page
          </button>
        </div>

        {/* Help Text */}
        <p className="text-sm text-base-content/50 text-center">
          If this problem persists, please try refreshing the page or contact
          support.
        </p>
      </div>
    </div>
  );
}
