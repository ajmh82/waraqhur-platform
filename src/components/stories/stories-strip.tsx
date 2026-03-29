/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

type Story = {
  id: string;
  type: "IMAGE" | "VIDEO" | "TEXT";
  mediaUrl: string | null;
  textContent: string | null;
  backgroundStyle: string | null;
  caption: string | null;
  createdAt: string;
  isOwner: boolean;
  viewCount: number;
};
type StoryGroup = {
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
  stories: Story[];
  hasUnseen: boolean;
};

type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  highlight: boolean;
};

type DrawPath = { color: string; size: number; points: Array<{ x: number; y: number }> };

const COLORS = ["#ffffff", "#000000", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
const PREVIEW_W = 360;
const PREVIEW_H = 640;
const OUT_W = 1080;
const OUT_H = 1920;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function StoriesStrip() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [, setImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");

  const [tool, setTool] = useState<"move" | "text" | "draw">("move");
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState(46);
  const [highlight, setHighlight] = useState(false);
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const [drawColor, setDrawColor] = useState("#ffffff");
  const [drawSize, setDrawSize] = useState(6);
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [activePath, setActivePath] = useState<DrawPath | null>(null);
  const drawingRef = useRef(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentGroup = groups[groupIndex] ?? null;
  const currentStory = currentGroup?.stories?.[storyIndex] ?? null;

  async function loadFeed() {
    setLoading(true);
    try {
      const res = await fetch("/api/stories/feed", { credentials: "include", cache: "no-store" });
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
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);

    const all = activePath ? [...paths, activePath] : paths;
    for (const p of all) {
      if (!p.points.length) continue;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i].x, p.points[i].y);
      ctx.stroke();
    }
  }, [paths, activePath]);

  function pickImage() {
    fileInputRef.current?.click();
  }

  function onSelectImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("اختر صورة فقط");
      return;
    }
    if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setEditorOpen(true);
    setTool("move");
    setLayers([]);
    setPaths([]);
    setActivePath(null);
    setCaption("");
  }

  function pointFromEvent(e: React.PointerEvent) {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return { x: PREVIEW_W / 2, y: PREVIEW_H / 2 };
    return {
      x: Math.max(0, Math.min(PREVIEW_W, ((e.clientX - r.left) / r.width) * PREVIEW_W)),
      y: Math.max(0, Math.min(PREVIEW_H, ((e.clientY - r.top) / r.height) * PREVIEW_H)),
    };
  }

  function onStagePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (tool === "draw") {
      drawingRef.current = true;
      const p = pointFromEvent(e);
      setActivePath({ color: drawColor, size: drawSize, points: [p] });
      return;
    }

    if (tool === "text") {
      const p = pointFromEvent(e);
      const id = uid();
      setLayers((prev) => [
        ...prev,
        { id, text: "اكتب هنا", x: p.x, y: p.y, color: textColor, fontSize, highlight },
      ]);
      setSelectedLayerId(id);
      return;
    }
  }

  function onStagePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (tool !== "draw" || !drawingRef.current) return;
    const p = pointFromEvent(e);
    setActivePath((prev) => (prev ? { ...prev, points: [...prev.points, p] } : prev));
  }

  function onStagePointerUp() {
    if (tool !== "draw") return;
    drawingRef.current = false;
    setActivePath((prev) => {
      if (prev && prev.points.length > 1) setPaths((old) => [...old, prev]);
      return null;
    });
  }

  function dragLayer(id: string, e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    setSelectedLayerId(id);
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;

    const sx = e.clientX;
    const sy = e.clientY;
    const start = layers.find((l) => l.id === id);
    if (!start) return;

    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / r.width) * PREVIEW_W;
      const dy = ((ev.clientY - sy) / r.height) * PREVIEW_H;
      setLayers((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, x: Math.max(0, Math.min(PREVIEW_W, start.x + dx)), y: Math.max(0, Math.min(PREVIEW_H, start.y + dy)) }
            : l
        )
      );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  async function renderFinalImageBlob() {
    if (!imageUrl) throw new Error("لا توجد صورة");
    const img = new Image();
    img.src = imageUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("فشل تحميل الصورة"));
    });

    const out = document.createElement("canvas");
    out.width = OUT_W;
    out.height = OUT_H;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("canvas error");

    const fit = Math.max(OUT_W / img.width, OUT_H / img.height);
    const dw = img.width * fit;
    const dh = img.height * fit;
    const dx = (OUT_W - dw) / 2;
    const dy = (OUT_H - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);

    for (const p of paths) {
      if (!p.points.length) continue;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * (OUT_W / PREVIEW_W);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo((p.points[0].x / PREVIEW_W) * OUT_W, (p.points[0].y / PREVIEW_H) * OUT_H);
      for (let i = 1; i < p.points.length; i++) {
        ctx.lineTo((p.points[i].x / PREVIEW_W) * OUT_W, (p.points[i].y / PREVIEW_H) * OUT_H);
      }
      ctx.stroke();
    }

    for (const l of layers) {
      const x = (l.x / PREVIEW_W) * OUT_W;
      const y = (l.y / PREVIEW_H) * OUT_H;
      const fs = l.fontSize * (OUT_W / PREVIEW_W);
      ctx.font = `800 ${fs}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (l.highlight) {
        const m = ctx.measureText(l.text);
        const tw = m.width + 30;
        const th = fs + 22;
        ctx.fillStyle = "rgba(0,0,0,0.58)";
        ctx.fillRect(x - tw / 2, y - th / 2, tw, th);
      }
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, x, y);
    }

    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) throw new Error("فشل تجهيز الصورة");
    return blob;
  }

  async function publishStory() {
    try {
      const blob = await renderFinalImageBlob();
      const file = new File([blob], `story-${Date.now()}.jpg`, { type: "image/jpeg" });

      const form = new FormData();
      form.append("file", file);

      const upRes = await fetch("/api/uploads", { method: "POST", body: form, credentials: "include" });
      const upPayload = await upRes.json().catch(() => null);
      if (!upRes.ok || !upPayload?.success) throw new Error(upPayload?.error?.message ?? "فشل الرفع");

      const mediaUrl = upPayload?.data?.url ?? upPayload?.data?.fileUrl ?? upPayload?.data?.mediaUrl ?? null;
      if (!mediaUrl) throw new Error("لم يتم الحصول على رابط الصورة");

      const createRes = await fetch("/api/stories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "IMAGE", mediaUrl, caption: caption || null, privacy: "AUTHENTICATED" }),
      });

      const createPayload = await createRes.json().catch(() => null);
      if (!createRes.ok || !createPayload?.success) throw new Error(createPayload?.error?.message ?? "فشل إنشاء الستوري");

      setEditorOpen(false);
      await loadFeed();
    } catch (e: any) {
      alert(e?.message ?? "خطأ");
    }
  }

  function openGroup(idx: number) {
    const g = groups[idx];
    if (!g || g.stories.length === 0) return;
    setGroupIndex(idx);
    setStoryIndex(0);
    setViewerOpen(true);
  }

  function goPrev() {
    if (!currentGroup) return;
    if (storyIndex > 0) return setStoryIndex((x) => x - 1);
    if (groupIndex > 0) {
      const prev = groups[groupIndex - 1];
      setGroupIndex((x) => x - 1);
      setStoryIndex(Math.max(0, prev.stories.length - 1));
      return;
    }
    setViewerOpen(false);
  }

  function goNext() {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) return setStoryIndex((x) => x + 1);
    if (groupIndex < groups.length - 1) {
      setGroupIndex((x) => x + 1);
      setStoryIndex(0);
      return;
    }
    setViewerOpen(false);
  }

  useEffect(() => {
    if (!viewerOpen || !currentStory) return;
    void fetch(`/api/stories/${currentStory.id}/seen`, { method: "POST", credentials: "include" }).catch(() => {});
  }, [viewerOpen, currentStory?.id]);

  async function openViewers() {
    if (!currentStory?.isOwner) return;
    const res = await fetch(`/api/stories/${currentStory.id}/viewers`, { credentials: "include", cache: "no-store" });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) return alert(payload?.error?.message ?? "تعذر جلب المشاهدين");
    setViewers(Array.isArray(payload?.data?.viewers) ? payload.data.viewers : []);
    setViewersOpen(true);
  }

  return (
    <>
      <section className="stories-strip">
        <button className="story-bubble add" onClick={pickImage}>
          <span className="story-bubble-inner">+</span>
          <small>إضافة ستوري</small>
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => onSelectImage(e.target.files?.[0] ?? null)}
      />

      {editorOpen && imageUrl ? (
        <div className="ig-full-editor">
          <div className="ig-top-float">
            <button onClick={() => setEditorOpen(false)}>✕</button>
            <button className={tool === "move" ? "on" : ""} onClick={() => setTool("move")}>✋</button>
            <button className={tool === "text" ? "on" : ""} onClick={() => setTool("text")}>Tt</button>
            <button className={tool === "draw" ? "on" : ""} onClick={() => setTool("draw")}>🖌️</button>
            <button onClick={() => setLayers((p) => p.slice(0, -1))}>↶T</button>
            <button onClick={() => setPaths((p) => p.slice(0, -1))}>↶🖌️</button>
            <button className="publish" onClick={publishStory}>نشر</button>
          </div>

          <div
            ref={stageRef}
            className="ig-stage"
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
            onPointerLeave={onStagePointerUp}
          >
            <img src={imageUrl} alt="story" className="ig-bg" />
            <canvas ref={drawCanvasRef} width={PREVIEW_W} height={PREVIEW_H} className="ig-draw" />
            {layers.map((l) => (
              <div
                key={l.id}
                contentEditable
                suppressContentEditableWarning
                className={`ig-text-layer ${selectedLayerId === l.id ? "selected" : ""} ${l.highlight ? "highlight" : ""}`}
                style={{ left: l.x, top: l.y, color: l.color, fontSize: l.fontSize }}
                onInput={(e) => {
                  const text = (e.currentTarget.textContent ?? "").trim();
                  setLayers((prev) => prev.map((x) => (x.id === l.id ? { ...x, text: text || " " } : x)));
                }}
                onPointerDown={(e) => dragLayer(l.id, e)}
                onFocus={() => setSelectedLayerId(l.id)}
              >
                {l.text}
              </div>
            ))}
          </div>

          <div className="ig-side-float">
            <input type="range" min="24" max="88" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
            <input type="range" min="2" max="18" value={drawSize} onChange={(e) => setDrawSize(Number(e.target.value))} />
            <button onClick={() => setHighlight((v) => !v)}>{highlight ? "Highlight On" : "Highlight Off"}</button>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" />
            <div className="ig-colors">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className="dot"
                  style={{ background: c }}
                  onClick={() => {
                    setTextColor(c);
                    setDrawColor(c);
                    if (selectedLayerId) {
                      setLayers((prev) => prev.map((x) => (x.id === selectedLayerId ? { ...x, color: c, highlight, fontSize } : x)));
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {viewerOpen && currentGroup && currentStory ? (
        <div className="story-overlay viewer">
          <div className="story-viewer">
            <header className="story-viewer-head">
              <div className="who">
                {currentGroup.author.avatarUrl ? <img src={currentGroup.author.avatarUrl} alt={currentGroup.author.username} /> : <span className="fallback">{currentGroup.author.username.slice(0, 1)}</span>}
                <div><strong>{currentGroup.author.displayName}</strong><small>{new Date(currentStory.createdAt).toLocaleString()}</small></div>
              </div>
              <div className="actions">
                {currentStory.isOwner ? <button onClick={openViewers}>👁 {currentStory.viewCount}</button> : null}
                <button onClick={() => setViewerOpen(false)}>إغلاق</button>
              </div>
            </header>
            <div className="story-slide">
              {currentStory.type === "IMAGE" && currentStory.mediaUrl ? <img src={currentStory.mediaUrl} alt="story" /> : null}
              {currentStory.type === "TEXT" ? <div className="story-text-slide" style={{ background: currentStory.backgroundStyle ?? "#111827" }}><p>{currentStory.textContent}</p></div> : null}
              {currentStory.type === "VIDEO" && currentStory.mediaUrl ? <video src={currentStory.mediaUrl} autoPlay controls /> : null}
              <button className="nav left" onClick={goPrev} />
              <button className="nav right" onClick={goNext} />
            </div>
          </div>
        </div>
      ) : null}

      {viewersOpen ? (
        <div className="story-overlay">
          <div className="story-modal">
            <div className="story-modal-head"><strong>المشاهدات ({viewers.length})</strong><button onClick={() => setViewersOpen(false)}>إغلاق</button></div>
            <div className="story-viewers-list">
              {viewers.length === 0 ? <p>لا توجد مشاهدات بعد</p> : null}
              {viewers.map((v) => (
                <div key={`${v.id}-${v.viewedAt}`} className="viewer-row">
                  {v.avatarUrl ? <img src={v.avatarUrl} alt={v.username} /> : <span>{String(v.username || "?").slice(0, 1).toUpperCase()}</span>}
                  <div><strong>{v.displayName}</strong><small>@{v.username}</small></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
