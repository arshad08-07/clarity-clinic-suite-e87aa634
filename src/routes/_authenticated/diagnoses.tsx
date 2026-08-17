import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { diagnosesConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/diagnoses")({
  head: () => ({
    meta: [
      { title: "Diagnoses — Vision Care HMS" },
      { name: "description", content: "Manage diagnoses in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Diagnoses — Vision Care HMS" },
      { property: "og:description", content: "Manage diagnoses in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={diagnosesConfig} />,
});
