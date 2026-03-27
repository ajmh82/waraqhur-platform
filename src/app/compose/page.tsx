import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { ComposeTweetForm } from "@/components/compose/compose-tweet-form";

export default async function ComposePage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  return (
    <AppShell>
      <section className="page-section">
        <ComposeTweetForm locale={locale} />
      </section>
    </AppShell>
  );
}
