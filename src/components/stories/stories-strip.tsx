"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type StoryType = "IMAGE" | "VIDEO" | "TEXT";
type Story = {
  id: string;
  type: StoryType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  textContent: string | null;
  backgroundStyle: string | null;
  caption: string | null;
  durationSeconds: number;
  createdAt: string;
  isSeen: boolean;
  isOwner: boolean;
  viewCount: number;
};
type StoryGroup = {
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
  stories: Story[];
  hasUnseen: boolean;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

export function StoriesStrip() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<StoryType>("IMAGE");
  const [composerCaption, setComposerCaption] = useState("");
  const [composerText, setComposerText] = useState("");
  const [composerBg, setComposerBg] = useState("linear-gradient(135deg,#0f172a,#1d4ed8)");
  const [composerFile, setComposerFile] = useState<File | null>(null);
  const [composerPreview, setComposerPreview] = useState<string | null>(null);

  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const timerRef = useRef<number | null>(null);

  const currentGroup = groups[groupIndex] ?? null;
  const currentStory = currentGroup?.stories?.[storyIndex] ?? null;

  async function loadFeed() {
    setLoading(true);
    try {
      const res = await fetch("/api/stories/feed", { cache: "no-store", credentials: "include" });
      const payload = await res.json().catch(() => null);
      setGroups(Array.isArray(payload?.data?.groups) ? payload.data.groups : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();
  }, []);

  useEffect(() => {
    if (!viewerOpen || !currentStory || paused) return;
    const durationMs = Math.max(1000, (currentStory.durationSeconds || 5) * 1000);
    const startedAt = Date.now() - progress * durationMs;

    timerRef.current = window.setInterval(() => {
      const next = Math.min(1, (Date.now() - startedAt) / durationMs);
      setProgress(next);
      if (next >= 1) {
        window.clearInterval(timerRef.current!);
        timerRef.current = null;
        goNext();
      }
    }, 50);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [viewerOpen, currentStory?.id, paused]);

  useEffect(() => {
    if (!viewerOpen || !currentStory) return;
    setProgress(0);
    if (currentStory.type === "IMAGE" && currentStory.mediaUrl) {
      const img = new Image();
      img.src = currentStory.mediaUrl;
    }
    void fetch(`/api/stories/${currentStory.id}/seen`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, [viewerOpen, groupIndex, storyIndex]);

  function openGroup(idx: number) {
    const g = groups[idx];
    if (!g || g.stories.length === 0) return;
    const firstUnseen = g.stories.findIndex((s) => !s.isSeen && !s.isOwner);
    setGroupIndex(idx);
    setStoryIndex(firstUnseen >= 0 ? firstUnseen : 0);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
    setPaused(false);
    setProgress(0);
  }

  function goPrev() {
    if (!currentGroup) return;
    if (storyIndex > 0) {
      setStoryIndex((x) => x - 1);
      return;
    }
    if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex((x) => x - 1);
      setStoryIndex(Math.max(0, prevGroup.stories.length - 1));
      return;
    }
    closeViewer();
  }

  function goNext() {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((x) => x + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((x) => x + 1);
      setStoryIndex(0);
      return;
    }
    closeViewer();
  }

  async function publishStory() {
    if (busy) return;
    setBusy(true);
    try {
      let mediaUrl: string | null = null;
      let type: StoryType = composerType;

      if (type !== "TEXT") {
        if (!composerFile) throw new Error("اختر ملفًا أولاً");
        if (composerFile.type.startsWith("image/")) {
          if (composerFile.size > MAX_IMAGE_SIZE) throw new Error("حجم الصورة أكبر من 5MB");
          type = "IMAGE";
        } else if (composerFile.type.startsWith("video/")) {
          if (composerFile.size > MAX_VIDEO_SIZE) throw new Error("حجم الفيديو أكبر من 20MB");
          type = "VIDEO";
        } else {
          throw new Error("نوع الملف غير مدعوم");
        }

        const form = new FormData();
        form.append("file", composerFile);
        const uploadRes = await fetch("/api/uploads", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        const uploadPayload = await uploadRes.json().catch(() => null);
        if (!uploadRes.ok || !uploadPayload?.success) {
          throw new Error(uploadPayload?.error?.message ?? "فشل رفع الملف");
        }
        mediaUrl =
          uploadPayload?.data?.url ??
          uploadPayload?.data?.fileUrl ??
          uploadPayload?.data?.mediaUrl ??
          null;

        if (!mediaUrl) throw new Error("تعذر قراءة رابط الملف المرفوع");
      }

      const body: any = {
        type,
        mediaUrl,
        caption: composerCaption || null,
        privacy: "AUTHENTICATED",
      };

      if (type === "TEXT") {
        body.textContent = composerText;
        body.backgroundStyle = composerBg;
      }

      const createRes = await fetch("/api/stories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const payload = await createRes.json().catch(() => null);
      if (!createRes.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? "فشل إنشاء الستوري");
      }

      setComposerOpen(false);
      setComposerFile(null);
      setComposerPreview(null);
      setComposerCaption("");
      setComposerText("");
      await loadFeed();
    } catch (e: any) {
      alert(e?.message ?? "حدث خطأ");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCurrentStory() {
    if (!currentStory) return;
    if (!confirm("حذف الستوري؟")) return;

    const res = await fetch(`/api/stories/${currentStory.id}`, { method: "DELETE", credentials: "include" });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      alert(payload?.error?.message ?? "تعذر حذف الستوري");
      return;
    }

    await loadFeed();
    closeViewer();
  }

  async function openViewers() {
    if (!currentStory) return;
    const res = await fetch(`/api/stories/${currentStory.id}/viewers`, { credentials: "include", cache: "no-store" });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      alert(payload?.error?.message ?? "تعذر جلب المشاهدين");
      return;
    }
    setViewers(Array.isArray(payload?.data?.viewers) ? payload.data.viewers : []);
    setViewersOpen(true);
  }

  const hasMyStory = useMemo(
    () => groups.some((g) => g.stories.some((s) => s.isOwner)),
    [groups]
  );

  return (
    <>
      <section className="stories-strip">
        <button className="story-bubble add" onClick={() => setComposerOpen(true)}>
          <span className="story-bubble-inner">+</span>
          <small>{hasMyStory ? "قصتك +" : "إضافة ستوري"}</small>
        </button>

        {groups.map((g, idx) => (
          <button key={g.author.id} className="story-bubble" onClick={() => openGroup(idx)}>
            <span className={`story-ring ${g.hasUnseen ? "unseen" : "seen"}`}>
              {g.author.avatarUrl ? <img src={g.author.avatarUrl} alt={g.author.username} /> : <span>{g.author.username.slice(0, 1).toUpperCase()}</span>}
            </span>
            <small>{g.author.displayName}</small>
          </button>
        ))}

        {loading && <div className="stories-loading">...</div>}
      </section>

      {composerOpen && (
        <div className="story-overlay">
          <div className="story-modal">
            <div className="story-modal-head">
              <strong>إنشاء ستوري</strong>
              <button onClick={() => setComposerOpen(false)}>إغلاق</button>
            </div>

            <div className="story-type-tabs">
              <button className={composerType === "IMAGE" ? "active" : ""} onClick={() => setComposerType("IMAGE")}>صورة</button>
              <button className={composerType === "VIDEO" ? "active" : ""} onClick={() => setComposerType("VIDEO")}>فيديو</button>
              <button className={composerType === "TEXT" ? "active" : ""} onClick={() => setComposerType("TEXT")}>نص</button>
            </div>

            {composerType !== "TEXT" ? (
              <>
                <input
                  type="file"
                  accept={composerType === "VIDEO" ? "video/*" : "image/*"}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setComposerFile(f);
                    if (composerPreview?.startsWith("blob:")) URL.revokeObjectURL(composerPreview);
                    setComposerPreview(f ? URL.createObjectURL(f) : null);
                  }}
                />
                {composerPreview && composerType === "IMAGE" ? <img src={composerPreview} alt="preview" className="story-compose-preview" /> : null}
                {composerPreview && composerType === "VIDEO" ? <video src={composerPreview} className="story-compose-preview" controls /> : null}
              </>
            ) : (
              <div className="story-text-editor" style={{ background: composerBg }}>
                <textarea
                  placeholder="اكتب نص الستوري..."
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                />
                <input
                  value={composerBg}
                  onChange={(e) => setComposerBg(e.target.value)}
                  placeholder="linear-gradient(...)"
                />
              </div>
            )}

            <input
              placeholder="تعليق اختياري"
              value={composerCaption}
              onChange={(e) => setComposerCaption(e.target.value)}
              maxLength={180}
            />

            <button className="story-publish-btn" disabled={busy} onClick={publishStory}>
              {busy ? "جاري النشر..." : "نشر الستوري"}
            </button>
          </div>
        </div>
      )}

      {viewerOpen && currentGroup && currentStory && (
        <div className="story-overlay viewer">
          <div
            className="story-viewer"
            onMouseDown={() => setPaused(true)}
            onMouseUp={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
          >
            <div className="story-progress-row">
              {currentGroup.stories.map((s, i) => (
                <span key={s.id} className="story-progress-track">
                  <span
                    className="story-progress-fill"
                    style={{
                      width:
                        i < storyIndex ? "100%" : i > storyIndex ? "0%" : `${Math.round(progress * 100)}%`,
                    }}
                  />
                </span>
              ))}
            </div>

            <header className="story-viewer-head">
              <div className="who">
                {currentGroup.author.avatarUrl ? <img src={currentGroup.author.avatarUrl} alt={currentGroup.author.username} /> : <span className="fallback">{currentGroup.author.username.slice(0, 1)}</span>}
                <div>
                  <strong>{currentGroup.author.displayName}</strong>
                  <small>{new Date(currentStory.createdAt).toLocaleString()}</small>
                </div>
              </div>
              <div className="actions">
                {currentStory.isOwner ? (
                  <>
                    <button onClick={openViewers}>المشاهدات ({currentStory.viewCount})</button>
                    <button onClick={deleteCurrentStory}>حذف</button>
                  </>
                ) : null}
                <button onClick={closeViewer}>إغلاق</button>
              </div>
            </header>

            <div className="story-slide">
              {currentStory.type === "TEXT" ? (
                <div className="story-text-slide" style={{ background: currentStory.backgroundStyle ?? "#111827" }}>
                  <p>{currentStory.textContent}</p>
                  {currentStory.caption ? <small>{currentStory.caption}</small> : null}
                </div>
              ) : null}
              {currentStory.type === "IMAGE" && currentStory.mediaUrl ? (
                <img src={currentStory.mediaUrl} alt="story" />
              ) : null}
              {currentStory.type === "VIDEO" && currentStory.mediaUrl ? (
                <video
                  src={currentStory.mediaUrl}
                  autoPlay
                  playsInline
                  muted={false}
                  onLoadedMetadata={(e) => {
                    const d = Math.floor((e.currentTarget.duration || 0));
                    if (d > 0 && d <= 60) {
                      const g = groups[groupIndex];
                      if (g?.stories?.[storyIndex]) g.stories[storyIndex].durationSeconds = d;
                    }
                  }}
                />
              ) : null}

              <button className="nav left" onClick={goPrev} aria-label="previous" />
              <button className="nav right" onClick={goNext} aria-label="next" />
            </div>
          </div>
        </div>
      )}

      {viewersOpen && (
        <div className="story-overlay">
          <div className="story-modal">
            <div className="story-modal-head">
              <strong>المشاهدات</strong>
              <button onClick={() => setViewersOpen(false)}>إغلاق</button>
            </div>
            <div className="story-viewers-list">
              {viewers.length === 0 ? <p>لا توجد مشاهدات بعد</p> : null}
              {viewers.map((v) => (
                <div key={`${v.id}-${v.viewedAt}`} className="viewer-row">
                  {v.avatarUrl ? <img src={v.avatarUrl} alt={v.username} /> : <span>{String(v.username || "?").slice(0, 1).toUpperCase()}</span>}
                  <div>
                    <strong>{v.displayName}</strong>
                    <small>@{v.username}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
