import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { branchesConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/branches")({
  head: () => ({
    meta: [
      { title: "Branches — Vision Care HMS" },
      { name: "description", content: "Manage branches in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Branches — Vision Care HMS" },
      { property: "og:description", content: "Manage branches in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={branchesConfig} />,
});
