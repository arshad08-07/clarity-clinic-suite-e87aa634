import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { opticalRxConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/optical-prescriptions")({
  head: () => ({
    meta: [
      { title: "Optical Prescriptions — Vision Care HMS" },
      { name: "description", content: "Manage optical prescriptions in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Optical Prescriptions — Vision Care HMS" },
      { property: "og:description", content: "Manage optical prescriptions in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={opticalRxConfig} />,
});
