import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { settingsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Vision Care HMS" },
      { name: "description", content: "Manage settings in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Settings — Vision Care HMS" },
      { property: "og:description", content: "Manage settings in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={settingsConfig} />,
});
