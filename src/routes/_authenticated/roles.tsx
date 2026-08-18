import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ShieldCheck, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABELS, useAuth, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/api";

const ASSIGNABLE_ROLES: AppRole[] = [
  "super_admin",
  "clinic_admin",
  "doctor",
  "optometrist",
  "receptionist",
  "nurse",
  "diagnostic_staff",
  "pharmacist",
  "optical_staff",
  "inventory_manager",
  "accountant",
  "crm_staff",
];

interface StaffRow {
  id: string;
  full_name: string;
  email: string | null;
  designation: string | null;
  branch_id: string | null;
  is_active: boolean;
}

function RolesPage() {
  const qc = useQueryClient();
  const { user, isSuperAdmin } = useAuth();
  const [search, setSearch] = useState("");

  const staff = useQuery({
    queryKey: ["roles-admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, designation, branch_id, is_active")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as StaffRow[];
    },
  });

  const roleRows = useQuery({
    queryKey: ["roles-admin", "user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id, user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const branches = useQuery({
    queryKey: ["roles-admin", "branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, code")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const extraBranches = useQuery({
    queryKey: ["roles-admin", "user_branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_branches").select("id, user_id, branch_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["roles-admin"] });
    void qc.invalidateQueries({ queryKey: ["my-roles"] });
    void qc.invalidateQueries({ queryKey: ["my-branches"] });
  }

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const removeRole = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role removed — this user now has no access");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const setBranch = useMutation({
    mutationFn: async ({ userId, branchId }: { userId: string; branchId: string | null }) => {
      const { error } = await supabase.from("profiles").update({ branch_id: branchId }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branch assignment updated");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const addExtraBranch = useMutation({
    mutationFn: async ({ userId, branchId }: { userId: string; branchId: string }) => {
      const { error } = await supabase.from("user_branches").insert({ user_id: userId, branch_id: branchId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Additional branch granted");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const removeExtraBranch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branch access revoked");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const term = search.trim().toLowerCase();
  const rows = (staff.data ?? []).filter(
    (s) =>
      !term ||
      s.full_name.toLowerCase().includes(term) ||
      (s.email ?? "").toLowerCase().includes(term),
  );

  function roleOf(userId: string): AppRole | null {
    const row = (roleRows.data ?? []).find((r) => r.user_id === userId);
    return (row?.role as AppRole | undefined) ?? null;
  }

  function branchName(id: string | null) {
    if (!id) return "Unassigned";
    return (branches.data ?? []).find((b) => b.id === id)?.name ?? "Unknown branch";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Access"
        description="Assign roles and branch access. Changes apply immediately to navigation, page permissions and database access."
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-start gap-3 py-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p>
              <strong className="text-foreground">Super Admin</strong> works across every branch.
              Everyone else only sees data from their assigned branch(es).
            </p>
            <p>
              Nobody can change their own role, and only a Super Admin can grant admin-level roles.
              Records with no branch are visible to Super Admins only.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Team access</CardTitle>
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff member</TableHead>
                <TableHead>Current role</TableHead>
                <TableHead>Primary branch</TableHead>
                <TableHead>Additional branches</TableHead>
                <TableHead className="text-right">Remove role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const self = s.id === user?.id;
                const current = roleOf(s.id);
                const extras = (extraBranches.data ?? []).filter((b) => b.user_id === s.id);
                const adminRoleLocked = !isSuperAdmin;
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium">{s.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">{s.email ?? "—"}</p>
                      {self ? (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          You
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={current ?? "none"}
                        disabled={self || setRole.isPending}
                        onValueChange={(v) =>
                          v === "none"
                            ? removeRole.mutate(s.id)
                            : setRole.mutate({ userId: s.id, role: v as AppRole })
                        }
                      >
                        <SelectTrigger className="w-52">
                          <SelectValue placeholder="No role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No access</SelectItem>
                          {ASSIGNABLE_ROLES.map((r) => (
                            <SelectItem
                              key={r}
                              value={r}
                              disabled={adminRoleLocked && (r === "super_admin" || r === "clinic_admin")}
                            >
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {self ? (
                        <p className="pt-1 text-[11px] text-muted-foreground">
                          You cannot change your own role
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={s.branch_id ?? "none"}
                        disabled={setBranch.isPending}
                        onValueChange={(v) =>
                          setBranch.mutate({ userId: s.id, branchId: v === "none" ? null : v })
                        }
                      >
                        <SelectTrigger className="w-52">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned (no data access)</SelectItem>
                          {(branches.data ?? []).map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="pt-1 text-[11px] text-muted-foreground">
                        {current === "super_admin" ? "Super Admin sees all branches" : branchName(s.branch_id)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {extras.map((e) => (
                          <Badge key={e.id} variant="secondary" className="gap-1">
                            {branchName(e.branch_id)}
                            <button
                              type="button"
                              onClick={() => removeExtraBranch.mutate(e.id)}
                              aria-label="Revoke branch access"
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                        <Select
                          value=""
                          onValueChange={(v) => addExtraBranch.mutate({ userId: s.id, branchId: v })}
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <span className="flex items-center gap-1">
                              <Building2 className="size-3" /> Add branch
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {(branches.data ?? [])
                              .filter(
                                (b) =>
                                  b.id !== s.branch_id && !extras.some((e) => e.branch_id === b.id),
                              )
                              .map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={self || !current}
                        onClick={() => removeRole.mutate(s.id)}
                        aria-label="Remove role"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No staff members found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Branch Access — Vision Care HMS" },
      {
        name: "description",
        content: "Assign staff roles and branch access for the eye hospital management system.",
      },
      { property: "og:title", content: "Roles & Branch Access — Vision Care HMS" },
      {
        property: "og:description",
        content: "Assign staff roles and branch access for the eye hospital management system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RolesPage,
});
