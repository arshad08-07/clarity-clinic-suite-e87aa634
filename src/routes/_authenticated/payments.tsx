import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { paymentsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Vision Care HMS" },
      { name: "description", content: "Manage payments in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Payments — Vision Care HMS" },
      { property: "og:description", content: "Manage payments in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={paymentsConfig} />,
});
