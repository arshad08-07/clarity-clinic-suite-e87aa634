# SaaS Conversion — Architecture & Migration Plan

No code changes yet. This is the audit + plan you asked for.

## 1. Current architecture

- **Frontend**: React 19 + TanStack Start (SSR), 39 route files under `_authenticated/`, config-driven `ResourceModule` for CRUD screens, ~20 domain libraries in `src/lib/` (billing, pharmacy, procurement, surgery, optical, queue, diagnostics, crm, follow-ups, settings, access).
- **Backend today**: there is already a Node server runtime (TanStack Start server functions + `src/routes/api/public/*` HTTP routes). But almost all business calls go **browser → Supabase Data API directly**, protected by RLS.
- **Database**: PostgreSQL (Supabase), 48 tables, 50 migrations, heavy use of triggers (billing recalculation, stock sync, refund guard, OT conflict, audit logging) and SECURITY DEFINER helpers (`has_role`, `can_access_branch`, `can_access_patient`, …).
- **Tenancy today**: single organization, `branches` + `user_branches` + `user_roles` give branch isolation. There is **no organization layer**.

## 2. Target architecture

```text
Platform
 └── Organizations (tenants)
      ├── Branches
      ├── Users (memberships + roles)
      └── All business data (organization_id NOT NULL)
```

- **Frontend**: unchanged pages. Only the data layer changes (see §10).
- **Node backend**: keep the existing Node runtime and add a real API layer inside it — `createServerFn` modules organised as a service layer (`src/server/<domain>/`), plus HTTP routes under `src/routes/api/` for webhooks/jobs. Recommendation: **do not** stand up a separate Fastify/NestJS process. The current runtime is already Node/edge, deployed, authenticated, and CSRF-protected; a second process would double deploys, split auth, and force rewriting all 39 screens. We get the same guarantees (server-side tenant resolution, no privileged credentials in the browser, service layer, jobs, webhooks) with a fraction of the risk. If a standalone Fastify service is a hard requirement later, the service layer we build is portable to it almost verbatim.
- **Database**: same PostgreSQL, same relational design, plus `organizations`, `organization_members`, and `organization_id` on every tenant-owned table. RLS becomes the second line of defence; the API is the first.
- **Auth**: central Supabase Auth (one identity per person) + org membership resolved server-side. JWT never carries the tenant; the backend resolves it from `organization_members` on every request.

## 3. Tables requiring `organization_id`

All 44 tenant-owned tables: branches, profiles(membership), patients, appointments, visits, examinations, optometry_records, patient_diagnoses, prescriptions, prescription_items, diagnostic_orders, surgeries, ot_rooms, iol_models, iol_inventory, products, product_batches, stock_movements, suppliers, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, optical_prescriptions, optical_orders, pharmacy_sales, invoices, invoice_items, payments, expenses, insurance_claims, claim_status_history, leads, lead_activities, communications, follow_ups, notifications, equipment, patient_documents, settings, audit_logs, user_roles, user_branches, diagnostic_tests.

Rule: `organization_id uuid NOT NULL` + FK + index + composite indexes on `(organization_id, branch_id)` for hot queries. Child tables (`*_items`, `claim_status_history`, `lead_activities`) get it denormalised and enforced by trigger against the parent — no NULL loophole anywhere.

## 4. Global vs org vs branch data

| Scope | Data |
|---|---|
| Global platform | `diagnosis_catalog` (ICD-style codes), enum types, platform admin table, plans table, drug shorthand dictionary |
| Organization | branches, users/roles, products & catalog, suppliers, diagnostic_tests (org pricing), IOL models, settings/branding, subscription state |
| Branch | patients, visits, appointments, invoices, stock batches, OT rooms, equipment, expenses, queue |

`diagnosis_catalog` stays global read-only, with an optional org-owned override table so clinics can add local codes without duplicating the global list.

## 5. Node API structure

```text
src/server/
  auth/        session, tenant resolution, membership cache
  tenancy/     org context, guards (requireOrg, requireRole, requireBranch)
  patients/  visits/  queue/  clinical/  diagnostics/
  surgery/  pharmacy/  optical/  inventory/  procurement/
  billing/  crm/  followups/  reports/  admin/  platform/
src/lib/*.functions.ts   thin createServerFn wrappers the UI imports
src/routes/api/public/*  webhooks + cron (already exists)
```

Every server fn runs through one middleware chain: `authenticate → resolveOrganization → authorizeRole → handler(ctx)`, where `ctx = { userId, organizationId, branchIds, roles }`. Handlers can never receive an `organizationId` from the client — it is derived from the session only.

## 6. Auth strategy

- One Supabase Auth identity per person; `organization_members(user_id, organization_id, status)` decides tenancy. Same email can later belong to two orgs (org switcher) without a second account.
- Backend calls `set_config('app.current_org', …)` inside a transaction; RLS policies read it via a `current_org_id()` helper. Belt and braces: API guard + RLS.
- Platform admins live in a **separate** `platform_admins` table, never in `organization_members`, and never inherit org roles. Support access to a tenant is explicit, time-boxed, and audit-logged.

## 7. Migration order

1. Create `organizations`, `organization_members`, `platform_admins`, `plans`, `organization_settings`.
2. Seed one org from existing data ("Vision Care"), backfill `organization_id` everywhere via branch/parent lineage.
3. Set `NOT NULL` + FKs + indexes; add org-consistency triggers on child tables.
4. Rewrite RLS: every policy gains `organization_id = current_org_id()`; existing role/branch/PHI predicates preserved verbatim.
5. Build the tenancy middleware + service layer; migrate domains behind it one at a time (billing and clinical last, they have the most triggers).
6. Frontend data layer swap per domain, screens untouched.
7. Onboarding + org admin + platform admin UI.
8. Two-org penetration test.

## 8. Risks

- **Backfill errors** → orphan rows invisible to their owner. Mitigation: backfill in a single transaction with a post-check that every table has zero NULL org ids before `NOT NULL` is applied.
- **Trigger/RLS interaction**: SECURITY DEFINER functions bypass RLS, so each one must re-assert the org check internally. This is the highest-risk item.
- **Regression in billing/inventory integrity** during the service-layer move. Mitigation: move domains one at a time, keep triggers as the invariant guard, re-run the existing workflow smoke tests after each domain.
- **Cross-org data leak via shared caches** (React Query keys, in-memory maps): every cache key gets the org id prefix.
- **Downtime**: the schema migration is additive and can run online; the `NOT NULL` step needs a short lock window.

## 9. Phases

| Phase | Scope |
|---|---|
| 1 | Tenant schema + backfill + NOT NULL + indexes |
| 2 | RLS rewrite with org predicate; two-org isolation tests |
| 3 | Node service layer + tenancy middleware; migrate privileged domains (billing, inventory, surgery, pharmacy, optical, procurement) behind the API |
| 4 | Central auth + org resolution + org switcher; cache keying |
| 5 | Onboarding wizard, org admin console, org branding/settings |
| 6 | Platform admin console: orgs, status, plans, usage metrics, suspend/reactivate, audited support access |
| 7 | Subscription/plan **state only** (no payment integration), usage limits, hardening + final cross-tenant penetration test |

## 10. Files/modules that must change

- **New**: `src/server/**` (service layer), `src/lib/*.functions.ts` wrappers, `src/lib/tenant.ts`, onboarding routes, `src/routes/_authenticated/organization/*`, `src/routes/_platform/*`.
- **Rewritten data layer, same UI**: `src/lib/{api,billing,pharmacy,procurement,surgery,optical,queue,diagnostics,crm,follow-ups,prescriptions,diagnoses,settings}.ts`.
- **Extended**: `src/hooks/use-auth.tsx` (org context), `src/lib/access.ts` (org+branch+role), `src/lib/navigation.ts` (platform vs org nav), `src/components/route-guard.tsx`, `src/lib/module-configs.ts` (org-scoped queries), `src/start.ts` (middleware chain).
- **Untouched**: all 39 page components, `resource-module.tsx`, design system, clinical workflow components.

## What I need from you before implementing

1. Confirm the Node backend approach in §2 (extend the existing Node runtime rather than a separate Fastify/NestJS process).
2. Confirm one identity may belong to multiple organizations later (affects the membership table now).
3. Confirm `products`/`suppliers`/`diagnostic_tests` are org-owned, not global.
