import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { prescriptionsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/prescriptions")({
  head: () => ({
    meta: [
      { title: "Prescriptions — Vision Care HMS" },
      { name: "description", content: "Manage prescriptions in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Prescriptions — Vision Care HMS" },
      { property: "og:description", content: "Manage prescriptions in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={prescriptionsConfig} />,
});
