import type { FieldDef, ResourceConfig } from "@/components/resource-module";
import type { Row } from "@/lib/api";

const opts = (...values: string[]) =>
  values.map((v) => ({
    value: v,
    label: v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

export const GENDER = opts("male", "female", "other");
export const EYE = [
  { value: "OD", label: "Right (OD)" },
  { value: "OS", label: "Left (OS)" },
  { value: "OU", label: "Both (OU)" },
];
export const APPOINTMENT_STATUS = opts(
  "scheduled",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
);
export const VISIT_STATUS = opts(
  "waiting",
  "optometry",
  "with_doctor",
  "diagnostics",
  "billing",
  "completed",
  "cancelled",
);
export const LEAD_STATUS = opts("new", "contacted", "qualified", "converted", "lost");
export const ORDER_STATUS = opts(
  "ordered",
  "sample_collected",
  "in_progress",
  "completed",
  "cancelled",
);
export const SURGERY_STATUS = opts(
  "planned",
  "scheduled",
  "in_progress",
  "completed",
  "postponed",
  "cancelled",
);
export const PAYMENT_STATUS = opts("unpaid", "partial", "paid", "refunded");
export const PO_STATUS = opts("draft", "sent", "partially_received", "received", "cancelled");
export const PRODUCT_CATEGORY = opts(
  "medicine",
  "frame",
  "lens",
  "contact_lens",
  "iol",
  "consumable",
  "equipment_part",
  "other",
);

export const patientLabel = (r: Row) =>
  `${r["first_name"] ?? ""} ${r["last_name"] ?? ""}`.trim() + ` · ${r["mrn"] ?? ""}`;

export const patientRef = (overrides: Partial<FieldDef> = {}): FieldDef => ({
  name: "patient_id",
  label: "Patient",
  type: "ref",
  refTable: "patients",
  refSelect: "id, first_name, last_name, mrn",
  refLabel: patientLabel,
  required: true,
  ...overrides,
});

export const staffRef = (name: string, label: string, req = false): FieldDef => ({
  name,
  label,
  type: "ref",
  refTable: "profiles",
  refSelect: "id, full_name",
  refLabel: (r) => String(r["full_name"] || "Unnamed"),
  required: req,
});

export const branchRef = (): FieldDef => ({
  name: "branch_id",
  label: "Branch",
  type: "ref",
  refTable: "branches",
  refSelect: "id, name",
});

export const visitRef = (): FieldDef => ({
  name: "visit_id",
  label: "Visit",
  type: "ref",
  refTable: "visits",
  refSelect: "id, token_no, checked_in_at",
  refLabel: (r) => `Token ${r["token_no"] ?? "-"} · ${String(r["checked_in_at"]).slice(0, 10)}`,
  inTable: false,
});

const eyePair = (base: string, label: string, type: FieldDef["type"] = "text"): FieldDef[] => [
  { name: `${base}_od`, label: `${label} OD`, type },
  { name: `${base}_os`, label: `${label} OS`, type },
];

export const patientsConfig: ResourceConfig = {
  table: "patients",
  title: "Patients",
  singular: "Patient",
  description: "Master patient index with medical record numbers, demographics and history.",
  searchFields: ["mrn", "first_name", "last_name", "phone", "email"],
  orderBy: "created_at",
  fields: [
    { name: "mrn", label: "MRN", required: true, section: "Identity" },
    { name: "first_name", label: "First name", required: true, section: "Identity" },
    { name: "last_name", label: "Last name", section: "Identity" },
    { name: "gender", label: "Gender", type: "select", options: GENDER, section: "Identity" },
    { name: "date_of_birth", label: "Date of birth", type: "date", section: "Identity" },
    { name: "phone", label: "Phone", required: true, section: "Contact" },
    { name: "email", label: "Email", section: "Contact" },
    { name: "address", label: "Address", type: "textarea", full: true, inTable: false, section: "Contact" },
    { name: "city", label: "City", inTable: false, section: "Contact" },
    { name: "state", label: "State", inTable: false, section: "Contact" },
    { name: "pincode", label: "Pincode", inTable: false, section: "Contact" },
    { ...branchRef(), section: "Contact" },
    { name: "blood_group", label: "Blood group", inTable: false, section: "Medical" },
    { name: "allergies", label: "Allergies", type: "textarea", full: true, inTable: false, section: "Medical" },
    { name: "medical_history", label: "Medical history", type: "textarea", full: true, inTable: false, section: "Medical" },
    { name: "emergency_contact_name", label: "Emergency contact", inTable: false, section: "Medical" },
    { name: "emergency_contact_phone", label: "Emergency phone", inTable: false, section: "Medical" },
    { name: "insurance_provider", label: "Insurance provider", inTable: false, section: "Insurance" },
    { name: "insurance_policy_no", label: "Policy no.", inTable: false, section: "Insurance" },
    { name: "referred_by", label: "Referred by", inTable: false, section: "Insurance" },
    { name: "is_active", label: "Active", type: "boolean", defaultValue: true, section: "Insurance" },
    { name: "created_at", label: "Registered", type: "date", inForm: false },
  ],
  filters: [
    { name: "gender", label: "Gender", type: "select", options: GENDER },
    { name: "is_active", label: "Active", type: "boolean" },
  ],
};

export const appointmentsConfig: ResourceConfig = {
  table: "appointments",
  title: "Appointments",
  singular: "Appointment",
  description: "Schedule and track consultations across doctors and branches.",
  searchFields: ["reason", "appointment_type"],
  orderBy: "scheduled_at",
  dateField: "scheduled_at",
  fields: [
    patientRef(),
    staffRef("doctor_id", "Doctor"),
    { name: "scheduled_at", label: "Scheduled at", type: "datetime", required: true },
    { name: "duration_min", label: "Duration (min)", type: "number", defaultValue: 15 },
    {
      name: "appointment_type",
      label: "Type",
      type: "select",
      options: opts("new_patient", "follow_up", "walk_in", "emergency", "consultation", "review", "procedure", "diagnostic", "surgery_counselling"),
      defaultValue: "consultation",
    },
    { name: "status", label: "Status", type: "select", options: APPOINTMENT_STATUS, defaultValue: "scheduled" },
    { name: "reason", label: "Reason", inTable: false },
    { name: "notes", label: "Notes", type: "textarea", full: true, inTable: false },
    branchRef(),
  ],
  filters: [
    { name: "status", label: "Status", type: "select", options: APPOINTMENT_STATUS },
    { ...staffRef("doctor_id", "Doctor") },
  ],
};

export const queueConfig: ResourceConfig = {
  table: "visits",
  title: "Live Queue",
  singular: "Visit",
  description: "Patients checked in today and their current stage in the clinic flow.",
  searchFields: ["chief_complaint"],
  orderBy: "checked_in_at",
  ascending: true,
  dateField: "checked_in_at",
  fields: [
    { name: "token_no", label: "Token", type: "number" },
    patientRef(),
    staffRef("doctor_id", "Doctor"),
    { name: "status", label: "Stage", type: "select", options: VISIT_STATUS, defaultValue: "waiting" },
    { name: "chief_complaint", label: "Chief complaint", full: true },
    { name: "checked_in_at", label: "Checked in", type: "datetime" },
    { name: "completed_at", label: "Completed", type: "datetime", inTable: false },
    branchRef(),
  ],
  filters: [{ name: "status", label: "Stage", type: "select", options: VISIT_STATUS }],
};

export const leadsConfig: ResourceConfig = {
  table: "leads",
  title: "Leads",
  singular: "Lead",
  description: "Enquiries and CRM pipeline before a patient is registered.",
  searchFields: ["name", "phone", "email", "interest"],
  orderBy: "created_at",
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "phone", label: "Phone", required: true },
    { name: "email", label: "Email", inTable: false },
    { name: "source", label: "Source", type: "select", options: opts("walk_in", "phone", "website", "camp", "referral", "social") },
    { name: "interest", label: "Interest", inTable: false },
    { name: "campaign", label: "Campaign", inTable: false },
    { name: "status", label: "Status", type: "select", options: LEAD_STATUS, defaultValue: "new" },
    staffRef("assigned_to", "Assigned to"),
    { name: "notes", label: "Notes", type: "textarea", full: true, inTable: false },
    branchRef(),
  ],
  filters: [{ name: "status", label: "Status", type: "select", options: LEAD_STATUS }],
};

export const optometryConfig: ResourceConfig = {
  table: "optometry_records",
  title: "Optometry & Refraction",
  singular: "Optometry record",
  description: "Visual acuity, refraction, IOP and keratometry readings.",
  searchFields: ["notes", "keratometry"],
  orderBy: "created_at",
  fields: [
    { ...patientRef(), section: "Visit" },
    { ...visitRef(), section: "Visit" },
    { ...staffRef("optometrist_id", "Optometrist"), section: "Visit" },
    ...eyePair("ucva", "UCVA").map((f) => ({ ...f, section: "Acuity" })),
    ...eyePair("bcva", "BCVA").map((f) => ({ ...f, section: "Acuity" })),
    { name: "sph_od", label: "SPH OD", type: "number" as const, section: "Refraction OD" },
    { name: "cyl_od", label: "CYL OD", type: "number" as const, section: "Refraction OD" },
    { name: "axis_od", label: "Axis OD", type: "number" as const, section: "Refraction OD" },
    { name: "add_od", label: "ADD OD", type: "number" as const, section: "Refraction OD" },
    { name: "sph_os", label: "SPH OS", type: "number" as const, section: "Refraction OS" },
    { name: "cyl_os", label: "CYL OS", type: "number" as const, section: "Refraction OS" },
    { name: "axis_os", label: "Axis OS", type: "number" as const, section: "Refraction OS" },
    { name: "add_os", label: "ADD OS", type: "number" as const, section: "Refraction OS" },
    { name: "pd", label: "PD (mm)", type: "number", inTable: false, section: "Refraction OS" },
    { name: "iop_od", label: "IOP OD", type: "number", section: "Tonometry" },
    { name: "iop_os", label: "IOP OS", type: "number", section: "Tonometry" },
    { name: "iop_method", label: "IOP method", type: "select", options: opts("NCT", "applanation", "tonopen"), inTable: false, section: "Tonometry" },
    ...eyePair("near_va", "Near VA").map((f) => ({ ...f, inTable: false, section: "Acuity" })),
    ...eyePair("aided_va", "Aided VA").map((f) => ({ ...f, inTable: false, section: "Acuity" })),
    ...eyePair("auto_ref", "Auto refraction").map((f) => ({ ...f, inTable: false, section: "Refraction OS" })),
    { name: "prism_od", label: "Prism OD", inTable: false, section: "Refraction OD" },
    { name: "prism_os", label: "Prism OS", inTable: false, section: "Refraction OS" },
    ...eyePair("pachymetry", "Pachymetry (µm)", "number").map((f) => ({ ...f, inTable: false, section: "Tonometry" })),
    { name: "contrast_sensitivity", label: "Contrast sensitivity", inTable: false, section: "Other" },
    { name: "visual_field", label: "Visual field", inTable: false, section: "Other" },
    { name: "color_vision", label: "Colour vision", inTable: false, section: "Other" },
    { name: "keratometry", label: "Keratometry", inTable: false, section: "Other" },
    { name: "notes", label: "Notes", type: "textarea", full: true, inTable: false, section: "Other" },
    { name: "created_at", label: "Recorded", type: "datetime", inForm: false },
  ],
};

export const examinationsConfig: ResourceConfig = {
  table: "examinations",
  title: "Eye Examinations",
  singular: "Examination",
  description: "Slit-lamp, fundus and anterior segment findings with plan.",
  searchFields: ["chief_complaint", "advice", "plan"],
  orderBy: "created_at",
  fields: [
    { ...patientRef(), section: "Visit" },
    { ...visitRef(), section: "Visit" },
    { ...staffRef("doctor_id", "Doctor"), section: "Visit" },
    { name: "chief_complaint", label: "Chief complaint", full: true, section: "History" },
    { name: "history", label: "History", type: "textarea", full: true, inTable: false, section: "History" },
    ...eyePair("lids", "Lids").map((f) => ({ ...f, inTable: false, section: "Anterior segment" })),
    ...eyePair("conjunctiva", "Conjunctiva").map((f) => ({ ...f, inTable: false, section: "Anterior segment" })),
    ...eyePair("cornea", "Cornea").map((f) => ({ ...f, inTable: false, section: "Anterior segment" })),
    ...eyePair("anterior_chamber", "Ant. chamber").map((f) => ({ ...f, inTable: false, section: "Anterior segment" })),
    ...eyePair("pupil", "Pupil").map((f) => ({ ...f, inTable: false, section: "Anterior segment" })),
    ...eyePair("lashes", "Lashes").map((f) => ({ ...f, inTable: false, section: "Anterior segment" })),
    ...eyePair("lacrimal", "Lacrimal system").map((f) => ({ ...f, inTable: false, section: "Anterior segment" })),
    ...eyePair("sclera", "Sclera").map((f) => ({ ...f, inTable: false, section: "Anterior segment" })),
    ...eyePair("iris", "Iris").map((f) => ({ ...f, inTable: false, section: "Anterior segment" })),
    ...eyePair("lens", "Lens").map((f) => ({ ...f, inTable: false, section: "Lens & fundus" })),
    ...eyePair("vitreous", "Vitreous").map((f) => ({ ...f, inTable: false, section: "Lens & fundus" })),
    ...eyePair("optic_disc", "Optic disc").map((f) => ({ ...f, inTable: false, section: "Posterior segment" })),
    ...eyePair("macula", "Macula").map((f) => ({ ...f, inTable: false, section: "Posterior segment" })),
    ...eyePair("retina", "Retina").map((f) => ({ ...f, inTable: false, section: "Posterior segment" })),
    ...eyePair("vessels", "Vessels").map((f) => ({ ...f, inTable: false, section: "Posterior segment" })),
    ...eyePair("cataract_grade", "Cataract grade").map((f) => ({ ...f, section: "Lens & fundus" })),
    ...eyePair("fundus", "Fundus").map((f) => ({ ...f, inTable: false, section: "Lens & fundus" })),
    { name: "advice", label: "Advice", type: "textarea", full: true, inTable: false, section: "Plan" },
    { name: "plan", label: "Plan", type: "textarea", full: true, inTable: false, section: "Plan" },
    { name: "created_at", label: "Recorded", type: "datetime", inForm: false },
  ],
};

export const diagnosesConfig: ResourceConfig = {
  table: "patient_diagnoses",
  title: "Diagnoses",
  singular: "Diagnosis",
  description: "Coded and free-text diagnoses attached to patients and visits.",
  searchFields: ["diagnosis_text", "severity", "notes"],
  orderBy: "created_at",
  fields: [
    patientRef(),
    {
      name: "diagnosis_id",
      label: "Diagnosis (catalog)",
      type: "ref",
      refTable: "diagnosis_catalog",
      refSelect: "id, code, name",
      refLabel: (r) => `${r["code"]} · ${r["name"]}`,
    },
    { name: "diagnosis_text", label: "Free text", inTable: false },
    { name: "is_primary", label: "Primary diagnosis", type: "boolean", defaultValue: true },
    { name: "eye", label: "Eye", type: "select", options: EYE, defaultValue: "OU" },
    { name: "severity", label: "Severity", type: "select", options: opts("mild", "moderate", "severe") },
    staffRef("diagnosed_by", "Diagnosed by"),
    visitRef(),
    { name: "notes", label: "Notes", type: "textarea", full: true, inTable: false },
    { name: "created_at", label: "Date", type: "date", inForm: false },
  ],
};

export const prescriptionsConfig: ResourceConfig = {
  table: "prescriptions",
  title: "Prescriptions",
  singular: "Prescription",
  description: "Medication prescriptions issued during consultations.",
  searchFields: ["notes"],
  orderBy: "created_at",
  fields: [
    patientRef(),
    staffRef("doctor_id", "Doctor"),
    visitRef(),
    { name: "follow_up_date", label: "Follow-up on", type: "date" },
    { name: "notes", label: "Notes / drugs", type: "textarea", full: true },
    { name: "created_at", label: "Issued", type: "datetime", inForm: false },
  ],
};

export const opticalRxConfig: ResourceConfig = {
  table: "optical_prescriptions",
  title: "Optical Prescriptions",
  singular: "Optical Rx",
  description: "Spectacle and contact-lens prescriptions for the optical shop.",
  searchFields: ["lens_type", "coating", "remarks"],
  orderBy: "created_at",
  fields: [
    { ...patientRef(), section: "Patient" },
    { ...staffRef("prescribed_by", "Prescribed by"), section: "Patient" },
    { name: "type", label: "Type", type: "select", options: opts("spectacles", "contact_lens"), defaultValue: "spectacles", section: "Patient" },
    { name: "sph_od", label: "SPH OD", type: "number", section: "Right eye" },
    { name: "cyl_od", label: "CYL OD", type: "number", section: "Right eye" },
    { name: "axis_od", label: "Axis OD", type: "number", section: "Right eye" },
    { name: "add_od", label: "ADD OD", type: "number", section: "Right eye" },
    { name: "prism_od", label: "Prism OD", inTable: false, section: "Right eye" },
    { name: "sph_os", label: "SPH OS", type: "number", section: "Left eye" },
    { name: "cyl_os", label: "CYL OS", type: "number", section: "Left eye" },
    { name: "axis_os", label: "Axis OS", type: "number", section: "Left eye" },
    { name: "add_os", label: "ADD OS", type: "number", section: "Left eye" },
    { name: "prism_os", label: "Prism OS", inTable: false, section: "Left eye" },
    { name: "pd", label: "PD", type: "number", inTable: false, section: "Lens" },
    { name: "base_curve", label: "Base curve", type: "number", inTable: false, section: "Lens" },
    { name: "diameter", label: "Diameter", type: "number", inTable: false, section: "Lens" },
    { name: "lens_type", label: "Lens type", type: "select", options: opts("single_vision", "bifocal", "progressive", "toric"), section: "Lens" },
    { name: "coating", label: "Coating", type: "select", options: opts("none", "arc", "blue_cut", "photochromic"), inTable: false, section: "Lens" },
    { name: "valid_until", label: "Valid until", type: "date", section: "Lens" },
    { name: "remarks", label: "Remarks", type: "textarea", full: true, inTable: false, section: "Lens" },
  ],
};

export const diagnosticsConfig: ResourceConfig = {
  table: "diagnostic_orders",
  title: "Diagnostic Orders",
  singular: "Diagnostic order",
  description: "OCT, fields, biometry and other investigations with reports.",
  searchFields: ["findings", "impression"],
  orderBy: "created_at",
  fields: [
    patientRef(),
    {
      name: "test_id",
      label: "Test",
      type: "ref",
      refTable: "diagnostic_tests",
      refSelect: "id, code, name",
      refLabel: (r) => `${r["name"]} (${r["code"]})`,
      required: true,
    },
    { name: "eye", label: "Eye", type: "select", options: EYE, defaultValue: "OU" },
    { name: "status", label: "Status", type: "select", options: ORDER_STATUS, defaultValue: "ordered" },
    staffRef("ordered_by", "Ordered by"),
    staffRef("performed_by", "Performed by"),
    { name: "performed_at", label: "Performed at", type: "datetime", inTable: false },
    { name: "findings", label: "Findings", type: "textarea", full: true, inTable: false },
    { name: "impression", label: "Impression", type: "textarea", full: true, inTable: false },
    { name: "report_url", label: "Report URL", inTable: false },
    visitRef(),
  ],
  filters: [{ name: "status", label: "Status", type: "select", options: ORDER_STATUS }],
};

export const followUpsConfig: ResourceConfig = {
  table: "follow_ups",
  title: "Follow-ups",
  singular: "Follow-up",
  description: "Post-operative and review recalls owned by the CRM team.",
  searchFields: ["notes", "type"],
  orderBy: "due_date",
  ascending: true,
  dateField: "due_date",
  fields: [
    patientRef(),
    { name: "due_date", label: "Due date", type: "date", required: true },
    { name: "type", label: "Type", type: "select", options: opts("post_op", "review", "recall", "reminder"), defaultValue: "post_op" },
    { name: "is_done", label: "Completed", type: "boolean", defaultValue: false },
    staffRef("assigned_to", "Assigned to"),
    {
      name: "surgery_id",
      label: "Surgery",
      type: "ref",
      refTable: "surgeries",
      refSelect: "id, procedure, scheduled_at",
      refLabel: (r) => `${r["procedure"]} · ${String(r["scheduled_at"] ?? "").slice(0, 10)}`,
      inTable: false,
    },
    { name: "notes", label: "Notes", type: "textarea", full: true, inTable: false },
  ],
  filters: [{ name: "is_done", label: "Completed", type: "boolean" }],
};

export const surgeriesConfig: ResourceConfig = {
  table: "surgeries",
  title: "Surgeries",
  singular: "Surgery",
  description: "Cataract and other procedures with biometry, IOL and OT booking.",
  searchFields: ["procedure", "op_notes", "complications"],
  orderBy: "scheduled_at",
  dateField: "scheduled_at",
  fields: [
    { ...patientRef(), section: "Booking" },
    { name: "procedure", label: "Procedure", required: true, section: "Booking" },
    { name: "eye", label: "Eye", type: "select", options: EYE, defaultValue: "OD", section: "Booking" },
    { ...staffRef("surgeon_id", "Surgeon"), section: "Booking" },
    {
      name: "ot_room_id",
      label: "OT room",
      type: "ref",
      refTable: "ot_rooms",
      refSelect: "id, name",
      section: "Booking",
    },
    { name: "scheduled_at", label: "Scheduled at", type: "datetime", section: "Booking" },
    { name: "status", label: "Status", type: "select", options: SURGERY_STATUS, defaultValue: "planned", section: "Booking" },
    { name: "anesthesia", label: "Anesthesia", type: "select", options: opts("topical", "peribulbar", "retrobulbar", "general"), inTable: false, section: "Clinical" },
    { name: "biometry_axial_length", label: "Axial length", type: "number", inTable: false, section: "Clinical" },
    { name: "biometry_k1", label: "K1", type: "number", inTable: false, section: "Clinical" },
    { name: "biometry_k2", label: "K2", type: "number", inTable: false, section: "Clinical" },
    { name: "iol_power", label: "IOL power", type: "number", inTable: false, section: "Clinical" },
    {
      name: "iol_inventory_id",
      label: "IOL serial",
      type: "ref",
      refTable: "iol_inventory",
      refSelect: "id, serial_no, power",
      refLabel: (r) => `${r["serial_no"]} · ${r["power"] ?? "-"}D`,
      inTable: false,
      section: "Clinical",
    },
    {
      name: "consent_status",
      label: "Consent",
      type: "select",
      options: opts("pending", "signed", "declined"),
      defaultValue: "pending",
      section: "Clinical",
    },
    { name: "estimate_amount", label: "Estimate", type: "money", section: "Clinical" },
    { name: "discharge_summary", label: "Discharge summary", type: "textarea", full: true, inTable: false, section: "Notes" },
    { name: "pre_op_notes", label: "Pre-op notes", type: "textarea", full: true, inTable: false, section: "Notes" },
    { name: "op_notes", label: "Operative notes", type: "textarea", full: true, inTable: false, section: "Notes" },
    { name: "post_op_notes", label: "Post-op notes", type: "textarea", full: true, inTable: false, section: "Notes" },
    { name: "complications", label: "Complications", type: "textarea", full: true, inTable: false, section: "Notes" },
    { ...branchRef(), section: "Notes" },
  ],
  filters: [
    { name: "status", label: "Status", type: "select", options: SURGERY_STATUS },
    { name: "consent_status", label: "Consent", type: "select", options: opts("pending", "signed", "declined") },
  ],
};

export const otRoomsConfig: ResourceConfig = {
  table: "ot_rooms",
  title: "OT Rooms",
  singular: "OT room",
  description: "Operating theatres available for scheduling.",
  searchFields: ["name"],
  orderBy: "name",
  ascending: true,
  fields: [
    { name: "name", label: "Room name", required: true },
    branchRef(),
    { name: "is_active", label: "Active", type: "boolean", defaultValue: true },
  ],
};

export const iolModelsConfig: ResourceConfig = {
  table: "iol_models",
  title: "IOL Models",
  singular: "IOL model",
  description: "Intraocular lens catalog with cost and pricing.",
  searchFields: ["name", "manufacturer", "model_code"],
  orderBy: "name",
  ascending: true,
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "manufacturer", label: "Manufacturer" },
    { name: "model_code", label: "Model code" },
    { name: "type", label: "Type", type: "select", options: opts("monofocal", "multifocal", "toric", "edof") },
    { name: "unit_cost", label: "Unit cost", type: "money" },
    { name: "price", label: "Price", type: "money" },
    { name: "is_active", label: "Active", type: "boolean", defaultValue: true },
  ],
};

export const iolInventoryConfig: ResourceConfig = {
  table: "iol_inventory",
  title: "IOL Inventory",
  singular: "IOL unit",
  description: "Serial-tracked implants with power and expiry.",
  searchFields: ["serial_no"],
  orderBy: "created_at",
  fields: [
    {
      name: "iol_model_id",
      label: "Model",
      type: "ref",
      refTable: "iol_models",
      refSelect: "id, name, manufacturer",
      refLabel: (r) => `${r["name"]} · ${r["manufacturer"] ?? ""}`,
      required: true,
    },
    { name: "serial_no", label: "Serial no.", required: true },
    { name: "power", label: "Power (D)", type: "number" },
    { name: "expiry_date", label: "Expiry", type: "date" },
    { name: "is_used", label: "Used", type: "boolean", defaultValue: false },
    branchRef(),
  ],
  filters: [{ name: "is_used", label: "Used", type: "boolean" }],
};

const productFields = (category?: string): FieldDef[] => [
  { name: "sku", label: "SKU", required: true },
  { name: "name", label: "Name", required: true },
  {
    name: "category",
    label: "Category",
    type: "select",
    options: PRODUCT_CATEGORY,
    ...(category ? { defaultValue: category } : {}),
  },
  { name: "brand", label: "Brand" },
  { name: "unit", label: "Unit", inTable: false, defaultValue: "unit" },
  { name: "hsn_code", label: "HSN", inTable: false },
  { name: "tax_percent", label: "Tax %", type: "number", inTable: false },
  { name: "cost_price", label: "Cost", type: "money" },
  { name: "selling_price", label: "Price", type: "money" },
  { name: "stock_qty", label: "Stock", type: "number" },
  { name: "reorder_level", label: "Reorder level", type: "number", inTable: false },
  { name: "is_active", label: "Active", type: "boolean", defaultValue: true },
];

export const pharmacyConfig: ResourceConfig = {
  table: "products",
  title: "Pharmacy",
  singular: "Medicine",
  description: "Drops, tablets and consumables dispensed from the in-house pharmacy.",
  searchFields: ["sku", "name", "brand"],
  orderBy: "name",
  ascending: true,
  fields: productFields("medicine"),
  filters: [{ name: "category", label: "Category", type: "select", options: PRODUCT_CATEGORY }],
};

export const opticalShopConfig: ResourceConfig = {
  table: "products",
  title: "Optical Shop",
  singular: "Optical item",
  description: "Frames, lenses and contact lenses stocked at the optical counter.",
  searchFields: ["sku", "name", "brand"],
  orderBy: "name",
  ascending: true,
  fields: productFields("frame"),
  filters: [{ name: "category", label: "Category", type: "select", options: PRODUCT_CATEGORY }],
};

export const inventoryConfig: ResourceConfig = {
  table: "products",
  title: "Inventory",
  singular: "Product",
  description: "All stocked items with reorder levels across categories.",
  searchFields: ["sku", "name", "brand"],
  orderBy: "stock_qty",
  ascending: true,
  fields: productFields(),
  filters: [{ name: "category", label: "Category", type: "select", options: PRODUCT_CATEGORY }],
};

export const stockMovementsConfig: ResourceConfig = {
  table: "stock_movements",
  title: "Stock Movements",
  singular: "Stock movement",
  description: "Every receipt, issue and adjustment against product stock.",
  searchFields: ["reason", "batch_no"],
  orderBy: "created_at",
  fields: [
    {
      name: "product_id",
      label: "Product",
      type: "ref",
      refTable: "products",
      refSelect: "id, name, sku",
      refLabel: (r) => `${r["name"]} (${r["sku"]})`,
      required: true,
    },
    { name: "change_qty", label: "Qty change", type: "number", required: true },
    { name: "reason", label: "Reason", type: "select", options: opts("purchase", "sale", "adjustment", "return", "damage"), defaultValue: "adjustment" },
    { name: "batch_no", label: "Batch", inTable: false },
    { name: "expiry_date", label: "Expiry", type: "date", inTable: false },
    branchRef(),
    { name: "created_at", label: "When", type: "datetime", inForm: false },
  ],
};

export const suppliersConfig: ResourceConfig = {
  table: "suppliers",
  title: "Suppliers",
  singular: "Supplier",
  description: "Vendors supplying medicines, frames, lenses and implants.",
  searchFields: ["name", "contact_person", "phone", "gst_no"],
  orderBy: "name",
  ascending: true,
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "contact_person", label: "Contact person" },
    { name: "phone", label: "Phone" },
    { name: "email", label: "Email" },
    { name: "gst_no", label: "GST no.", inTable: false },
    { name: "address", label: "Address", type: "textarea", full: true, inTable: false },
    { name: "is_active", label: "Active", type: "boolean", defaultValue: true },
  ],
};

export const procurementConfig: ResourceConfig = {
  table: "purchase_orders",
  title: "Purchase Orders",
  singular: "Purchase order",
  description: "Procurement pipeline from draft to goods received.",
  searchFields: ["po_number", "notes"],
  orderBy: "order_date",
  dateField: "order_date",
  fields: [
    { name: "po_number", label: "PO number", required: true },
    {
      name: "supplier_id",
      label: "Supplier",
      type: "ref",
      refTable: "suppliers",
      refSelect: "id, name",
      required: true,
    },
    { name: "status", label: "Status", type: "select", options: PO_STATUS, defaultValue: "draft" },
    { name: "order_date", label: "Order date", type: "date" },
    { name: "expected_date", label: "Expected", type: "date" },
    { name: "total_amount", label: "Total", type: "money" },
    branchRef(),
    { name: "notes", label: "Notes", type: "textarea", full: true, inTable: false },
  ],
  filters: [{ name: "status", label: "Status", type: "select", options: PO_STATUS }],
};

export const invoicesConfig: ResourceConfig = {
  table: "invoices",
  title: "Billing",
  singular: "Invoice",
  description: "Consultation, pharmacy, optical and surgery invoices.",
  searchFields: ["invoice_no", "notes"],
  orderBy: "created_at",
  fields: [
    { name: "invoice_no", label: "Invoice no.", required: true },
    patientRef({ required: false }),
    {
      name: "invoice_type",
      label: "Type",
      type: "select",
      options: opts("consultation", "pharmacy", "optical", "diagnostic", "surgery"),
      defaultValue: "consultation",
    },
    { name: "subtotal", label: "Subtotal", type: "money" },
    { name: "discount", label: "Discount", type: "money", inTable: false },
    { name: "tax", label: "Tax", type: "money", inTable: false },
    { name: "total", label: "Total", type: "money" },
    { name: "paid_amount", label: "Paid", type: "money" },
    { name: "status", label: "Status", type: "select", options: PAYMENT_STATUS, defaultValue: "unpaid" },
    branchRef(),
    { name: "notes", label: "Notes", type: "textarea", full: true, inTable: false },
    { name: "created_at", label: "Raised", type: "date", inForm: false },
  ],
  filters: [{ name: "status", label: "Status", type: "select", options: PAYMENT_STATUS }],
};

export const paymentsConfig: ResourceConfig = {
  table: "payments",
  title: "Payments",
  singular: "Payment",
  description: "Collections recorded against invoices.",
  searchFields: ["reference", "method"],
  orderBy: "paid_at",
  dateField: "paid_at",
  fields: [
    {
      name: "invoice_id",
      label: "Invoice",
      type: "ref",
      refTable: "invoices",
      refSelect: "id, invoice_no, total",
      refLabel: (r) => `${r["invoice_no"]} · ₹${r["total"]}`,
      required: true,
    },
    { name: "amount", label: "Amount", type: "money", required: true },
    { name: "method", label: "Method", type: "select", options: opts("cash", "card", "upi", "netbanking", "insurance"), defaultValue: "cash" },
    { name: "reference", label: "Reference" },
    { name: "paid_at", label: "Paid at", type: "datetime" },
  ],
};

export const expensesConfig: ResourceConfig = {
  table: "expenses",
  title: "Expenses",
  singular: "Expense",
  description: "Operating costs by branch and category.",
  searchFields: ["description", "paid_to", "category"],
  orderBy: "expense_date",
  dateField: "expense_date",
  fields: [
    { name: "category", label: "Category", type: "select", options: opts("general", "salary", "rent", "utilities", "consumables", "maintenance", "marketing"), defaultValue: "general" },
    { name: "amount", label: "Amount", type: "money", required: true },
    { name: "expense_date", label: "Date", type: "date" },
    { name: "paid_to", label: "Paid to" },
    { name: "payment_method", label: "Method", type: "select", options: opts("cash", "card", "upi", "netbanking", "cheque"), inTable: false },
    { name: "description", label: "Description", type: "textarea", full: true, inTable: false },
    branchRef(),
  ],
};

export const insuranceConfig: ResourceConfig = {
  table: "insurance_claims",
  title: "Insurance Claims",
  singular: "Claim",
  description: "Cashless and reimbursement claims with approval tracking.",
  searchFields: ["provider", "claim_no", "policy_no"],
  orderBy: "submitted_at",
  dateField: "submitted_at",
  fields: [
    patientRef(),
    { name: "provider", label: "Provider", required: true },
    { name: "policy_no", label: "Policy no." },
    { name: "claim_no", label: "Claim no." },
    {
      name: "invoice_id",
      label: "Invoice",
      type: "ref",
      refTable: "invoices",
      refSelect: "id, invoice_no",
      refLabel: (r) => String(r["invoice_no"]),
      inTable: false,
    },
    { name: "claim_amount", label: "Claimed", type: "money" },
    { name: "approved_amount", label: "Approved", type: "money" },
    { name: "status", label: "Status", type: "select", options: opts("submitted", "in_review", "approved", "partially_approved", "rejected", "settled"), defaultValue: "submitted" },
    { name: "submitted_at", label: "Submitted", type: "date" },
    { name: "notes", label: "Notes", type: "textarea", full: true, inTable: false },
  ],
};

export const communicationsConfig: ResourceConfig = {
  table: "communications",
  title: "Communications",
  singular: "Communication",
  description: "Calls, SMS, WhatsApp and email logged against patients and leads.",
  searchFields: ["subject", "message"],
  orderBy: "created_at",
  fields: [
    patientRef({ required: false }),
    {
      name: "lead_id",
      label: "Lead",
      type: "ref",
      refTable: "leads",
      refSelect: "id, name, phone",
      refLabel: (r) => `${r["name"]} · ${r["phone"]}`,
      inTable: false,
    },
    { name: "channel", label: "Channel", type: "select", options: opts("call", "sms", "whatsapp", "email", "in_person"), defaultValue: "call" },
    { name: "direction", label: "Direction", type: "select", options: opts("inbound", "outbound"), defaultValue: "outbound" },
    { name: "subject", label: "Subject" },
    { name: "status", label: "Status", type: "select", options: opts("logged", "sent", "failed", "answered", "no_answer"), defaultValue: "logged" },
    { name: "message", label: "Message", type: "textarea", full: true, inTable: false },
    { name: "created_at", label: "When", type: "datetime", inForm: false },
  ],
};

export const staffConfig: ResourceConfig = {
  table: "profiles",
  title: "Staff Directory",
  singular: "Staff member",
  description: "Clinic team profiles. Roles are managed in the roles panel below.",
  searchFields: ["full_name", "email", "designation", "specialization"],
  orderBy: "full_name",
  ascending: true,
  fields: [
    { name: "full_name", label: "Full name", required: true },
    { name: "email", label: "Email" },
    { name: "phone", label: "Phone" },
    { name: "designation", label: "Designation" },
    { name: "specialization", label: "Specialization", inTable: false },
    { name: "registration_no", label: "Registration no.", inTable: false },
    branchRef(),
    { name: "is_active", label: "Active", type: "boolean", defaultValue: true },
  ],
};

export const branchesConfig: ResourceConfig = {
  table: "branches",
  title: "Branches",
  singular: "Branch",
  description: "Hospital locations and contact details.",
  searchFields: ["name", "code", "city"],
  orderBy: "name",
  ascending: true,
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "code", label: "Code", required: true },
    { name: "city", label: "City" },
    { name: "state", label: "State" },
    { name: "phone", label: "Phone" },
    { name: "email", label: "Email", inTable: false },
    { name: "address", label: "Address", type: "textarea", full: true, inTable: false },
    { name: "is_active", label: "Active", type: "boolean", defaultValue: true },
  ],
};

export const equipmentConfig: ResourceConfig = {
  table: "equipment",
  title: "Equipment",
  singular: "Equipment",
  description: "Slit lamps, OCT, phaco machines and their service schedule.",
  searchFields: ["name", "serial_no", "manufacturer"],
  orderBy: "next_service_date",
  ascending: true,
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "serial_no", label: "Serial no." },
    { name: "manufacturer", label: "Manufacturer" },
    { name: "status", label: "Status", type: "select", options: opts("operational", "under_maintenance", "faulty", "retired"), defaultValue: "operational" },
    { name: "purchase_date", label: "Purchased", type: "date", inTable: false },
    { name: "warranty_until", label: "Warranty until", type: "date", inTable: false },
    { name: "last_service_date", label: "Last service", type: "date" },
    { name: "next_service_date", label: "Next service", type: "date" },
    branchRef(),
    { name: "notes", label: "Notes", type: "textarea", full: true, inTable: false },
  ],
};

export const diagnosisCatalogConfig: ResourceConfig = {
  table: "diagnosis_catalog",
  title: "Diagnosis Catalog",
  singular: "Diagnosis",
  description: "Standard diagnosis codes used across the clinic.",
  searchFields: ["code", "name", "category"],
  orderBy: "code",
  ascending: true,
  fields: [
    { name: "code", label: "Code", required: true },
    { name: "name", label: "Name", required: true },
    { name: "category", label: "Category" },
  ],
};

export const diagnosticTestsConfig: ResourceConfig = {
  table: "diagnostic_tests",
  title: "Diagnostic Tests",
  singular: "Test",
  description: "Investigations offered with their list price.",
  searchFields: ["code", "name", "category"],
  orderBy: "name",
  ascending: true,
  fields: [
    { name: "code", label: "Code", required: true },
    { name: "name", label: "Name", required: true },
    { name: "category", label: "Category" },
    { name: "price", label: "Price", type: "money" },
    { name: "is_active", label: "Active", type: "boolean", defaultValue: true },
  ],
};

export const auditConfig: ResourceConfig = {
  table: "audit_logs",
  title: "Audit Logs",
  singular: "Audit entry",
  description: "Every create, update and delete performed in the system.",
  searchFields: ["entity", "action"],
  orderBy: "created_at",
  readOnly: true,
  fields: [
    { name: "created_at", label: "When", type: "datetime" },
    { name: "entity", label: "Entity" },
    { name: "action", label: "Action", type: "select" },
    { name: "entity_id", label: "Record id" },
    { name: "user_id", label: "User id" },
  ],
};

export const settingsConfig: ResourceConfig = {
  table: "settings",
  title: "Settings",
  singular: "Setting",
  description: "Clinic-wide configuration key/value pairs.",
  searchFields: ["key"],
  orderBy: "key",
  ascending: true,
  fields: [
    { name: "key", label: "Key", required: true },
    branchRef(),
    { name: "updated_at", label: "Updated", type: "datetime", inForm: false },
  ],
};


export const opticalOrdersConfig: ResourceConfig = {
  table: "optical_orders",
  title: "Optical Orders",
  singular: "Optical order",
  description: "Frame and lens orders from prescription to delivery.",
  searchFields: ["brand", "coating", "notes", "status"],
  orderBy: "created_at",
  fields: [
    { ...patientRef(), section: "Order" },
    {
      name: "optical_prescription_id",
      label: "Optical Rx",
      type: "ref",
      refTable: "optical_prescriptions",
      refSelect: "id, type, created_at",
      refLabel: (r) => `${String(r["type"] ?? "Rx")} · ${String(r["created_at"]).slice(0, 10)}`,
      inTable: false,
      section: "Order",
    },
    {
      name: "frame_product_id",
      label: "Frame",
      type: "ref",
      refTable: "products",
      refSelect: "id, name, sku, stock_qty",
      refLabel: (r) => `${r["name"]} (${r["sku"]}) · ${r["stock_qty"]} in stock`,
      section: "Items",
    },
    {
      name: "lens_product_id",
      label: "Lens",
      type: "ref",
      refTable: "products",
      refSelect: "id, name, sku, stock_qty",
      refLabel: (r) => `${r["name"]} (${r["sku"]}) · ${r["stock_qty"]} in stock`,
      section: "Items",
    },
    { name: "brand", label: "Brand", inTable: false, section: "Items" },
    { name: "lens_index", label: "Index", inTable: false, section: "Items" },
    { name: "coating", label: "Coating", inTable: false, section: "Items" },
    { name: "quantity", label: "Qty", type: "number", defaultValue: 1, section: "Items" },
    { name: "cost_price", label: "Cost", type: "money", inTable: false, section: "Pricing" },
    { name: "selling_price", label: "Selling price", type: "money", section: "Pricing" },
    { name: "discount", label: "Discount", type: "money", inTable: false, section: "Pricing" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: opts("ordered", "processing", "ready", "delivered", "cancelled"),
      defaultValue: "ordered",
      section: "Fulfilment",
    },
    { name: "delivery_date", label: "Delivery date", type: "date", section: "Fulfilment" },
    { name: "notes", label: "Notes", type: "textarea", full: true, inTable: false, section: "Fulfilment" },
    { ...branchRef(), section: "Fulfilment" },
    { name: "created_at", label: "Placed", type: "date", inForm: false },
  ],
  filters: [
    { name: "status", label: "Status", type: "select", options: opts("ordered", "processing", "ready", "delivered", "cancelled") },
  ],
};

export const batchesConfig: ResourceConfig = {
  table: "product_batches",
  title: "Batches & Expiry",
  singular: "Batch",
  description: "Batch-wise stock with expiry, cost and selling price. Expired batches cannot be billed.",
  searchFields: ["batch_no"],
  orderBy: "expiry_date",
  ascending: true,
  dateField: "expiry_date",
  fields: [
    {
      name: "product_id",
      label: "Product",
      type: "ref",
      refTable: "products",
      refSelect: "id, name, sku",
      refLabel: (r) => `${r["name"]} (${r["sku"]})`,
      required: true,
    },
    { name: "batch_no", label: "Batch no.", required: true },
    { name: "expiry_date", label: "Expiry", type: "date" },
    { name: "quantity", label: "Qty", type: "number", defaultValue: 0 },
    { name: "cost_price", label: "Cost", type: "money" },
    { name: "selling_price", label: "Selling price", type: "money" },
    branchRef(),
  ],
};

export const documentsConfig: ResourceConfig = {
  table: "patient_documents",
  title: "Documents",
  singular: "Document",
  description: "Consents, estimates, reports and uploads attached to a patient.",
  searchFields: ["title", "doc_type", "notes"],
  orderBy: "created_at",
  fields: [
    patientRef(),
    {
      name: "doc_type",
      label: "Type",
      type: "select",
      options: opts("consent", "estimate", "report", "discharge_summary", "pre_op_checklist", "other"),
      defaultValue: "other",
    },
    { name: "title", label: "Title", required: true },
    { name: "file_url", label: "File link", inTable: false },
    visitRef(),
    { name: "notes", label: "Notes", type: "textarea", full: true, inTable: false },
    { name: "created_at", label: "Added", type: "date", inForm: false },
  ],
};

export const leadActivitiesConfig: ResourceConfig = {
  table: "lead_activities",
  title: "Lead Activities",
  singular: "Activity",
  description: "Calls, messages and outcomes logged against each lead.",
  searchFields: ["activity", "outcome"],
  orderBy: "created_at",
  fields: [
    {
      name: "lead_id",
      label: "Lead",
      type: "ref",
      refTable: "leads",
      refSelect: "id, name, phone",
      refLabel: (r) => `${r["name"]} · ${r["phone"]}`,
      required: true,
    },
    { name: "activity", label: "Activity", required: true },
    { name: "outcome", label: "Outcome", inTable: false },
    { name: "next_action_at", label: "Next action", type: "datetime" },
    { name: "created_at", label: "Logged", type: "datetime", inForm: false },
  ],
};
