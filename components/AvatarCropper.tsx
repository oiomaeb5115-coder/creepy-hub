"use client";

import { useRef, useState } from "react";

type Props = {
  imageSrc: string;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
};

const CIRCLE_SIZE = 280;
const VIEW_SIZE = 400;
const OUTPUT_SIZE = 512;

export default function AvatarCropper({ imageSrc, onCrop, onCancel }: Props) {
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  const ready = displaySize.w > 0 && displaySize.h > 0;

  const initImage = (img: HTMLImageElement) => {
    if (displaySize.w > 0) return;
    imgRef.current = img;
    // Use the element's rendered size (respects EXIF orientation)
    const dw = img.width || img.naturalWidth;
    const dh = img.height || img.naturalHeight;
    if (dw <= 0 || dh <= 0) return;
    setDisplaySize({ w: dw, h: dh });
    // baseScale fits the shorter side to the circle
    setBaseScale(CIRCLE_SIZE / Math.min(dw, dh));
  };

  const handleImgRef = (el: HTMLImageElement | null) => {
    if (!el) return;
    imgRef.current = el;
    if (el.complete && el.naturalWidth > 0) initImage(el);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    initImage(e.currentTarget);
  };

  // Pointer drag
  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: offsetStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetStart.current.y + (e.clientY - dragStart.current.y),
    });
  };

  const handlePointerUp = () => setDragging(false);

  // Scroll zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => {
      const next = prev * (e.deltaY < 0 ? 1.08 : 0.92);
      return Math.max(0.5, Math.min(next, 5));
    });
  };

  // Crop via canvas (only on Apply)
  const handleApply = () => {
    const img = imgRef.current;
    if (!img || !ready) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const totalScale = baseScale * zoom;
    const dw = displaySize.w * totalScale;
    const dh = displaySize.h * totalScale;
    // Image center in view space
    const cx = VIEW_SIZE / 2 + offset.x;
    const cy = VIEW_SIZE / 2 + offset.y;
    // Crop circle in view space
    const cropLeft = (VIEW_SIZE - CIRCLE_SIZE) / 2;
    const cropTop = (VIEW_SIZE - CIRCLE_SIZE) / 2;

    const ratio = OUTPUT_SIZE / CIRCLE_SIZE;
    const dx = (cx - dw / 2 - cropLeft) * ratio;
    const dy = (cy - dh / 2 - cropTop) * ratio;

    ctx.drawImage(img, dx, dy, dw * ratio, dh * ratio);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCrop(new File([blob], "avatar.webp", { type: "image/webp" }));
      },
      "image/webp",
      0.9
    );
  };

  // The combined scale factor
  const totalScale = baseScale * zoom;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#f5f1eb" }}>
            Adjust Avatar
          </h3>
          <button onClick={onCancel} style={closeBtnStyle}>✕</button>
        </div>

        {/* Preview area */}
        <div
          style={{
            position: "relative",
            width: VIEW_SIZE,
            height: VIEW_SIZE,
            maxWidth: "100%",
            margin: "0 auto",
            overflow: "hidden",
            background: "#050204",
            cursor: dragging ? "grabbing" : "grab",
            touchAction: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
        >
          {/* The actual image — no explicit width/height, use transform only */}
          <img
            ref={handleImgRef}
            src={imageSrc}
            alt=""
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${totalScale})`,
              transformOrigin: "center center",
              pointerEvents: "none",
              userSelect: "none",
              maxWidth: "none",
            }}
          />

          {/* Dark overlay with circular cutout via box-shadow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: CIRCLE_SIZE,
                height: CIRCLE_SIZE,
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                boxShadow: "0 0 0 9999px rgba(5, 2, 4, 0.7)",
                border: "2px solid rgba(196, 144, 144, 0.5)",
              }}
            />
          </div>
        </div>

        {/* Zoom slider */}
        <div style={sliderRowStyle}>
          <span style={{ fontSize: 14, color: "#8a7870" }}>−</span>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#c49090" }}
          />
          <span style={{ fontSize: 14, color: "#8a7870" }}>+</span>
        </div>

        <div style={footerStyle}>
          <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleApply} style={applyBtnStyle}>Apply</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  background: "rgba(0,0,0,0.75)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: "#0e0507",
  border: "1px solid rgba(161,102,108,0.3)",
  borderRadius: 12,
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 20px",
  borderBottom: "1px solid rgba(161,102,108,0.18)",
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#8a7870",
  fontSize: 18,
  cursor: "pointer",
  padding: "4px 8px",
};

const sliderRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 24px",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  padding: "12px 20px",
  borderTop: "1px solid rgba(161,102,108,0.18)",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 20px",
  border: "1px solid rgba(161,102,108,0.3)",
  borderRadius: 999,
  background: "transparent",
  color: "#c8b8b0",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const applyBtnStyle: React.CSSProperties = {
  padding: "8px 24px",
  border: "none",
  borderRadius: 999,
  background: "rgba(163,60,70,0.9)",
  color: "#f5f1eb",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
