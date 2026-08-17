import { createFileRoute } from "@tanstack/react-router";

import { CheckInButton, PatientRecordLink } from "@/components/clinic-actions";
import { ResourceModule } from "@/components/resource-module";
import { appointmentsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — Vision Care HMS" },
      { name: "description", content: "Book, reschedule and check in appointments with automatic visit and token creation." },
      { property: "og:title", content: "Appointments — Vision Care HMS" },
      { property: "og:description", content: "Book, reschedule and check in appointments with automatic queue entry." },
    ],
  }),
  component: () => (
    <ResourceModule
      config={{
        ...appointmentsConfig,
        rowActions: (row) => (
          <>
            <CheckInButton row={row} />
            {row["patient_id"] ? <PatientRecordLink patientId={String(row["patient_id"])} /> : null}
          </>
        ),
      }}
    />
  ),
});
