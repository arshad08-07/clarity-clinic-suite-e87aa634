import { createFileRoute } from "@tanstack/react-router";

import { AppointmentActions } from "@/components/clinic-actions";
import { ResourceModule } from "@/components/resource-module";
import { appointmentsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — Vision Care HMS" },
      {
        name: "description",
        content: "Book, reschedule and check in appointments — check-in creates the visit and queue token automatically.",
      },
      { property: "og:title", content: "Appointments — Vision Care HMS" },
      {
        property: "og:description",
        content: "Appointment desk with one-click check-in into the live queue.",
      },
    ],
  }),
  component: () => (
    <ResourceModule
      config={{
        ...appointmentsConfig,
        rowActions: (row) => <AppointmentActions row={row} />,
      }}
    />
  ),
});
