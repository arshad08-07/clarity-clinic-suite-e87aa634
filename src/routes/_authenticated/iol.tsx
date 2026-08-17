import { createFileRoute } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { iolInventoryConfig, iolModelsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/iol")({
  head: () => ({
    meta: [
      { title: "IOL & Implants — Vision Care HMS" },
      {
        name: "description",
        content: "Intraocular lens catalog and serial-tracked implant inventory.",
      },
      { property: "og:title", content: "IOL & Implants — Vision Care HMS" },
      {
        property: "og:description",
        content: "Intraocular lens catalog and serial-tracked implant inventory.",
      },
    ],
  }),
  component: IolPage,
});

function IolPage() {
  return (
    <Tabs defaultValue="inventory">
      <TabsList>
        <TabsTrigger value="inventory">Implant stock</TabsTrigger>
        <TabsTrigger value="models">IOL models</TabsTrigger>
      </TabsList>
      <TabsContent value="inventory" className="mt-4">
        <ResourceModule config={iolInventoryConfig} />
      </TabsContent>
      <TabsContent value="models" className="mt-4">
        <ResourceModule config={iolModelsConfig} />
      </TabsContent>
    </Tabs>
  );
}
