import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { pharmacyConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/pharmacy")({
  head: () => ({
    meta: [
      { title: "Pharmacy — Vision Care HMS" },
      { name: "description", content: "Manage pharmacy in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Pharmacy — Vision Care HMS" },
      { property: "og:description", content: "Manage pharmacy in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={pharmacyConfig} />,
});
