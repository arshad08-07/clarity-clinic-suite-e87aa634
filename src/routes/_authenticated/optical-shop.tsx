import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { opticalShopConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/optical-shop")({
  head: () => ({
    meta: [
      { title: "Optical Shop — Vision Care HMS" },
      { name: "description", content: "Manage optical shop in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Optical Shop — Vision Care HMS" },
      { property: "og:description", content: "Manage optical shop in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={opticalShopConfig} />,
});
