import { createFileRoute, Link } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { Button } from "@/components/ui/button";
import type { Row } from "@/lib/api";
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
  component: () => (
    <ResourceModule
      config={{
        ...surgeriesConfig,
        rowActions: (row: Row) => (
          <Button size="sm" variant="outline" asChild>
            <Link to="/surgery/$surgeryId" params={{ surgeryId: String(row["id"]) }}>
              Open
            </Link>
          </Button>
        ),
      }}
    />
  ),
});
