import { createFileRoute } from "@tanstack/react-router";

import { OpticalOrderDialog } from "@/components/optical-order-dialog";
import { ResourceModule } from "@/components/resource-module";
import { Button } from "@/components/ui/button";
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
  component: () => (
    <ResourceModule
      config={{
        ...opticalRxConfig,
        rowActions: (row) => (
          <OpticalOrderDialog
            rx={row}
            patientId={String(row["patient_id"])}
            visitId={row["visit_id"] ? String(row["visit_id"]) : null}
            trigger={
              <Button size="sm" variant="outline">
                Create order
              </Button>
            }
          />
        ),
      }}
    />
  ),
});
