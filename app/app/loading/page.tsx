import { Suspense } from "react";
import { LoadingContent } from "./LoadingContent";

export default function LoadingPage() {
  return (
    <Suspense>
      <LoadingContent />
    </Suspense>
  );
}
