import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { equipmentConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment — Vision Care HMS" },
      { name: "description", content: "Manage equipment in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Equipment — Vision Care HMS" },
      { property: "og:description", content: "Manage equipment in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={equipmentConfig} />,
});
