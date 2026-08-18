import { createFileRoute } from "@tanstack/react-router";

import { PharmacyDispense } from "@/components/pharmacy-dispense";
import { ResourceModule } from "@/components/resource-module";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { batchesConfig, pharmacyConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/pharmacy")({
  head: () => ({
    meta: [
      { title: "Pharmacy — Vision Care HMS" },
      { name: "description", content: "Dispense prescribed medicines with batch, expiry and stock control, billed through the clinic invoice engine." },
      { property: "og:title", content: "Pharmacy — Vision Care HMS" },
      { property: "og:description", content: "Prescription dispensing, batch and expiry tracking, and pharmacy stock." },
    ],
  }),
  component: PharmacyPage,
});

function PharmacyPage() {
  return (
    <Tabs defaultValue="dispense">
      <TabsList>
        <TabsTrigger value="dispense">Dispense</TabsTrigger>
        <TabsTrigger value="stock">Medicines</TabsTrigger>
        <TabsTrigger value="batches">Batches &amp; expiry</TabsTrigger>
      </TabsList>
      <TabsContent value="dispense" className="mt-4">
        <PharmacyDispense />
      </TabsContent>
      <TabsContent value="stock" className="mt-4">
        <ResourceModule config={pharmacyConfig} />
      </TabsContent>
      <TabsContent value="batches" className="mt-4">
        <ResourceModule config={batchesConfig} />
      </TabsContent>
    </Tabs>
  );
}
