import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { surgeriesConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/surgeries")({
  head: () => ({
    meta: [
      { title: "Surgeries — Vision Care HMS" },
      { name: "description", content: "Manage surgeries in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Surgeries — Vision Care HMS" },
      { property: "og:description", content: "Manage surgeries in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={surgeriesConfig} />,
});
