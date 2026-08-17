import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { expensesConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Vision Care HMS" },
      { name: "description", content: "Manage expenses in the Vision Care eye hospital management system." },
      { property: "og:title", content: "Expenses — Vision Care HMS" },
      { property: "og:description", content: "Manage expenses in the Vision Care eye hospital management system." },
    ],
  }),
  component: () => <ResourceModule config={expensesConfig} />,
});
