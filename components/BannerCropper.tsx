"use client";

import { useRef, useState } from "react";

type Props = {
  imageSrc: string;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
};

const CROP_WIDTH = 380;
const CROP_HEIGHT = 127;
const VIEW_WIDTH = 420;
const VIEW_HEIGHT = 300;
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 400;

export default function BannerCropper({ imageSrc, onCrop, onCancel }: Props) {
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
    const dw = img.width || img.naturalWidth;
    const dh = img.height || img.naturalHeight;
    if (dw <= 0 || dh <= 0) return;
    setDisplaySize({ w: dw, h: dh });
    // baseScale fits the image so the crop area is fully covered
    const scaleW = CROP_WIDTH / dw;
    const scaleH = CROP_HEIGHT / dh;
    setBaseScale(Math.max(scaleW, scaleH));
  };

  const handleImgRef = (el: HTMLImageElement | null) => {
    if (!el) return;
    imgRef.current = el;
    if (el.complete && el.naturalWidth > 0) initImage(el);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    initImage(e.currentTarget);
  };

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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => {
      const next = prev * (e.deltaY < 0 ? 1.08 : 0.92);
      return Math.max(0.5, Math.min(next, 5));
    });
  };

  const handleApply = () => {
    const img = imgRef.current;
    if (!img || !ready) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Rectangular clip with rounded corners
    const r = 8 * (OUTPUT_WIDTH / CROP_WIDTH);
    ctx.beginPath();
    ctx.roundRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT, r);
    ctx.clip();

    const totalScale = baseScale * zoom;
    const dw = displaySize.w * totalScale;
    const dh = displaySize.h * totalScale;
    const cx = VIEW_WIDTH / 2 + offset.x;
    const cy = VIEW_HEIGHT / 2 + offset.y;
    const cropLeft = (VIEW_WIDTH - CROP_WIDTH) / 2;
    const cropTop = (VIEW_HEIGHT - CROP_HEIGHT) / 2;

    const ratioX = OUTPUT_WIDTH / CROP_WIDTH;
    const ratioY = OUTPUT_HEIGHT / CROP_HEIGHT;
    const dx = (cx - dw / 2 - cropLeft) * ratioX;
    const dy = (cy - dh / 2 - cropTop) * ratioY;

    ctx.drawImage(img, dx, dy, dw * ratioX, dh * ratioY);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCrop(new File([blob], "banner.webp", { type: "image/webp" }));
      },
      "image/webp",
      0.9
    );
  };

  const totalScale = baseScale * zoom;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#f5f1eb" }}>
            Adjust Banner
          </h3>
          <button onClick={onCancel} style={closeBtnStyle}>✕</button>
        </div>

        <div
          style={{
            position: "relative",
            width: VIEW_WIDTH,
            height: VIEW_HEIGHT,
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

          {/* Dark overlay with rectangular cutout */}
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
                width: CROP_WIDTH,
                height: CROP_HEIGHT,
                transform: "translate(-50%, -50%)",
                borderRadius: 8,
                boxShadow: "0 0 0 9999px rgba(5, 2, 4, 0.7)",
                border: "2px solid rgba(196, 144, 144, 0.5)",
              }}
            />
          </div>
        </div>

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
  maxWidth: 460,
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
