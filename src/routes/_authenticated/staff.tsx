import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { staffConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Staff & Roles — Vision Care HMS" },
      { name: "description", content: "Clinic team directory, designations and branch assignment." },
      { property: "og:title", content: "Staff & Roles — Vision Care HMS" },
      {
        property: "og:description",
        content: "Clinic team directory, designations and branch assignment.",
      },
    ],
  }),
  component: () => <ResourceModule config={staffConfig} />,
});
