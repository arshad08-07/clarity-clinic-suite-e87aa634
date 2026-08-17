import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { patientsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/patients")({
  head: () => ({
    meta: [
      { title: "Patients — Vision Care HMS" },
      { name: "description", content: "Manage patients in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Patients — Vision Care HMS" },
      { property: "og:description", content: "Manage patients in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={patientsConfig} />,
});
