import Link from "next/link";
import { TimelineList } from "@/components/content/timeline-list";
import { SectionHeading } from "@/components/content/section-heading";
import { AppHeader } from "@/components/layout/app-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface HomePageData {
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    createdAt: string;
    commentsCount: number;
    likesCount?: number;
    category: {
      id: string;
      name: string;
      slug: string;
    } | null;
    source: {
      id: string;
      name: string;
      slug: string;
    } | null;
    author: {
      id: string;
      email: string;
      username: string;
    } | null;
  }>;
}

interface CategoriesData {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

interface SourcesData {
  sources: Array<{
    id: string;
    name: string;
    slug: string;
    type?: string;
  }>;
}

interface HomePageResult {
  postsData: HomePageData | null;
  categoriesData: CategoriesData | null;
  sourcesData: SourcesData | null;
  error: string | null;
}

async function loadHomePageData(): Promise<HomePageResult> {
  try {
    const [postsData, categoriesData, sourcesData] = await Promise.all([
      apiGet<HomePageData>("/api/posts?sort=latest&page=1&limit=8"),
      apiGet<CategoriesData>("/api/categories"),
      apiGet<SourcesData>("/api/sources"),
    ]);

    return {
      postsData,
      categoriesData,
      sourcesData,
      error: null,
    };
  } catch (error) {
    return {
      postsData: null,
      categoriesData: null,
      sourcesData: null,
      error:
        error instanceof Error
          ? error.message
          : "تعذر تحميل بيانات الصفحة الرئيسية.",
    };
  }
}

export default async function HomePage() {
  const { postsData, categoriesData, sourcesData, error } =
    await loadHomePageData();

  if (error || !postsData || !categoriesData || !sourcesData) {
    return (
      <main className="page-stack">
        <div className="page-container">
          <AppHeader />
          <ErrorState
            title="تعذر تحميل الصفحة الرئيسية"
            description={error ?? "تعذر تحميل بيانات الصفحة الرئيسية."}
          />
        </div>
      </main>
    );
  }

  const featuredPosts = postsData.posts.slice(0, 8);
  const featuredCategories = categoriesData.categories.slice(0, 6);
  const featuredSources = sourcesData.sources.slice(0, 6);

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section className="hero-panel">
          <p className="eyebrow">وراق حر</p>

          <h1 className="hero-panel__title">
            منصة عربية حديثة لمتابعة الأخبار والمصادر والتصنيفات في واجهة واحدة.
          </h1>

          <p className="hero-panel__description">
            الصفحة الرئيسية هنا لم تعد مجرد بداية عامة، بل نقطة دخول عملية
            للموجز، والمصادر، والتصنيفات، بحيث يصل المستخدم سريعًا إلى زاوية
            القراءة التي تناسبه.
          </p>

          <div className="hero-metrics">
            <article className="hero-metric">
              <strong>{postsData.posts.length}</strong>
              <span>عنصر معروض</span>
            </article>
            <article className="hero-metric">
              <strong>{categoriesData.categories.length}</strong>
              <span>تصنيف</span>
            </article>
            <article className="hero-metric">
              <strong>{sourcesData.sources.length}</strong>
              <span>مصدر</span>
            </article>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "22px",
            }}
          >
            <Link href="/timeline" className="btn">
              اذهب إلى التايملاين
            </Link>
            <Link href="/login" className="btn small">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="btn small">
              إنشاء حساب
            </Link>
          </div>
        </section>

        <section className="page-section">
          <SectionHeading
            eyebrow="استكشاف سريع"
            title="ابدأ من التصنيفات أو من المصادر"
            description="يمكنك البدء من الموضوع الذي يهمك أو من الجهة التي تنشر المحتوى، بدل الاعتماد على موجز واحد فقط."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "18px",
            }}
          >
            <div className="state-card">
              <h3 style={{ marginTop: 0 }}>تصنيفات بارزة</h3>
              <div style={{ display: "grid", gap: "10px" }}>
                {featuredCategories.length === 0 ? (
                  <p style={{ margin: 0 }}>لا توجد تصنيفات متاحة حاليًا.</p>
                ) : (
                  featuredCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/categories/${category.slug}`}
                      className="btn small"
                    >
                      {category.name}
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="state-card">
              <h3 style={{ marginTop: 0 }}>مصادر بارزة</h3>
              <div style={{ display: "grid", gap: "10px" }}>
                {featuredSources.length === 0 ? (
                  <p style={{ margin: 0 }}>لا توجد مصادر متاحة حاليًا.</p>
                ) : (
                  featuredSources.map((source) => (
                    <Link
                      key={source.id}
                      href={`/sources/${source.slug}`}
                      className="btn small"
                    >
                      {source.name}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="page-section">
          <SectionHeading
            eyebrow="أحدث ما وصل"
            title="محتوى حديث من داخل المنصة"
            description="هذه القائمة المختصرة تعرض أحدث العناصر المنشورة، ويمكنك الانتقال بعدها إلى التايملاين الكامل لمتابعة المزيد."
          />

          {featuredPosts.length === 0 ? (
            <EmptyState
              title="لا توجد أخبار منشورة بعد"
              description="أضف مصادر ومحتوى أكثر حتى يبدأ الموجز الرئيسي بالعمل بشكل فعلي."
            />
          ) : (
            <TimelineList posts={featuredPosts} />
          )}

          <div style={{ marginTop: "18px" }}>
            <Link href="/timeline" className="btn">
              عرض الموجز الكامل
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
