import { Suspense } from "react";
import VerifyEmailContent from "./VerifyEmailContent";

function VerifyEmailFallback() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          Loading verification page...
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}