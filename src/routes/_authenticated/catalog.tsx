import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { diagnosisCatalogConfig, diagnosticTestsConfig, stockMovementsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/catalog")({
  head: () => ({
    meta: [
      { title: "Clinical Catalog — Vision Care HMS" },
      {
        name: "description",
        content: "Diagnosis codes, diagnostic test pricing and stock movement history.",
      },
      { property: "og:title", content: "Clinical Catalog — Vision Care HMS" },
      {
        property: "og:description",
        content: "Diagnosis codes, diagnostic test pricing and stock movement history.",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  return (
    <Tabs defaultValue="diagnoses">
      <TabsList>
        <TabsTrigger value="diagnoses">Diagnosis codes</TabsTrigger>
        <TabsTrigger value="tests">Diagnostic tests</TabsTrigger>
        <TabsTrigger value="stock">Stock movements</TabsTrigger>
      </TabsList>
      <TabsContent value="diagnoses" className="mt-4">
        <ResourceModule config={diagnosisCatalogConfig} />
      </TabsContent>
      <TabsContent value="tests" className="mt-4">
        <ResourceModule config={diagnosticTestsConfig} />
      </TabsContent>
      <TabsContent value="stock" className="mt-4">
        <ResourceModule config={stockMovementsConfig} />
      </TabsContent>
    </Tabs>
  );
}
