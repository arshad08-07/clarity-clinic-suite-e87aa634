import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateOrganization, useTenant } from "@/lib/tenancy";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your clinic — Vision Care HMS" },
      { name: "description", content: "Create your clinic organization and start managing patients, appointments and billing." },
      { property: "og:title", content: "Set up your clinic — Vision Care HMS" },
      { property: "og:description", content: "Create your clinic organization and start managing patients, appointments and billing." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { organizations, loading } = useTenant();
  const createOrg = useCreateOrganization();
  const [form, setForm] = useState({
    name: "",
    contactPhone: "",
    contactEmail: "",
    city: "",
    branchName: "Main Branch",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!loading && organizations.length > 0) {
    void navigate({ to: "/dashboard", replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error("Enter your clinic name");
      return;
    }
    try {
      await createOrg.mutateAsync(form);
      toast.success("Clinic created — welcome aboard");
      void navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the clinic");
    }
  }

  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Eye className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-semibold">Set up your clinic</h1>
          <p className="text-sm text-muted-foreground">
            This creates your own private workspace. No other clinic can ever see your data.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-5">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Clinic name</Label>
          <Input id="org-name" value={form.name} onChange={set("name")} placeholder="Vision Care Eye Hospital" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-phone">Contact phone</Label>
            <Input id="org-phone" value={form.contactPhone} onChange={set("contactPhone")} placeholder="9876543210" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-email">Contact email</Label>
            <Input id="org-email" type="email" value={form.contactEmail} onChange={set("contactEmail")} placeholder="front-desk@clinic.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-city">City</Label>
            <Input id="org-city" value={form.city} onChange={set("city")} placeholder="Jaipur" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-branch">First branch name</Label>
            <Input id="org-branch" value={form.branchName} onChange={set("branchName")} />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={createOrg.isPending}>
          {createOrg.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create clinic workspace
        </Button>
        <p className="text-xs text-muted-foreground">
          You become the clinic administrator and can invite staff with their own roles afterwards.
        </p>
      </form>
    </div>
  );
}
