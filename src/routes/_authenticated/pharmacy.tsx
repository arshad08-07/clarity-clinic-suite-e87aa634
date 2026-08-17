import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { batchesConfig, pharmacyConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/pharmacy")({
  head: () => ({
    meta: [
      { title: "Pharmacy — Vision Care HMS" },
      { name: "description", content: "In-house pharmacy stock with batch numbers, expiry tracking and reorder levels." },
      { property: "og:title", content: "Pharmacy — Vision Care HMS" },
      { property: "og:description", content: "Pharmacy stock with batch and expiry tracking." },
    ],
  }),
  component: PharmacyPage,
});

function PharmacyPage() {
  return (
    <Tabs defaultValue="stock">
      <TabsList>
        <TabsTrigger value="stock">Medicines</TabsTrigger>
        <TabsTrigger value="batches">Batches &amp; expiry</TabsTrigger>
      </TabsList>
      <TabsContent value="stock" className="mt-4">
        <ResourceModule config={pharmacyConfig} />
      </TabsContent>
      <TabsContent value="batches" className="mt-4">
        <ResourceModule config={batchesConfig} />
      </TabsContent>
    </Tabs>
  );
}
