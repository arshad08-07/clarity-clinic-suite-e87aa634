import type { AppRole } from "@/hooks/use-auth";

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: AppRole[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ALL_STAFF: AppRole[] = [
  "super_admin",
  "clinic_admin",
  "receptionist",
  "doctor",
  "optometrist",
  "nurse",
  "pharmacist",
  "optical_staff",
  "inventory_manager",
  "accountant",
  "diagnostic_staff",
  "crm_staff",
];

const CLINICAL: AppRole[] = ["super_admin", "clinic_admin", "doctor", "optometrist", "nurse"];
const FRONT_DESK: AppRole[] = ["super_admin", "clinic_admin", "receptionist", "nurse"];
const FINANCE: AppRole[] = ["super_admin", "clinic_admin", "accountant", "receptionist"];
const STOCK: AppRole[] = ["super_admin", "clinic_admin", "inventory_manager", "pharmacist", "optical_staff"];
const ADMIN: AppRole[] = ["super_admin", "clinic_admin"];

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ALL_STAFF },
      { to: "/queue", label: "Live Queue", icon: "ListOrdered", roles: [...FRONT_DESK, ...CLINICAL] },
    ],
  },
  {
    label: "Front Desk",
    items: [
      { to: "/patients", label: "Patients", icon: "Users", roles: ALL_STAFF },
      { to: "/appointments", label: "Appointments", icon: "CalendarDays", roles: ALL_STAFF },
      { to: "/leads", label: "Leads", icon: "UserPlus", roles: [...ADMIN, "receptionist", "crm_staff"] },
    ],
  },
  {
    label: "Clinical",
    items: [
      { to: "/optometry", label: "Optometry", icon: "Glasses", roles: [...CLINICAL] },
      { to: "/examinations", label: "Eye Examinations", icon: "Eye", roles: CLINICAL },
      { to: "/diagnoses", label: "Diagnoses", icon: "Stethoscope", roles: CLINICAL },
      { to: "/prescriptions", label: "Prescriptions", icon: "Pill", roles: [...CLINICAL, "pharmacist"] },
      {
        to: "/optical-prescriptions",
        label: "Optical Rx",
        icon: "ScanEye",
        roles: [...CLINICAL, "optical_staff"],
      },
      {
        to: "/diagnostics",
        label: "Diagnostics",
        icon: "Activity",
        roles: [...CLINICAL, "diagnostic_staff"],
      },
      { to: "/follow-ups", label: "Follow-ups", icon: "CalendarClock", roles: [...CLINICAL, "crm_staff", "receptionist"] },
    ],
  },
  {
    label: "Surgery & OT",
    items: [
      { to: "/surgeries", label: "Surgeries", icon: "Scissors", roles: [...CLINICAL] },
      { to: "/ot-rooms", label: "OT Rooms", icon: "DoorOpen", roles: [...ADMIN, "doctor", "nurse"] },
      { to: "/iol", label: "IOL & Implants", icon: "CircleDot", roles: [...ADMIN, "doctor", "nurse", "inventory_manager"] },
    ],
  },
  {
    label: "Commerce",
    items: [
      { to: "/pharmacy", label: "Pharmacy", icon: "Cross", roles: [...ADMIN, "pharmacist"] },
      { to: "/optical-shop", label: "Optical Shop", icon: "Sparkles", roles: [...ADMIN, "optical_staff"] },
      { to: "/inventory", label: "Inventory", icon: "Boxes", roles: STOCK },
      { to: "/suppliers", label: "Suppliers", icon: "Truck", roles: [...ADMIN, "inventory_manager"] },
      { to: "/procurement", label: "Purchase Orders", icon: "ClipboardList", roles: [...ADMIN, "inventory_manager"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/billing", label: "Billing", icon: "ReceiptText", roles: FINANCE },
      { to: "/payments", label: "Payments", icon: "CreditCard", roles: FINANCE },
      { to: "/expenses", label: "Expenses", icon: "Wallet", roles: [...ADMIN, "accountant"] },
      { to: "/insurance", label: "Insurance Claims", icon: "ShieldCheck", roles: [...ADMIN, "accountant"] },
    ],
  },
  {
    label: "Engagement",
    items: [
      { to: "/communications", label: "Communications", icon: "MessageSquare", roles: [...ADMIN, "crm_staff", "receptionist"] },
      { to: "/reports", label: "Reports", icon: "BarChart3", roles: [...ADMIN, "accountant"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/staff", label: "Staff & Roles", icon: "IdCard", roles: ADMIN },
      { to: "/branches", label: "Branches", icon: "Building2", roles: ADMIN },
      { to: "/equipment", label: "Equipment", icon: "Microscope", roles: [...ADMIN, "inventory_manager"] },
      { to: "/catalog", label: "Clinical Catalog", icon: "BookMarked", roles: ADMIN },
      { to: "/audit", label: "Audit Logs", icon: "ScrollText", roles: ADMIN },
      { to: "/settings", label: "Settings", icon: "Settings", roles: ADMIN },
    ],
  },
];

export function visibleNav(roles: AppRole[]): NavGroup[] {
  if (roles.includes("super_admin")) return NAV;
  return NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.some((r) => roles.includes(r))),
  })).filter((g) => g.items.length > 0);
}
