import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { procurementConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/procurement")({
  head: () => ({
    meta: [
      { title: "Purchase Orders — Vision Care HMS" },
      { name: "description", content: "Manage purchase orders in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Purchase Orders — Vision Care HMS" },
      { property: "og:description", content: "Manage purchase orders in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={procurementConfig} />,
});
