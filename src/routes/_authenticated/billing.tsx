import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { invoicesConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Vision Care HMS" },
      { name: "description", content: "Manage billing in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Billing — Vision Care HMS" },
      { property: "og:description", content: "Manage billing in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={invoicesConfig} />,
});
