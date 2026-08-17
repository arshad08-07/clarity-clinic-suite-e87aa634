import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { queueConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/queue")({
  head: () => ({
    meta: [
      { title: "Live Queue — Vision Care HMS" },
      { name: "description", content: "Manage live queue in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Live Queue — Vision Care HMS" },
      { property: "og:description", content: "Manage live queue in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={queueConfig} />,
});
