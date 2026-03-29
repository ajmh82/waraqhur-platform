/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type StoryType = "IMAGE" | "VIDEO" | "TEXT";
type ToolMode = "move" | "text" | "draw" | "sticker";
type TextStyle = "normal" | "bold" | "highlight" | "capsule" | "typewriter";
type Align = "left" | "center" | "right";

type LayerBase = {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
};

type TextLayer = LayerBase & {
  kind: "text";
  text: string;
  color: string;
  style: TextStyle;
  align: Align;
};

type StickerLayer = LayerBase & {
  kind: "sticker";
  emoji: string;
};

type Layer = TextLayer | StickerLayer;

type DrawPath = {
  color: string;
  size: number;
  points: Array<{ x: number; y: number }>;
};

export type StoryDraftResult =
  | {
      type: "TEXT";
      caption: string;
      privacy: "AUTHENTICATED";
      textContent: string;
      backgroundStyle: string;
    }
  | {
      type: "IMAGE";
      caption: string;
      privacy: "AUTHENTICATED";
      mediaBlob: Blob;
    }
  | {
      type: "VIDEO";
      caption: string;
      privacy: "AUTHENTICATED";
      videoFile: File;
    };

type Props = {
  open: boolean;
  onClose: () => void;
  onPublish: (draft: StoryDraftResult) => Promise<void>;
};

const STAGE_W = 1080;
const STAGE_H = 1920;
const PREVIEW_W = 288;
const PREVIEW_H = 512;

const COLORS = ["#ffffff", "#000000", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
const STICKERS = ["🔥", "❤️", "✨", "😂", "🎉", "💯", "📍", "🎵"];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function StoryEditorModal({ open, onClose, onPublish }: Props) {
  const [type, setType] = useState<StoryType>("IMAGE");
  const [tool, setTool] = useState<ToolMode>("move");
  const [caption, setCaption] = useState("");

  const [, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [textStory, setTextStory] = useState("");
  const [textStoryBg, setTextStoryBg] = useState("linear-gradient(135deg,#0f172a,#1d4ed8)");

  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [redoPaths, setRedoPaths] = useState<DrawPath[]>([]);
  const [activePath, setActivePath] = useState<DrawPath | null>(null);
  const drawingRef = useRef(false);

  const [brushColor, setBrushColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(6);

  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textStyle, setTextStyle] = useState<TextStyle>("normal");
  const [textAlign, setTextAlign] = useState<Align>("center");
  const [waitingTextDrop, setWaitingTextDrop] = useState(false);

  const [bgScale, setBgScale] = useState(1);
  const [bgOffsetX, setBgOffsetX] = useState(0);
  const [bgOffsetY, setBgOffsetY] = useState(0);

  const [busy, setBusy] = useState(false);

  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const selectedLayer = useMemo(
    () => layers.find((l) => l.id === selectedId) ?? null,
    [layers, selectedId]
  );

  useEffect(() => {
    if (!open) return;
    return () => {
      if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
      if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    };
  }, [open, imageUrl, videoUrl]);

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

  function stagePointFromEvent(e: React.PointerEvent | React.MouseEvent) {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return { x: PREVIEW_W / 2, y: PREVIEW_H / 2 };
    const cx = (e as any).clientX ?? 0;
    const cy = (e as any).clientY ?? 0;
    return {
      x: Math.max(0, Math.min(PREVIEW_W, cx - r.left)),
      y: Math.max(0, Math.min(PREVIEW_H, cy - r.top)),
    };
  }

  function addTextAt(x: number, y: number) {
    const t = textInput.trim();
    if (!t) return;
    const layer: TextLayer = {
      id: uid(),
      kind: "text",
      text: t,
      color: textColor,
      style: textStyle,
      align: textAlign,
      x,
      y,
      scale: 1,
      rotation: 0,
      zIndex: layers.length + 1,
    };
    setLayers((p) => [...p, layer]);
    setSelectedId(layer.id);
    setWaitingTextDrop(false);
  }

  function addStickerAt(x: number, y: number, emoji = "✨") {
    const layer: StickerLayer = {
      id: uid(),
      kind: "sticker",
      emoji,
      x,
      y,
      scale: 1,
      rotation: 0,
      zIndex: layers.length + 1,
    };
    setLayers((p) => [...p, layer]);
    setSelectedId(layer.id);
  }

  function onStagePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (type !== "IMAGE") return;
    const p = stagePointFromEvent(e);

    if (tool === "draw") {
      drawingRef.current = true;
      setActivePath({ color: brushColor, size: brushSize, points: [p] });
      return;
    }

    if (tool === "text" && waitingTextDrop) {
      addTextAt(p.x, p.y);
      return;
    }

    if (tool === "sticker") {
      addStickerAt(p.x, p.y, STICKERS[Math.floor(Math.random() * STICKERS.length)]);
      return;
    }
  }

  function onStagePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (tool !== "draw" || !drawingRef.current) return;
    const p = stagePointFromEvent(e);
    setActivePath((prev) => (prev ? { ...prev, points: [...prev.points, p] } : prev));
  }

  function onStagePointerUp() {
    if (tool !== "draw") return;
    drawingRef.current = false;
    setActivePath((prev) => {
      if (prev && prev.points.length > 1) {
        setPaths((p) => [...p, prev]);
        setRedoPaths([]);
      }
      return null;
    });
  }

  function startDragLayer(layerId: string, e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    setSelectedId(layerId);
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;

    const sx = e.clientX;
    const sy = e.clientY;
    const start = layers.find((l) => l.id === layerId);
    if (!start) return;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      setLayers((prev) =>
        prev.map((l) => (l.id === layerId ? { ...l, x: Math.max(0, Math.min(PREVIEW_W, start.x + dx)), y: Math.max(0, Math.min(PREVIEW_H, start.y + dy)) } : l))
      );
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function updateSelected(patch: Partial<LayerBase>) {
    if (!selectedId) return;
    setLayers((prev) => prev.map((l) => (l.id === selectedId ? { ...l, ...patch } : l)));
  }

  function deleteSelected() {
    if (!selectedId) return;
    setLayers((prev) => prev.filter((l) => l.id !== selectedId));
    setSelectedId(null);
  }

  function resetAll() {
    setLayers([]);
    setSelectedId(null);
    setPaths([]);
    setRedoPaths([]);
    setActivePath(null);
    setBgScale(1);
    setBgOffsetX(0);
    setBgOffsetY(0);
  }

  async function renderImageBlob(): Promise<Blob> {
    if (!imageUrl) throw new Error("اختر صورة أولاً");
    const img = new Image();
    img.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
    });

    const out = document.createElement("canvas");
    out.width = STAGE_W;
    out.height = STAGE_H;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("canvas error");

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);

    const fit = Math.max(STAGE_W / img.width, STAGE_H / img.height);
    const finalScale = fit * bgScale;
    const dw = img.width * finalScale;
    const dh = img.height * finalScale;
    const dx = (STAGE_W - dw) / 2 + bgOffsetX * STAGE_W;
    const dy = (STAGE_H - dh) / 2 + bgOffsetY * STAGE_H;
    ctx.drawImage(img, dx, dy, dw, dh);

    for (const p of paths) {
      if (!p.points.length) continue;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * (STAGE_W / PREVIEW_W);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo((p.points[0].x / PREVIEW_W) * STAGE_W, (p.points[0].y / PREVIEW_H) * STAGE_H);
      for (let i = 1; i < p.points.length; i++) {
        ctx.lineTo((p.points[i].x / PREVIEW_W) * STAGE_W, (p.points[i].y / PREVIEW_H) * STAGE_H);
      }
      ctx.stroke();
    }

    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    for (const l of sortedLayers) {
      const x = (l.x / PREVIEW_W) * STAGE_W;
      const y = (l.y / PREVIEW_H) * STAGE_H;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((l.rotation * Math.PI) / 180);
      const scale = l.scale * (STAGE_W / PREVIEW_W);
      ctx.scale(scale, scale);

      if (l.kind === "text") {
        const fontBase = l.style === "typewriter" ? 46 : 52;
        const weight = l.style === "bold" ? "900" : "700";
        const family = l.style === "typewriter" ? "monospace" : "sans-serif";
        ctx.font = `${weight} ${fontBase}px ${family}`;
        ctx.textAlign = l.align as CanvasTextAlign;
        ctx.textBaseline = "middle";
        if (l.style === "highlight" || l.style === "capsule") {
          const m = ctx.measureText(l.text);
          const tw = m.width + 28;
          const th = 68;
          const x0 = l.align === "left" ? 0 : l.align === "right" ? -tw : -tw / 2;
          const y0 = -th / 2;
          ctx.fillStyle = l.style === "capsule" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.58)";
          if (l.style === "capsule") {
            const r = 22;
            ctx.beginPath();
            ctx.moveTo(x0 + r, y0);
            ctx.lineTo(x0 + tw - r, y0);
            ctx.quadraticCurveTo(x0 + tw, y0, x0 + tw, y0 + r);
            ctx.lineTo(x0 + tw, y0 + th - r);
            ctx.quadraticCurveTo(x0 + tw, y0 + th, x0 + tw - r, y0 + th);
            ctx.lineTo(x0 + r, y0 + th);
            ctx.quadraticCurveTo(x0, y0 + th, x0, y0 + th - r);
            ctx.lineTo(x0, y0 + r);
            ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(x0, y0, tw, th);
          }
        }
        ctx.fillStyle = l.color;
        const tx = l.align === "left" ? 0 : l.align === "right" ? 0 : 0;
        ctx.fillText(l.text, tx, 0);
      } else {
        ctx.font = "900 92px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(l.emoji, 0, 0);
      }

      ctx.restore();
    }

    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) throw new Error("blob failed");
    return blob;
  }

  async function submitPublish() {
    if (busy) return;
    setBusy(true);
    try {
      if (type === "TEXT") {
        await onPublish({
          type: "TEXT",
          caption,
          privacy: "AUTHENTICATED",
          textContent: textStory.trim(),
          backgroundStyle: textStoryBg,
        });
        onClose();
        return;
      }

      if (type === "VIDEO") {
        if (!videoFile) throw new Error("اختر فيديو");
        await onPublish({
          type: "VIDEO",
          caption,
          privacy: "AUTHENTICATED",
          videoFile,
        });
        onClose();
        return;
      }

      const mediaBlob = await renderImageBlob();
      await onPublish({
        type: "IMAGE",
        caption,
        privacy: "AUTHENTICATED",
        mediaBlob,
      });
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "فشل النشر");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="story-editor-overlay">
      <div className="story-editor-shell">
        <div className="story-editor-topbar">
          <button onClick={onClose}>إغلاق</button>
          <div className="story-editor-type-tabs">
            <button className={type === "IMAGE" ? "active" : ""} onClick={() => setType("IMAGE")}>صورة</button>
            <button className={type === "VIDEO" ? "active" : ""} onClick={() => setType("VIDEO")}>فيديو</button>
            <button className={type === "TEXT" ? "active" : ""} onClick={() => setType("TEXT")}>نص</button>
          </div>
          <button className="publish" onClick={submitPublish} disabled={busy}>{busy ? "جاري..." : "نشر"}</button>
        </div>

        {type === "TEXT" ? (
          <div className="story-text-mode" style={{ background: textStoryBg }}>
            <textarea value={textStory} onChange={(e) => setTextStory(e.target.value)} placeholder="اكتب ستوري نصية..." />
            <input value={textStoryBg} onChange={(e) => setTextStoryBg(e.target.value)} placeholder="linear-gradient(...)" />
          </div>
        ) : type === "VIDEO" ? (
          <div className="story-video-mode">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setVideoFile(f);
                if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
                setVideoUrl(f ? URL.createObjectURL(f) : null);
              }}
            />
            {videoUrl ? <video src={videoUrl} controls className="story-video-preview" /> : null}
          </div>
        ) : (
          <div className="story-editor-main">
            <aside className="story-editor-left">
              <button className={tool === "move" ? "active" : ""} onClick={() => { setTool("move"); setWaitingTextDrop(false); }}>تحريك</button>
              <button className={tool === "text" ? "active" : ""} onClick={() => setTool("text")}>نص</button>
              <button className={tool === "draw" ? "active" : ""} onClick={() => { setTool("draw"); setWaitingTextDrop(false); }}>فرشاة</button>
              <button className={tool === "sticker" ? "active" : ""} onClick={() => { setTool("sticker"); setWaitingTextDrop(false); }}>ملصقات</button>
              <button onClick={() => { if (!paths.length) return; setRedoPaths((r) => [paths[paths.length - 1], ...r]); setPaths((p) => p.slice(0, -1)); }}>تراجع</button>
              <button onClick={() => { if (!redoPaths.length) return; setPaths((p) => [...p, redoPaths[0]]); setRedoPaths((r) => r.slice(1)); }}>إعادة</button>
              <button onClick={deleteSelected}>حذف عنصر</button>
              <button onClick={resetAll}>مسح الكل</button>
            </aside>

            <div
              ref={stageRef}
              className="story-stage"
              onPointerDown={onStagePointerDown}
              onPointerMove={onStagePointerMove}
              onPointerUp={onStagePointerUp}
              onPointerLeave={onStagePointerUp}
            >
              {!imageUrl ? (
                <label className="story-image-upload">
                  <span>اختر صورة</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setImageFile(f);
                      if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
                      setImageUrl(f ? URL.createObjectURL(f) : null);
                    }}
                  />
                </label>
              ) : (
                <div
                  className="story-bg-image"
                  style={{
                    backgroundImage: `url(${imageUrl})`,
                    transform: `translate(${bgOffsetX * 100}%, ${bgOffsetY * 100}%) scale(${bgScale})`,
                  }}
                />
              )}

              <canvas ref={drawCanvasRef} width={PREVIEW_W} height={PREVIEW_H} className="story-draw-canvas" />

              {[...layers]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((layer) =>
                  layer.kind === "text" ? (
                    <div
                      key={layer.id}
                      className={`story-layer-text ${selectedId === layer.id ? "selected" : ""} style-${layer.style}`}
                      style={{
                        left: layer.x,
                        top: layer.y,
                        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`,
                        color: layer.color,
                        textAlign: layer.align,
                      }}
                      onPointerDown={(e) => startDragLayer(layer.id, e)}
                      onDoubleClick={() => {
                        setSelectedId(layer.id);
                        setTextInput(layer.text);
                        setTool("text");
                      }}
                    >
                      {layer.text}
                    </div>
                  ) : (
                    <div
                      key={layer.id}
                      className={`story-layer-sticker ${selectedId === layer.id ? "selected" : ""}`}
                      style={{
                        left: layer.x,
                        top: layer.y,
                        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`,
                      }}
                      onPointerDown={(e) => startDragLayer(layer.id, e)}
                    >
                      {layer.emoji}
                    </div>
                  )
                )}
            </div>

            <aside className="story-editor-right">
              <label>Zoom<input type="range" min="1" max="2.2" step="0.01" value={bgScale} onChange={(e) => setBgScale(Number(e.target.value))} /></label>
              <label>X<input type="range" min="-0.5" max="0.5" step="0.01" value={bgOffsetX} onChange={(e) => setBgOffsetX(Number(e.target.value))} /></label>
              <label>Y<input type="range" min="-0.5" max="0.5" step="0.01" value={bgOffsetY} onChange={(e) => setBgOffsetY(Number(e.target.value))} /></label>
              <label>حجم الفرشاة<input type="range" min="2" max="18" step="1" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} /></label>
              <div className="story-color-row">
                {COLORS.map((c) => (
                  <button key={c} className="story-color-dot" style={{ background: c }} onClick={() => { setBrushColor(c); setTextColor(c); }} />
                ))}
              </div>
              {selectedLayer ? (
                <>
                  <label>Scale<input type="range" min="0.4" max="3" step="0.01" value={selectedLayer.scale} onChange={(e) => updateSelected({ scale: Number(e.target.value) })} /></label>
                  <label>Rotate<input type="range" min="-180" max="180" step="1" value={selectedLayer.rotation} onChange={(e) => updateSelected({ rotation: Number(e.target.value) })} /></label>
                </>
              ) : null}
            </aside>
          </div>
        )}

        {type === "IMAGE" && (
          <div className="story-editor-bottombar">
            <input value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="اكتب نصًا..." maxLength={140} />
            <select value={textStyle} onChange={(e) => setTextStyle(e.target.value as any)}>
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="highlight">Highlight</option>
              <option value="capsule">Capsule</option>
              <option value="typewriter">Typewriter</option>
            </select>
            <select value={textAlign} onChange={(e) => setTextAlign(e.target.value as any)}>
              <option value="left">يسار</option>
              <option value="center">وسط</option>
              <option value="right">يمين</option>
            </select>
            <button onClick={() => { if (!textInput.trim()) return; setTool("text"); setWaitingTextDrop(true); }}>ضع النص بالضغط على الصورة</button>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption اختياري" maxLength={180} />
          </div>
        )}

        {type !== "IMAGE" && (
          <div className="story-editor-bottombar">
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption اختياري" maxLength={180} />
          </div>
        )}
      </div>
    </div>
  );
}
