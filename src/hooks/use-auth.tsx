import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin"
  | "clinic_admin"
  | "receptionist"
  | "doctor"
  | "optometrist"
  | "nurse"
  | "pharmacist"
  | "optical_staff"
  | "inventory_manager"
  | "accountant"
  | "diagnostic_staff"
  | "crm_staff"
  | "patient";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  clinic_admin: "Clinic Admin",
  receptionist: "Receptionist",
  doctor: "Doctor",
  optometrist: "Optometrist",
  nurse: "Nurse",
  pharmacist: "Pharmacist",
  optical_staff: "Optical Staff",
  inventory_manager: "Inventory Manager",
  accountant: "Accountant",
  diagnostic_staff: "Diagnostic Staff",
  crm_staff: "CRM / Marketing",
  patient: "Patient",
};

interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  branch_id: string | null;
  designation: string | null;
  specialization: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  roles: AppRole[];
  profile: Profile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** Every branch this user may work in (primary + additional assignments). */
  branchIds: string[];
  primaryBranchId: string | null;
  canAccessBranch: (branchId: string | null | undefined) => boolean;
  hasRole: (...roles: AppRole[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const rolesQuery = useQuery({
    queryKey: ["my-roles", userId],
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const profileQuery = useQuery({
    queryKey: ["my-profile", userId],
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, branch_id, designation, specialization")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });

  const branchesQuery = useQuery({
    queryKey: ["my-branches", userId],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_branches")
        .select("branch_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.branch_id as string);
    },
  });

  /* A role or branch change by an admin must take effect without a re-login. */
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`access-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_branches", filter: `user_id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const profile = profileQuery.data ?? null;
  const isSuperAdmin = roles.includes("super_admin");

  const branchIds = useMemo(() => {
    const set = new Set<string>(branchesQuery.data ?? []);
    if (profile?.branch_id) set.add(profile.branch_id);
    return [...set];
  }, [branchesQuery.data, profile?.branch_id]);

  useEffect(() => {
    setSessionContext({
      userId,
      roles,
      primaryBranchId: profile?.branch_id ?? null,
      branchIds,
      isSuperAdmin,
    });
  }, [userId, roles, profile?.branch_id, branchIds, isSuperAdmin]);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    loading: loading || (!!userId && rolesQuery.isLoading),
    roles,
    profile,
    isAdmin: isSuperAdmin || roles.includes("clinic_admin"),
    isSuperAdmin,
    branchIds,
    primaryBranchId: profile?.branch_id ?? null,
    canAccessBranch: (branchId) => isSuperAdmin || (!!branchId && branchIds.includes(branchId)),
    hasRole: (...r: AppRole[]) => r.some((x) => roles.includes(x)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
