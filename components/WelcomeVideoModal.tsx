"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

function WelcomeVideoModalInner({ videoSrc }: { videoSrc: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setVisible(true);
    }
  }, [searchParams]);

  // autoPlay がブラウザにブロックされた場合、muted で再試行
  useEffect(() => {
    if (!visible || !videoRef.current) return;
    const video = videoRef.current;

    video.play().catch(() => {
      // 音声付き autoPlay がブロックされた → muted にして再試行
      video.muted = true;
      video.play().catch(() => {
        // それでも失敗した場合は何もしない（スキップボタンで閉じられる）
      });
    });
  }, [visible]);

  const handleClose = () => {
    setVisible(false);
    router.replace(pathname, { scroll: false });
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0, 0, 0, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        playsInline
        onEnded={handleClose}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
        }}
      />
      <button
        onClick={handleClose}
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          background: "rgba(255, 255, 255, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          color: "#fff",
          fontSize: 14,
          padding: "8px 20px",
          borderRadius: 4,
          cursor: "pointer",
          zIndex: 301,
          letterSpacing: "0.05em",
        }}
      >
        SKIP
      </button>
    </div>
  );
}

export default function WelcomeVideoModal({ videoSrc }: { videoSrc: string }) {
  return (
    <Suspense fallback={null}>
      <WelcomeVideoModalInner videoSrc={videoSrc} />
    </Suspense>
  );
}
