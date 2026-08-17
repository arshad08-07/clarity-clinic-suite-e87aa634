import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { diagnosticsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/diagnostics")({
  head: () => ({
    meta: [
      { title: "Diagnostics — Vision Care HMS" },
      { name: "description", content: "Manage diagnostics in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Diagnostics — Vision Care HMS" },
      { property: "og:description", content: "Manage diagnostics in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={diagnosticsConfig} />,
});
