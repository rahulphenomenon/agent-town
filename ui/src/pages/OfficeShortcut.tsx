import { useEffect } from "react";
import { useCompany } from "../context/CompanyContext";

export function OfficeShortcutPage() {
  const { companies, selectedCompany } = useCompany();
  const company = selectedCompany ?? companies[0] ?? null;
  const officeUrl = import.meta.env.VITE_OFFICE_URL;

  useEffect(() => {
    if (!officeUrl || !company || typeof window === "undefined") {
      return;
    }

    const destination = new URL(officeUrl, window.location.origin);
    destination.searchParams.set("companyId", company.id);
    window.location.assign(destination.toString());
  }, [company, officeUrl]);

  if (!officeUrl) {
    return <div>Office URL is not configured.</div>;
  }

  if (!company) {
    return <div>Select a company before opening Paperclip Office.</div>;
  }

  return <div>Opening office for {company.name}…</div>;
}
