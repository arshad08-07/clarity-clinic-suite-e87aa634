import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { appointmentsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — Vision Care HMS" },
      { name: "description", content: "Manage appointments in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Appointments — Vision Care HMS" },
      { property: "og:description", content: "Manage appointments in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={appointmentsConfig} />,
});
