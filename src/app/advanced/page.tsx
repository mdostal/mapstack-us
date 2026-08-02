import { Suspense } from "react";
import { PowerUserPanel } from "@/components/PowerUserPanel";

// useSharedViewParams (src/lib/shared-view-params.ts) reads useSearchParams(),
// which requires a Suspense boundary here or the whole route bails to
// client-side rendering at build time -- see pu-3 story context.
export default function AdvancedPage() {
  return (
    <Suspense>
      <PowerUserPanel />
    </Suspense>
  );
}
