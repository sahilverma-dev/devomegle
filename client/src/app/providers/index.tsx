import { ErrorBoundary } from "react-error-boundary";
import { HelmetProvider } from "react-helmet-async";

import { Spinner } from "@/components/ui/spinner";
import { Suspense } from "react";
import { MainErrorFallback } from "@/components/errors/main";
import { AuthProvider } from "./auth-provider";
import { Toaster } from "sonner";

type AppProviderProps = {
  children: React.ReactNode;
};

const Provider = ({ children }: AppProviderProps) => {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center">
          <Spinner size="xl" />
        </div>
      }
    >
      <ErrorBoundary FallbackComponent={MainErrorFallback}>
        <HelmetProvider>
          <AuthProvider>
            {children}
            <Toaster richColors />
          </AuthProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </Suspense>
  );
};

export default Provider;
