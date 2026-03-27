import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { SearchExplorer } from "@/components/search/search-explorer";

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const initialQuery = typeof params.q === "string" ? params.q : "";
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  return (
    <AppShell>
      <section className="page-section">
        <SearchExplorer initialQuery={initialQuery} locale={locale} />
      </section>
    </AppShell>
  );
}
