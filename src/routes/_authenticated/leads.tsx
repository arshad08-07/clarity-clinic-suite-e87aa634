import { createFileRoute } from "@tanstack/react-router";

import { CrmFunnel } from "@/components/crm-funnel";
import { LeadActions } from "@/components/lead-actions";
import { ResourceModule } from "@/components/resource-module";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { leadActivitiesConfig, leadsConfig } from "@/lib/module-configs";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Vision Care HMS" },
      { name: "description", content: "Enquiry pipeline from first contact to converted patient, with activity logs." },
      { property: "og:title", content: "Leads — Vision Care HMS" },
      { property: "og:description", content: "Enquiry pipeline with follow-up activity logs and conversion tracking." },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  return (
    <Tabs defaultValue="pipeline">
      <TabsList>
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="activities">Activities</TabsTrigger>
        <TabsTrigger value="funnel">Conversion funnel</TabsTrigger>
      </TabsList>
      <TabsContent value="pipeline" className="mt-4">
        <ResourceModule
          config={{
            ...leadsConfig,
            
            rowActions: (row) => <LeadActions row={row} />,
          }}
        />
      </TabsContent>
      <TabsContent value="activities" className="mt-4">
        <ResourceModule config={leadActivitiesConfig} />
      </TabsContent>
      <TabsContent value="funnel" className="mt-4">
        <CrmFunnel />
      </TabsContent>
    </Tabs>
  );
}
