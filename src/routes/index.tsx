import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  Eye,
  Glasses,
  ReceiptText,
  Scissors,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vision Care HMS — Eye Hospital Management Software" },
      {
        name: "description",
        content:
          "Run an entire eye hospital in one place: patient records, appointments, optometry, surgery and OT, IOL tracking, pharmacy, optical shop and billing.",
      },
      { property: "og:title", content: "Vision Care HMS — Eye Hospital Management Software" },
      {
        property: "og:description",
        content:
          "Run an entire eye hospital in one place: patient records, appointments, optometry, surgery and OT, IOL tracking, pharmacy, optical shop and billing.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Users, title: "Patients & Leads", text: "Registration, MRN, medical history, CRM pipeline and patient portal access." },
  { icon: CalendarDays, title: "Appointments & Queue", text: "Scheduling, check-in, live token queue and department routing." },
  { icon: Glasses, title: "Optometry & Refraction", text: "Visual acuity, OD/OS refraction, IOP, keratometry and optical prescriptions." },
  { icon: Eye, title: "Examination & Diagnosis", text: "Slit-lamp findings, fundus, cataract grading and coded diagnoses." },
  { icon: Activity, title: "Diagnostics", text: "OCT, visual field, biometry, topography orders with reports on the chart." },
  { icon: Scissors, title: "Surgery, OT & IOL", text: "Cataract workflow, OT scheduling, biometry, IOL serial tracking, post-op follow-up." },
  { icon: ReceiptText, title: "Billing & Inventory", text: "Invoices, payments, expenses, insurance, pharmacy, optical and procurement." },
  { icon: ShieldCheck, title: "Roles & Audit", text: "Twelve staff roles, permission-aware navigation and full audit trail." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Eye className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">Vision Care HMS</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
          Eye hospital management system
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
          The complete clinical and commercial workspace for eye care
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
          From the first enquiry to post-operative follow-up — every appointment, refraction,
          diagnosis, surgery, implant, invoice and stock movement linked to the patient record,
          across every branch.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Enter the clinic workspace</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <article key={f.title} className="surface-card p-5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h2 className="mt-3 font-display text-base font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Vision Care Eye Hospital Management System
      </footer>
    </div>
  );
}
