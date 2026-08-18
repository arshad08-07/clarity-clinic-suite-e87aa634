import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/lib/settings";

/**
 * Clinic letterhead for printed documents. Hidden on screen, printed at the
 * top of any page that uses the browser print action.
 */
export function DocumentHeader({ subtitle }: { subtitle?: string }) {
  const { primaryBranchId } = useAuth();
  const { settings } = useSettings(primaryBranchId);
  const id = settings.clinic_identity;
  const branding = settings.branding;

  const address = [id.address, id.city, id.state, id.pincode].filter(Boolean).join(", ");
  const contact = [id.phone, id.email, id.website].filter(Boolean).join(" · ");

  return (
    <div
      className="mb-4 hidden items-center gap-4 border-b-2 pb-3 print:flex"
      style={{ borderColor: branding.accent }}
    >
      {branding.show_logo && id.logo_url ? (
        <img src={id.logo_url} alt="" className="h-12 w-auto" />
      ) : null}
      <div className="leading-tight">
        <p className="font-display text-lg font-semibold">{id.name}</p>
        {address ? <p className="text-xs text-muted-foreground">{address}</p> : null}
        {contact ? <p className="text-xs text-muted-foreground">{contact}</p> : null}
        {branding.show_gst && id.gst_no ? (
          <p className="text-xs text-muted-foreground">
            {settings.billing.tax_label} No: {id.gst_no}
          </p>
        ) : null}
        {subtitle ? <p className="mt-1 text-xs font-medium">{subtitle}</p> : null}
        {branding.document_header ? (
          <p className="text-xs text-muted-foreground">{branding.document_header}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Print-only footer line from branding settings. */
export function DocumentFooter() {
  const { primaryBranchId } = useAuth();
  const { settings } = useSettings(primaryBranchId);
  if (!settings.branding.document_footer) return null;
  return (
    <p className="mt-6 hidden text-center text-[10px] text-muted-foreground print:block">
      {settings.branding.document_footer}
    </p>
  );
}
