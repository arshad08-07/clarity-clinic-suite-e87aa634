import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { insuranceConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/insurance")({
  head: () => ({
    meta: [
      { title: "Insurance Claims — Vision Care HMS" },
      { name: "description", content: "Manage insurance claims in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Insurance Claims — Vision Care HMS" },
      { property: "og:description", content: "Manage insurance claims in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={insuranceConfig} />,
});
