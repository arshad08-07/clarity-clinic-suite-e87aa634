import { createFileRoute } from "@tanstack/react-router";

import { PatientRecordLink } from "@/components/clinic-actions";
import { RegisterPatientDialog } from "@/components/register-patient-dialog";
import { ResourceModule } from "@/components/resource-module";
import { patientsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/patients")({
  head: () => ({
    meta: [
      { title: "Patients — Vision Care HMS" },
      { name: "description", content: "Patient master with MRN, demographics and full clinical record access." },
      { property: "og:title", content: "Patients — Vision Care HMS" },
      { property: "og:description", content: "Patient master with MRN, demographics and full clinical record access." },
    ],
  }),
  component: () => (
    <ResourceModule
      config={{
        ...patientsConfig,
        createAction: <RegisterPatientDialog />,
        rowActions: (row) => <PatientRecordLink patientId={String(row["id"])} />,
      }}
    />
  ),
});
