import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  createOrganization,
  getTenantContext,
  switchOrganization,
} from "@/lib/organizations.functions";

export interface TenantOrganization {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string | null;
  currency: string | null;
  onboarding_completed: boolean;
  isOwner: boolean;
}

/** Which clinic organization this signed-in account is currently working in. */
export function useTenant(enabled = true) {
  const fetchContext = useServerFn(getTenantContext);
  const query = useQuery({
    queryKey: ["tenant-context"],
    enabled,
    staleTime: 30_000,
    queryFn: () => fetchContext(),
  });

  const organizations = (query.data?.organizations ?? []) as TenantOrganization[];
  const activeOrganizationId = query.data?.activeOrganizationId ?? null;

  return {
    loading: query.isLoading,
    organizations,
    activeOrganizationId,
    organization: organizations.find((o) => o.id === activeOrganizationId) ?? null,
    isPlatformAdmin: !!query.data?.isPlatformAdmin,
    /** True once we know the account has no clinic yet — it must onboard. */
    needsOnboarding: !query.isLoading && organizations.length === 0,
  };
}

export function useSwitchOrganization() {
  const run = useServerFn(switchOrganization);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (organizationId: string) => run({ data: { organizationId } }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useCreateOrganization() {
  const run = useServerFn(createOrganization);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      contactEmail?: string;
      contactPhone?: string;
      city?: string;
      timezone?: string;
      currency?: string;
      branchName?: string;
    }) =>
      run({
        data: {
          timezone: "Asia/Kolkata",
          currency: "INR",
          branchName: "Main Branch",
          ...input,
        },
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
