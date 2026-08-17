import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { optometryConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/optometry")({
  head: () => ({
    meta: [
      { title: "Optometry — Vision Care HMS" },
      { name: "description", content: "Manage optometry in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Optometry — Vision Care HMS" },
      { property: "og:description", content: "Manage optometry in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={optometryConfig} />,
});
