import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { followUpsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — Vision Care HMS" },
      { name: "description", content: "Manage follow-ups in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Follow-ups — Vision Care HMS" },
      { property: "og:description", content: "Manage follow-ups in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={followUpsConfig} />,
});
