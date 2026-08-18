import { createFileRoute, Link } from "@tanstack/react-router";

import { ResourceModule } from "@/components/resource-module";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { opticalOrdersConfig, opticalShopConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/optical-shop")({
  head: () => ({
    meta: [
      { title: "Optical Shop — Vision Care HMS" },
      { name: "description", content: "Frames, lenses and contact lens stock plus prescription-linked optical orders." },
      { property: "og:title", content: "Optical Shop — Vision Care HMS" },
      { property: "og:description", content: "Optical stock and prescription-linked spectacle orders." },
    ],
  }),
  component: OpticalShopPage,
});

function OpticalShopPage() {
  return (
    <Tabs defaultValue="orders">
      <TabsList>
        <TabsTrigger value="orders">Orders</TabsTrigger>
        <TabsTrigger value="stock">Stock</TabsTrigger>
      </TabsList>
      <TabsContent value="orders" className="mt-4">
        <ResourceModule
          config={{
            ...opticalOrdersConfig,
            rowActions: (row) => (
              <Button asChild size="sm" variant="outline">
                <Link to="/optical-order/$orderId" params={{ orderId: String(row["id"]) }}>
                  Open
                </Link>
              </Button>
            ),
          }}
        />
      </TabsContent>
      <TabsContent value="stock" className="mt-4">
        <ResourceModule config={opticalShopConfig} />
      </TabsContent>
    </Tabs>
  );
}
