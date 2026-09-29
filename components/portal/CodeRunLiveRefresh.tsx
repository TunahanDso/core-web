"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TERMINAL_STATES = new Set(["passed","failed","timed_out","cancelled"]);

export function CodeRunLiveRefresh({
  runId,
  active,
}: {
  runId: string;
  active: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) return;
      if (document.visibilityState !== "visible") {
        timer = setTimeout(poll,4000);
        return;
      }

      try {
        const response = await fetch(
          "/api/portal/code-lab/" + encodeURIComponent(runId) + "/status",
          { credentials:"same-origin", cache:"no-store", headers:{ accept:"application/json" } }
        );
        if (response.ok) {
          const payload = await response.json() as { status?: string };
          if (TERMINAL_STATES.has(String(payload.status || ""))) {
            router.refresh();
            return;
          }
        }
      } catch {
        // A transient status request must not turn into a full-page refresh storm.
      }

      timer = setTimeout(poll,3000);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [active,runId,router]);

  return null;
}
