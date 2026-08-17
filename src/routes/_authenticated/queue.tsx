import { createFileRoute } from "@tanstack/react-router";

import { AdvanceVisitButton, PatientRecordLink } from "@/components/clinic-actions";
import { ResourceModule } from "@/components/resource-module";
import { queueConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/queue")({
  head: () => ({
    meta: [
      { title: "Live Queue — Vision Care HMS" },
      { name: "description", content: "Token-wise live patient queue moving from waiting to optometry, doctor, diagnostics and billing." },
      { property: "og:title", content: "Live Queue — Vision Care HMS" },
      { property: "og:description", content: "Token-wise live patient queue across every clinic stage." },
    ],
  }),
  component: () => (
    <ResourceModule
      config={{
        ...queueConfig,
        rowActions: (row) => (
          <>
            <AdvanceVisitButton row={row} />
            {row["patient_id"] ? <PatientRecordLink patientId={String(row["patient_id"])} /> : null}
          </>
        ),
      }}
    />
  ),
});
