import Link from "next/link";

interface MediaGalleryItem {
  id: string;
  title: string;
  slug: string | null;
  mediaUrl: string;
  mediaType: "image" | "video";
  author: {
    username: string;
    displayName: string;
  } | null;
}

interface MediaGalleryProps {
  locale?: "ar" | "en";
  items: MediaGalleryItem[];
}

const copy = {
  ar: {
    title: "الوسائط",
    countSuffix: "عنصر وسائط من التغريدات",
    empty: "لا توجد وسائط منشورة في التغريدات حتى الآن.",
    unknownAuthor: "كاتب غير معروف",
    untitled: "تغريدة بدون عنوان",
    imageTag: "صورة",
    videoTag: "فيديو",
  },
  en: {
    title: "Media",
    countSuffix: "media items from posts",
    empty: "No media has been posted yet.",
    unknownAuthor: "Unknown author",
    untitled: "Untitled post",
    imageTag: "Image",
    videoTag: "Video",
  },
} as const;

export function MediaGallery({ locale = "ar", items }: MediaGalleryProps) {
  const t = copy[locale];

  if (items.length === 0) {
    return (
      <section className="state-card" style={{ margin: 0, maxWidth: "100%", padding: "20px", display: "grid", gap: "10px" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>{t.title}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>{t.empty}</p>
      </section>
    );
  }

  return (
    <section className="state-card" style={{ margin: 0, maxWidth: "100%", padding: "20px", display: "grid", gap: "16px" }}>
      <div style={{ display: "grid", gap: "4px" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>{t.title}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {items.length} {t.countSuffix}
        </p>
      </div>

      <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {items.map((item) => {
          const href = item.slug ? `/posts/${item.slug}` : "/timeline";

          return (
            <Link key={item.id} href={href} style={{ textDecoration: "none", color: "inherit" }}>
              <article
                style={{
                  display: "grid",
                  gap: "10px",
                  padding: "12px",
                  borderRadius: "18px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 12px 28px rgba(2, 6, 23, 0.16)",
                }}
              >
                <div style={{ position: "relative", overflow: "hidden", borderRadius: "14px", background: "#020617", aspectRatio: "1 / 1" }}>
                  {item.mediaType === "image" ? (
                    <img
                      src={item.mediaUrl}
                      alt={item.title || t.untitled}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <video
                      src={item.mediaUrl}
                      muted
                      playsInline
                      preload="metadata"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#000" }}
                    />
                  )}

                  <span
                    style={{
                      position: "absolute",
                      top: "8px",
                      insetInlineEnd: "8px",
                      padding: "3px 8px",
                      borderRadius: "999px",
                      background: "rgba(0,0,0,0.55)",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {item.mediaType === "image" ? t.imageTag : t.videoTag}
                  </span>
                </div>

                <div style={{ display: "grid", gap: "4px" }}>
                  <strong
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.title || t.untitled}
                  </strong>

                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                    {item.author
                      ? `${item.author.displayName} @${item.author.username}`
                      : t.unknownAuthor}
                  </span>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
