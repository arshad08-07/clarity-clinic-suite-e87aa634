import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { otRoomsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/ot-rooms")({
  head: () => ({
    meta: [
      { title: "OT Rooms — Vision Care HMS" },
      { name: "description", content: "Manage ot rooms in the Vision Care eye hospital management system." },
      { property: "og:title", content: "OT Rooms — Vision Care HMS" },
      { property: "og:description", content: "Manage ot rooms in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={otRoomsConfig} />,
});
