"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Layer = {
  type: "bg" | "char";
  image_url: string;
  position?: "left" | "center" | "right";
};

type Scene = {
  id: string;
  scene_order: number;
  layers: Layer[];
  text_ja: string;
  text_en: string | null;
  speaker_name_ja: string | null;
  speaker_name_en: string | null;
  audio_url: string | null;
  transition_effect: "fade" | "cut" | "slide";
};

type NovelPlayerProps = {
  scenes: Scene[];
  locale: string;
  episodeTitle: string;
  backHref: string;
  dict: {
    tapToContinue: string;
    completed: string;
    backToList: string;
    premiumLockedTitle?: string;
    premiumLockedDesc?: string;
    unlockViaYoutube?: string;
    unlockViaApp?: string;
  };
  /**
   * プレビュー再生時の情報。シーン終端で「ここから先はメンバー限定」誘導を出す想定。
   * 未指定なら通常の完了画面。
   */
  lockedAtEnd?: {
    requiredMembership: string;
    unlockNote: string | null;
  };
};

// Auto-advance delay based on last punctuation in text
function pauseAfterMs(text: string): number {
  const last = text.trim().slice(-1);
  if (last === "。" || last === "、") return 1000;
  return 500;
}

export default function NovelPlayer({ scenes, locale, episodeTitle, backHref, dict, lockedAtEnd }: NovelPlayerProps) {
  // lockedAtEnd はプレビュー再生時のみ非null。
  // 現状は完了画面はそのまま、将来ここで誘導オーバーレイに差し替える。
  void lockedAtEnd;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [layerTransition, setLayerTransition] = useState(false);

  // Loading phase: preload all scene layer images before showing first scene
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const transitionStarted = useRef(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);

  const scene = scenes[currentIndex];

  // Gather unique image URLs across all scenes
  const allImageUrls = Array.from(
    new Set(
      scenes.flatMap((s) => (Array.isArray(s.layers) ? s.layers.map((l) => l.image_url) : []))
    )
  );
  const totalImages = allImageUrls.length;

  // Preload all layer images
  useEffect(() => {
    if (totalImages === 0) {
      setIsLoading(false);
      return;
    }
    let count = 0;
    allImageUrls.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        count++;
        setLoadedCount(count);
      };
      img.src = url;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fade out loading once images are ready
  useEffect(() => {
    if (isLoading && loadedCount >= totalImages && !transitionStarted.current) {
      transitionStarted.current = true;
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, loadedCount, totalImages]);

  const getText = useCallback(
    (s: Scene) => (locale === "en" && s.text_en ? s.text_en : s.text_ja),
    [locale]
  );

  const getSpeaker = useCallback(
    (s: Scene) => (locale === "en" && s.speaker_name_en ? s.speaker_name_en : s.speaker_name_ja),
    [locale]
  );

  const clearAutoTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    clearAutoTimer();
    if (currentIndex >= scenes.length - 1) {
      setIsCompleted(true);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      return;
    }
    setLayerTransition(true);
    setTimeout(() => setLayerTransition(false), 50);
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, scenes, clearAutoTimer]);

  // Schedule auto-advance when audio ends
  const handleAudioEnded = useCallback(() => {
    if (isCompleted || !scene) return;
    const ms = pauseAfterMs(getText(scene));
    clearAutoTimer();
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      advance();
    }, ms);
  }, [isCompleted, scene, getText, advance, clearAutoTimer]);

  // Tap: skip any pending auto-advance and move immediately
  const handleTap = useCallback(() => {
    if (isLoading) return;
    if (isCompleted) return;
    advance();
  }, [isLoading, isCompleted, advance]);

  // Play audio when scene changes (gated by loading phase)
  useEffect(() => {
    if (!scene) return;
    if (isLoading) return;
    clearAutoTimer();
    if (audioRef.current) {
      if (scene.audio_url) {
        audioRef.current.src = scene.audio_url;
        audioRef.current.play().catch(() => {
          // Autoplay blocked — fallback: schedule advance based on rough text duration
          const text = getText(scene);
          const ms = Math.max(2000, text.length * 120) + pauseAfterMs(text);
          autoAdvanceTimerRef.current = window.setTimeout(() => {
            autoAdvanceTimerRef.current = null;
            advance();
          }, ms);
        });
      } else {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        // No audio — fall back to timed advance (rough text-length based)
        const text = getText(scene);
        const ms = Math.max(2000, text.length * 120) + pauseAfterMs(text);
        autoAdvanceTimerRef.current = window.setTimeout(() => {
          autoAdvanceTimerRef.current = null;
          advance();
        }, ms);
      }
    }
    setLayerTransition(false);
  }, [currentIndex, scene, getText, isLoading, advance, clearAutoTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAutoTimer();
  }, [clearAutoTimer]);

  if (scenes.length === 0) return null;

  const layers: Layer[] = Array.isArray(scene.layers) ? scene.layers : [];
  const transitionStyle = scene.transition_effect === "cut" ? "none" : "opacity 0.5s ease";
  const text = scene ? getText(scene) : "";

  return (
    <div
      onClick={handleTap}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        cursor: "pointer",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "manipulation",
      }}
    >
      <audio ref={audioRef} preload="auto" onEnded={handleAudioEnded} />

      {/* Loading overlay — fades out when all layer images are ready */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 9000,
          background: "#000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: isLoading ? 1 : 0,
          transition: "opacity 0.6s ease",
          pointerEvents: isLoading ? "auto" : "none",
        }}
      >
        <img
          src="/images/ui/auth-logo_2.webp"
          alt=""
          style={{
            width: 72,
            height: "auto",
            animation: "novel-player-logo-pulse 1.6s ease-in-out infinite",
          }}
        />
        <p
          style={{
            marginTop: 14,
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            fontFamily: "'SoukouMincho', serif",
            letterSpacing: 3,
          }}
        >
          {totalImages > 0
            ? `LOADING ${Math.min(loadedCount, totalImages)} / ${totalImages}`
            : "LOADING"}
        </p>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255,255,255,0.15)",
          zIndex: 20,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((currentIndex + 1) / scenes.length) * 100}%`,
            background: "var(--accent, #c62828)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Home button (visible when completed) */}
      {isCompleted && (
        <a
          href={backHref}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 30,
            color: "#fff",
            textDecoration: "none",
            fontSize: 14,
            padding: "6px 14px",
            background: "rgba(0,0,0,0.6)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        >
          &larr; {dict.backToList}
        </a>
      )}

      {/* Scene counter */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 12,
          fontSize: 12,
          color: "rgba(255,255,255,0.5)",
          zIndex: 20,
        }}
      >
        {currentIndex + 1} / {scenes.length}
      </div>

      {/* Layers — rendered in array order (index 0 = back, last = front).
          Both bg and char are treated as full-screen cover images to match the
          NovelIdleScreen rendering (char portraits are pre-composed 9:16). */}
      {layers.map((layer, i) => (
        <img
          key={i}
          src={layer.image_url}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: i + 1,
            opacity: layerTransition ? 0 : 1,
            transition: transitionStyle,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Dark overlay for text readability (above all layers) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isCompleted
            ? "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.5) 100%)"
            : "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.65) 100%)",
          zIndex: layers.length + 1,
          pointerEvents: "none",
        }}
      />

      {/* Text box (center aligned, no typewriter) */}
      {!isCompleted && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "14px 20px 32px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.92))",
            minHeight: "25%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            zIndex: layers.length + 2,
          }}
        >
          {getSpeaker(scene) && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--accent, #c62828)",
                marginBottom: 8,
                letterSpacing: 1,
                textAlign: "center",
                width: "100%",
              }}
            >
              {getSpeaker(scene)}
            </div>
          )}

          <div
            key={currentIndex}
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: "#e0e0e0",
              fontFamily: "'SoukouMincho', serif",
              whiteSpace: "pre-wrap",
              minHeight: 80,
              textAlign: "center",
              width: "100%",
              maxWidth: 560,
              animation: "novel-text-fade-in 0.3s ease",
            }}
          >
            {text}
          </div>
        </div>
      )}

      {/* Completed: social-game-style home overlay */}
      {isCompleted && (
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: layers.length + 2,
            pointerEvents: "none",
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'SoukouMincho', serif",
              letterSpacing: 2,
            }}
          >
            {dict.completed}
          </p>
          <p
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.7)",
              fontFamily: "'SoukouMincho', serif",
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {episodeTitle}
          </p>
        </div>
      )}

      <style>{`
        @keyframes novel-text-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes novel-player-logo-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
