"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadStoryImage, uploadStoryVideo } from "@/lib/uploadStoryMedia";
import { validateVideoFile } from "@/lib/validateVideoFile";
import { validateImageFile } from "@/lib/validateImageFile";
import { getVideoDuration } from "@/lib/getVideoDuration";
import styles from "./StoryCreator.module.css";

type TextOverlay = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  scale: number;
  fontFamily: string;
  color: string;
  backgroundColor: string | null;
  rotation: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  stroke: string | null;
};

const FONT_OPTIONS = [
  { label: "明朝", value: "'Noto Serif JP', serif" },
  { label: "ゴシック", value: "'Noto Sans JP', sans-serif" },
  { label: "タイプライター", value: "monospace" },
  { label: "手書き風", value: "cursive" },
  { label: "Impact", value: "Impact, sans-serif" },
];

const COLOR_PRESETS = [
  "#FFFFFF",
  "#C82832",
  "#000000",
  "#8B0000",
  "#FFD700",
  "#6A5858",
  "#FF6B6B",
  "#4ECDC4",
  "#FF8C00",
  "#9B59B6",
  "#2ECC71",
];

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_VIDEO_DURATION_MS = 120000;

// 出力解像度 (9:16)
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;

type Props = {
  locale: string;
  embedded?: boolean;
};

export default function StoryCreator({ locale, embedded }: Props) {
  const router = useRouter();

  // Phase状態
  const [phase, setPhase] = useState<"upload" | "edit">("upload");

  // メディア
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>("");
  const [videoDurationMs, setVideoDurationMs] = useState<number>(0);

  // 画像位置調整
  const [adjustMode, setAdjustMode] = useState(false);
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [imgZoom, setImgZoom] = useState(1);
  const [imgBaseScale, setImgBaseScale] = useState(1);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  const [imgDragging, setImgDragging] = useState(false);
  const imgDragStart = useRef({ x: 0, y: 0 });
  const imgOffsetStart = useRef({ x: 0, y: 0 });
  const imgElRef = useRef<HTMLImageElement | null>(null);

  // テキストオーバーレイ
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // UI状態
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // テキストドラッグ用
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const selectedOverlay = overlays.find((o) => o.id === selectedId) ?? null;

  const imgInitialized = useRef(false);

  // ── 画像読み込み時に baseScale 計算 ──
  const handleImageLoaded = (img: HTMLImageElement) => {
    if (imgInitialized.current) return; // 無限ループ防止
    imgElRef.current = img;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (nw <= 0 || nh <= 0) return;
    imgInitialized.current = true;
    setImgNaturalSize({ w: nw, h: nh });

    // containerRef のサイズ取得
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    // "cover" — 短辺側がぴったり合うスケール
    const scaleW = cw / nw;
    const scaleH = ch / nh;
    setImgBaseScale(Math.max(scaleW, scaleH));
    setImgZoom(1);
    setImgOffset({ x: 0, y: 0 });
  };

  const handleImgRef = useCallback((el: HTMLImageElement | null) => {
    if (!el) return;
    imgElRef.current = el;
    if (el.complete && el.naturalWidth > 0) handleImageLoaded(el);
  }, []);

  // ── ファイル選択 ──
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    const isImage = IMAGE_TYPES.includes(file.type);
    const isVideo = VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      setError(
        locale === "en"
          ? "Unsupported file format (JPEG/PNG/WebP/GIF/MP4/WebM)"
          : "対応していないファイル形式です（JPEG/PNG/WebP/GIF/MP4/WebM）"
      );
      return;
    }

    try {
      if (isImage) {
        const valid = await validateImageFile(file);
        if (!valid) {
          setError(
            locale === "en"
              ? "File content does not match image format"
              : "ファイルの内容が画像形式と一致しません"
          );
          return;
        }
        setMediaType("image");
        setAdjustMode(true); // 画像は最初に位置調整モード
      } else {
        const valid = await validateVideoFile(file);
        if (!valid) {
          setError(
            locale === "en"
              ? "File content does not match video format"
              : "ファイルの内容が動画形式と一致しません"
          );
          return;
        }
        const duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_DURATION_MS) {
          setError(
            locale === "en"
              ? "Video must be under 2 minutes"
              : "動画は2分以内にしてください"
          );
          return;
        }
        setMediaType("video");
        setVideoDurationMs(duration);
        setAdjustMode(false);
      }

      setMediaFile(file);
      setMediaPreviewUrl(URL.createObjectURL(file));
      setPhase("edit");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ファイルの読み込みに失敗しました"
      );
    }
  };

  // ── 画像ドラッグ操作（位置調整モード） ──
  const handleImgPointerDown = (e: React.PointerEvent) => {
    if (!adjustMode || mediaType !== "image") return;
    e.preventDefault();
    e.stopPropagation();
    setImgDragging(true);
    imgDragStart.current = { x: e.clientX, y: e.clientY };
    imgOffsetStart.current = { ...imgOffset };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleImgPointerMove = (e: React.PointerEvent) => {
    if (!imgDragging) return;
    setImgOffset({
      x: imgOffsetStart.current.x + (e.clientX - imgDragStart.current.x),
      y: imgOffsetStart.current.y + (e.clientY - imgDragStart.current.y),
    });
  };

  const handleImgPointerUp = () => setImgDragging(false);

  // ── ホイールズーム（位置調整モード） ──
  const handleImgWheel = (e: React.WheelEvent) => {
    if (!adjustMode || mediaType !== "image") return;
    e.preventDefault();
    setImgZoom((prev) => {
      const next = prev * (e.deltaY < 0 ? 1.08 : 0.92);
      return Math.max(0.5, Math.min(next, 5));
    });
  };

  // ── Canvas crop (画像を9:16で切り出し) ──
  const cropImageToFile = (): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = imgElRef.current;
      if (!img) return reject(new Error("Image not loaded"));

      const container = containerRef.current;
      if (!container) return reject(new Error("Container not found"));

      const cw = container.clientWidth;
      const ch = container.clientHeight;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      const totalScale = imgBaseScale * imgZoom;
      const scaledW = imgNaturalSize.w * totalScale;
      const scaledH = imgNaturalSize.h * totalScale;

      // プレビュー空間での画像中心
      const imgCenterX = cw / 2 + imgOffset.x;
      const imgCenterY = ch / 2 + imgOffset.y;

      // プレビュー空間 → 出力空間 の変換比
      const ratioX = OUTPUT_WIDTH / cw;
      const ratioY = OUTPUT_HEIGHT / ch;

      // 出力空間での画像左上
      const dx = (imgCenterX - scaledW / 2) * ratioX;
      const dy = (imgCenterY - scaledH / 2) * ratioY;
      const dw = scaledW * ratioX;
      const dh = scaledH * ratioY;

      // 背景を黒に
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

      ctx.drawImage(img, dx, dy, dw, dh);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas toBlob failed"));
          resolve(
            new File([blob], "story-cropped.webp", { type: "image/webp" })
          );
        },
        "image/webp",
        0.92
      );
    });
  };

  // ── テキスト追加 ──
  const addOverlay = () => {
    if (adjustMode) setAdjustMode(false);
    setEditText("");
    setEditingId("__new__");
  };

  const confirmText = () => {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }

    if (editingId === "__new__") {
      const newOverlay: TextOverlay = {
        id: crypto.randomUUID(),
        text: editText.trim(),
        x: 50,
        y: 50,
        fontSize: 20,
        scale: 1,
        fontFamily: FONT_OPTIONS[0].value,
        color: "#FFFFFF",
        backgroundColor: null,
        rotation: 0,
        fontWeight: "normal",
        fontStyle: "normal",
        stroke: null,
      };
      setOverlays((prev) => [...prev, newOverlay]);
      setSelectedId(newOverlay.id);
    } else if (editingId) {
      setOverlays((prev) =>
        prev.map((o) =>
          o.id === editingId ? { ...o, text: editText.trim() } : o
        )
      );
    }
    setEditingId(null);
  };

  // ── テキストドラッグ操作 ──
  const handlePointerDown = (e: React.PointerEvent, overlayId: string) => {
    if (adjustMode) return; // 位置調整モード中はテキストドラッグ無効
    e.preventDefault();
    const overlay = overlays.find((o) => o.id === overlayId);
    if (!overlay) return;

    setSelectedId(overlayId);
    dragRef.current = {
      id: overlayId,
      startX: e.clientX,
      startY: e.clientY,
      origX: overlay.x,
      origY: overlay.y,
    };

    const handleMove = (ev: PointerEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX =
        ((ev.clientX - dragRef.current.startX) / rect.width) * 100;
      const deltaY =
        ((ev.clientY - dragRef.current.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, dragRef.current.origX + deltaX));
      const newY = Math.max(0, Math.min(100, dragRef.current.origY + deltaY));
      setOverlays((prev) =>
        prev.map((o) =>
          o.id === dragRef.current!.id ? { ...o, x: newX, y: newY } : o
        )
      );
    };

    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  // ── スタイル変更 ──
  const updateOverlay = useCallback(
    (id: string, patch: Partial<TextOverlay>) => {
      setOverlays((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
      );
    },
    []
  );

  const deleteOverlay = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ── 投稿 ──
  const handlePublish = async () => {
    if (!mediaFile) return;
    setError("");
    setUploading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        setError(
          locale === "en" ? "Login required" : "ログインが必要です"
        );
        setUploading(false);
        return;
      }

      const userId = session.user.id;
      const token = session.access_token;

      // メディアアップロード
      let mediaUrl: string;
      if (mediaType === "image") {
        // 画像は位置調整を反映してcanvas cropしてからアップロード
        const croppedFile = await cropImageToFile();
        mediaUrl = await uploadStoryImage(croppedFile, userId);
      } else {
        mediaUrl = await uploadStoryVideo(mediaFile, userId);
      }

      // APIでストーリー作成
      const body: Record<string, unknown> = {
        media_url: mediaUrl,
        media_type: mediaType,
        text_overlays: overlays.map(
          ({ id, scale, fontSize, ...rest }) => ({
            ...rest,
            fontSize: Math.round(fontSize * scale),
          })
        ),
      };
      if (mediaType === "video") {
        body.duration_ms = videoDurationMs;
      }

      const res = await fetch("/api/story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "ストーリーの投稿に失敗しました");
      }

      // ホームへ戻る
      router.push(`/${locale}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  // ── 画像の totalScale ──
  const imgTotalScale = imgBaseScale * imgZoom;

  // ── Phase 1: アップロード画面 ──
  if (phase === "upload") {
    return (
      <div className={styles.creator} style={embedded ? { minHeight: 0 } : undefined}>
        <div className={styles.topBar}>
          {!embedded ? (
            <button
              className={styles.backBtn}
              onClick={() => router.back()}
              type="button"
            >
              ← {locale === "en" ? "Back" : "戻る"}
            </button>
          ) : (
            <div style={{ width: 80 }} />
          )}
          <span className={styles.topTitle}>
            {locale === "en" ? "New Stream" : "ストリームを作成"}
          </span>
          <div style={{ width: 80 }} />
        </div>

        <div className={styles.uploadArea}>
          <div
            className={styles.uploadDropzone}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.uploadIcon}>📷</div>
            <p className={styles.uploadText}>
              {locale === "en"
                ? "Tap to select an image or video"
                : "タップして画像・動画を選択"}
            </p>
            <p className={styles.uploadHint}>
              {locale === "en"
                ? "Image: JPEG/PNG/WebP/GIF (5MB) | Video: MP4/WebM (2min, 50MB)"
                : "画像: JPEG/PNG/WebP/GIF (5MB) | 動画: MP4/WebM (2分以内, 50MB)"}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className={styles.hiddenInput}
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            onChange={handleFileSelect}
          />
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      </div>
    );
  }

  // ── Phase 2: エディター画面 ──
  return (
    <div className={styles.creator} style={embedded ? { minHeight: 0 } : undefined}>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => {
            setPhase("upload");
            setMediaFile(null);
            setMediaPreviewUrl("");
            setOverlays([]);
            setSelectedId(null);
            setAdjustMode(false);
            setImgOffset({ x: 0, y: 0 });
            setImgZoom(1);
            imgInitialized.current = false;
          }}
          type="button"
        >
          ← {locale === "en" ? "Back" : "戻る"}
        </button>
        <span className={styles.topTitle}>
          {locale === "en" ? "Edit Stream" : "ストリームを編集"}
        </span>
        <button
          className={styles.publishBtn}
          onClick={handlePublish}
          disabled={uploading}
          type="button"
        >
          {uploading
            ? locale === "en"
              ? "Posting..."
              : "投稿中..."
            : locale === "en"
            ? "Post"
            : "投稿する"}
        </button>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.editorArea}>
        {/* プレビュー + オーバーレイ */}
        <div
          ref={containerRef}
          className={`${styles.previewContainer} ${adjustMode ? styles.previewAdjustMode : ""}`}
          onClick={() => {
            if (!adjustMode) setSelectedId(null);
          }}
          onPointerDown={adjustMode ? handleImgPointerDown : undefined}
          onPointerMove={adjustMode ? handleImgPointerMove : undefined}
          onPointerUp={adjustMode ? handleImgPointerUp : undefined}
          onWheel={handleImgWheel}
        >
          {mediaType === "image" ? (
            <>
              <img
                ref={handleImgRef}
                src={mediaPreviewUrl}
                alt=""
                className={styles.previewImageAdjustable}
                draggable={false}
                onLoad={(e) => handleImageLoaded(e.currentTarget)}
                style={{
                  transform: `translate(-50%, -50%) translate(${imgOffset.x}px, ${imgOffset.y}px) scale(${imgTotalScale})`,
                  cursor: adjustMode
                    ? imgDragging
                      ? "grabbing"
                      : "grab"
                    : "default",
                }}
              />
              {/* 位置調整モードのヒント */}
              {adjustMode && (
                <div className={styles.adjustHint}>
                  {locale === "en"
                    ? "Drag to adjust position"
                    : "ドラッグで位置を調整"}
                </div>
              )}
            </>
          ) : (
            <video
              src={mediaPreviewUrl}
              className={styles.previewVideo}
              controls
              playsInline
              muted
            />
          )}

          {/* テキストオーバーレイ（位置調整モード中は半透明表示） */}
          {overlays.map((overlay) => (
            <div
              key={overlay.id}
              className={`${styles.overlayElement} ${selectedId === overlay.id ? styles.overlaySelected : ""} ${adjustMode ? styles.overlayDimmed : ""}`}
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                fontSize: `${overlay.fontSize}px`,
                fontFamily: overlay.fontFamily,
                color: overlay.color,
                backgroundColor: overlay.backgroundColor || "transparent",
                transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) scale(${overlay.scale})`,
                fontWeight: overlay.fontWeight,
                fontStyle: overlay.fontStyle,
                WebkitTextStroke: overlay.stroke
                  ? `1.5px ${overlay.stroke}`
                  : undefined,
                paintOrder: overlay.stroke ? "stroke fill" : undefined,
              }}
              onPointerDown={(e) => handlePointerDown(e, overlay.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (adjustMode) return;
                setEditText(overlay.text);
                setEditingId(overlay.id);
              }}
            >
              {overlay.text}
            </div>
          ))}

          {/* テキスト入力モーダル */}
          {editingId && (
            <div
              className={styles.textInputOverlay}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.textInputBox}>
                <textarea
                  className={styles.textInputField}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder={
                    locale === "en" ? "Enter text..." : "テキストを入力..."
                  }
                  maxLength={200}
                  autoFocus
                />
                <div className={styles.textInputActions}>
                  <button
                    className={styles.textInputCancel}
                    onClick={() => setEditingId(null)}
                    type="button"
                  >
                    {locale === "en" ? "Cancel" : "キャンセル"}
                  </button>
                  <button
                    className={styles.textInputOk}
                    onClick={confirmText}
                    type="button"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ローディング */}
          {uploading && (
            <div className={styles.loadingOverlay}>
              <span className={styles.loadingText}>
                {locale === "en" ? "Uploading..." : "アップロード中..."}
              </span>
            </div>
          )}
        </div>

        {/* ── ツールバー ── */}
        <div className={styles.toolbar}>
          {/* 画像位置調整トグル（画像のみ） */}
          {mediaType === "image" && (
            <>
              <button
                className={`${styles.toolBtn} ${adjustMode ? styles.toolBtnActive : ""}`}
                onClick={() => {
                  setAdjustMode((prev) => !prev);
                  setSelectedId(null);
                }}
                type="button"
              >
                📐{" "}
                {adjustMode
                  ? locale === "en"
                    ? "Done"
                    : "完了"
                  : locale === "en"
                  ? "Adjust Image"
                  : "画像を調整"}
              </button>
              <div className={styles.toolDivider} />
            </>
          )}

          <button
            className={styles.toolBtn}
            onClick={addOverlay}
            type="button"
          >
            {locale === "en" ? "+ Add Text" : "+ テキスト追加"}
          </button>
        </div>

        {/* ── 画像ズームスライダー（位置調整モード中） ── */}
        {adjustMode && mediaType === "image" && (
          <div className={styles.zoomRow}>
            <span className={styles.zoomLabel}>−</span>
            <input
              type="range"
              className={styles.zoomSlider}
              min={0.5}
              max={5}
              step={0.01}
              value={imgZoom}
              onChange={(e) => setImgZoom(Number(e.target.value))}
            />
            <span className={styles.zoomLabel}>+</span>
            <button
              className={styles.zoomResetBtn}
              onClick={() => {
                setImgZoom(1);
                setImgOffset({ x: 0, y: 0 });
              }}
              type="button"
            >
              {locale === "en" ? "Reset" : "リセット"}
            </button>
          </div>
        )}

        {/* ── 選択中オーバーレイのスタイルコントロール ── */}
        {selectedOverlay && !adjustMode && (
          <div className={styles.styleControls}>
            {/* フォント */}
            <span className={styles.styleLabel}>
              {locale === "en" ? "Font" : "フォント"}
            </span>
            <select
              className={styles.fontSelect}
              value={selectedOverlay.fontFamily}
              onChange={(e) =>
                updateOverlay(selectedOverlay.id, {
                  fontFamily: e.target.value,
                })
              }
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            <div className={styles.toolDivider} />

            {/* サイズ */}
            <span className={styles.styleLabel}>
              {locale === "en" ? "Size" : "サイズ"}
            </span>
            <input
              type="range"
              className={styles.sizeSlider}
              min={0.5}
              max={4}
              step={0.05}
              value={selectedOverlay.scale}
              onChange={(e) =>
                updateOverlay(selectedOverlay.id, {
                  scale: Number(e.target.value),
                })
              }
            />

            <div className={styles.toolDivider} />

            {/* カラー */}
            <div className={styles.colorRow}>
              {COLOR_PRESETS.map((c) => (
                <div
                  key={c}
                  className={`${styles.colorSwatch} ${selectedOverlay.color === c ? styles.colorSwatchActive : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() =>
                    updateOverlay(selectedOverlay.id, { color: c })
                  }
                />
              ))}
            </div>

            <div className={styles.toolDivider} />

            {/* 太字トグル */}
            <button
              className={`${styles.styleToggle} ${selectedOverlay.fontWeight === "bold" ? styles.styleToggleActive : ""}`}
              onClick={() =>
                updateOverlay(selectedOverlay.id, {
                  fontWeight:
                    selectedOverlay.fontWeight === "bold" ? "normal" : "bold",
                })
              }
              type="button"
              title={locale === "en" ? "Bold" : "太字"}
            >
              <strong>B</strong>
            </button>

            {/* 斜体トグル */}
            <button
              className={`${styles.styleToggle} ${selectedOverlay.fontStyle === "italic" ? styles.styleToggleActive : ""}`}
              onClick={() =>
                updateOverlay(selectedOverlay.id, {
                  fontStyle:
                    selectedOverlay.fontStyle === "italic" ? "normal" : "italic",
                })
              }
              type="button"
              title={locale === "en" ? "Italic" : "斜体"}
            >
              <em>I</em>
            </button>

            {/* 縁取りトグル */}
            <button
              className={`${styles.styleToggle} ${selectedOverlay.stroke ? styles.styleToggleActive : ""}`}
              onClick={() =>
                updateOverlay(selectedOverlay.id, {
                  stroke: selectedOverlay.stroke ? null : "#000000",
                })
              }
              type="button"
              title={locale === "en" ? "Stroke" : "縁取り"}
            >
              S
            </button>

            {/* 背景トグル */}
            <button
              className={`${styles.bgToggle} ${selectedOverlay.backgroundColor ? styles.bgToggleActive : ""}`}
              onClick={() =>
                updateOverlay(selectedOverlay.id, {
                  backgroundColor: selectedOverlay.backgroundColor
                    ? null
                    : "rgba(0,0,0,0.6)",
                })
              }
              type="button"
            >
              BG
            </button>

            {/* 削除 */}
            <button
              className={styles.deleteOverlayBtn}
              onClick={() => deleteOverlay(selectedOverlay.id)}
              type="button"
            >
              {locale === "en" ? "Delete" : "削除"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
