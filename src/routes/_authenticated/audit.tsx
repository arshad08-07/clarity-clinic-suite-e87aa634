import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { auditConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Logs — Vision Care HMS" },
      { name: "description", content: "Manage audit logs in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Audit Logs — Vision Care HMS" },
      { property: "og:description", content: "Manage audit logs in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={auditConfig} />,
});
