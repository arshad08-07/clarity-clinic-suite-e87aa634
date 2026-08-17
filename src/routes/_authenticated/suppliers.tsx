import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { suppliersConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — Vision Care HMS" },
      { name: "description", content: "Manage suppliers in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Suppliers — Vision Care HMS" },
      { property: "og:description", content: "Manage suppliers in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={suppliersConfig} />,
});
