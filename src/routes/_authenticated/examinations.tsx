import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { examinationsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/examinations")({
  head: () => ({
    meta: [
      { title: "Eye Examinations — Vision Care HMS" },
      { name: "description", content: "Manage eye examinations in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Eye Examinations — Vision Care HMS" },
      { property: "og:description", content: "Manage eye examinations in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={examinationsConfig} />,
});
