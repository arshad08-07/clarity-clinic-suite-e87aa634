import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { communicationsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/communications")({
  head: () => ({
    meta: [
      { title: "Communications — Vision Care HMS" },
      { name: "description", content: "Manage communications in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Communications — Vision Care HMS" },
      { property: "og:description", content: "Manage communications in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={communicationsConfig} />,
});
