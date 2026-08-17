import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { inventoryConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Vision Care HMS" },
      { name: "description", content: "Manage inventory in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Inventory — Vision Care HMS" },
      { property: "og:description", content: "Manage inventory in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={inventoryConfig} />,
});
