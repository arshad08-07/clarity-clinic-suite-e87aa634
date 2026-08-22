import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Tenant lifecycle lives on the server: creating an organization has to write
 * rows that do not yet belong to any tenant, so it cannot be done from the
 * browser under RLS. Everything else stays inside the caller's own tenant.
 */

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  timezone: z.string().trim().max(60).default("Asia/Kolkata"),
  currency: z.string().trim().max(8).default("INR"),
  branchName: z.string().trim().min(2).max(120).default("Main Branch"),
});

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "clinic"
  );
}

export const getTenantContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: memberships }, { data: profile }, { data: platformAdmin }] = await Promise.all([
      supabase
        .from("organization_members")
        .select("organization_id, status, is_owner, joined_at, organizations(id, name, slug, status, timezone, currency, onboarding_completed)")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("joined_at"),
      supabase.from("profiles").select("active_organization_id").eq("id", userId).maybeSingle(),
      supabase.from("platform_admins").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle(),
    ]);

    const rows = (memberships ?? []).filter((m) => m.organizations);
    const organizations = rows.map((m) => ({
      id: m.organization_id as string,
      isOwner: !!m.is_owner,
      ...(m.organizations as unknown as {
        name: string;
        slug: string;
        status: string;
        timezone: string | null;
        currency: string | null;
        onboarding_completed: boolean;
      }),
    }));

    const active = profile?.active_organization_id ?? null;
    const activeOrganizationId =
      (active && organizations.some((o) => o.id === active) ? active : organizations[0]?.id) ?? null;

    return { organizations, activeOrganizationId, isPlatformAdmin: !!platformAdmin };
  });

export const switchOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ organizationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: member } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", data.organizationId)
      .eq("status", "active")
      .maybeSingle();
    if (!member) throw new Error("You are not a member of that organization");

    const { error } = await supabase
      .from("profiles")
      .update({ active_organization_id: data.organizationId })
      .eq("id", userId);
    if (error) throw error;

    return { organizationId: data.organizationId };
  });

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // One organization per sign-up flow: an existing member onboards through invites.
    const { data: existing } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);
    if (existing && existing.length > 0) throw new Error("This account already belongs to an organization");

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("id")
      .eq("is_active", true)
      .order("sort_order")
      .limit(1)
      .maybeSingle();

    let slug = slugify(data.name);
    const { data: clash } = await supabaseAdmin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: data.name,
        slug,
        contact_email: data.contactEmail || (claims["email"] as string | undefined) || null,
        contact_phone: data.contactPhone || null,
        city: data.city || null,
        timezone: data.timezone,
        currency: data.currency,
        plan_id: plan?.id ?? null,
        status: "trialing",
        trial_ends_at: new Date(Date.now() + 14 * 864e5).toISOString(),
        onboarding_completed: true,
      })
      .select("id, name, slug")
      .single();
    if (orgError || !org) throw orgError ?? new Error("Could not create the organization");

    const orgId = org.id;

    const { error: memberError } = await supabaseAdmin.from("organization_members").insert({
      organization_id: orgId,
      user_id: userId,
      status: "active",
      is_owner: true,
    });
    if (memberError) throw memberError;

    const { data: branch, error: branchError } = await supabaseAdmin
      .from("branches")
      .insert({
        organization_id: orgId,
        name: data.branchName,
        code: "MAIN",
        city: data.city || null,
        email: data.contactEmail || null,
        phone: data.contactPhone || null,
        is_active: true,
      })
      .select("id")
      .single();
    if (branchError) throw branchError;

    await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        full_name: (claims["user_metadata"] as { full_name?: string } | undefined)?.full_name || data.name,
        email: (claims["email"] as string | undefined) ?? null,
        organization_id: orgId,
        active_organization_id: orgId,
        branch_id: branch?.id ?? null,
      },
      { onConflict: "id" },
    );

    // The founder runs the clinic account.
    await supabaseAdmin
      .from("user_roles")
      .insert({ organization_id: orgId, user_id: userId, role: "clinic_admin" });

    if (branch?.id) {
      await supabaseAdmin
        .from("user_branches")
        .insert({ organization_id: orgId, user_id: userId, branch_id: branch.id });
    }

    await supabaseAdmin.from("settings").insert([
      {
        organization_id: orgId,
        branch_id: null,
        key: "clinic_identity",
        value: {
          name: data.name,
          phone: data.contactPhone || "",
          email: data.contactEmail || "",
          address: data.city || "",
          timezone: data.timezone,
        },
      },
      {
        organization_id: orgId,
        branch_id: null,
        key: "billing",
        value: { invoice_prefix: "INV-", number_padding: 6, currency: data.currency },
      },
    ]);

    return { organizationId: orgId, slug: org.slug, name: org.name };
  });
