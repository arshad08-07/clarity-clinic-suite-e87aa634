import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { leadsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Vision Care HMS" },
      { name: "description", content: "Manage leads in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Leads — Vision Care HMS" },
      { property: "og:description", content: "Manage leads in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={leadsConfig} />,
});
