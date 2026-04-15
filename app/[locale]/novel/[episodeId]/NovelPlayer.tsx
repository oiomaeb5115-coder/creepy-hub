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
  };
};

function charPositionStyle(pos: string | undefined): React.CSSProperties {
  const p = pos ?? "center";
  return {
    left: p === "left" ? "5%" : p === "right" ? "auto" : "50%",
    right: p === "right" ? "5%" : "auto",
    transform: p === "center" ? "translateX(-50%)" : "none",
  };
}

export default function NovelPlayer({ scenes, locale, episodeTitle, backHref, dict }: NovelPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [layerTransition, setLayerTransition] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const typeTimerRef = useRef<number | null>(null);

  const scene = scenes[currentIndex];

  const getText = useCallback(
    (s: Scene) => (locale === "en" && s.text_en ? s.text_en : s.text_ja),
    [locale]
  );

  const getSpeaker = useCallback(
    (s: Scene) => (locale === "en" && s.speaker_name_en ? s.speaker_name_en : s.speaker_name_ja),
    [locale]
  );

  const startTypewriter = useCallback((text: string) => {
    if (typeTimerRef.current) cancelAnimationFrame(typeTimerRef.current);
    setIsTyping(true);
    setDisplayedText("");
    let i = 0;
    const tick = () => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i < text.length) {
        typeTimerRef.current = requestAnimationFrame(tick);
      } else {
        setIsTyping(false);
        typeTimerRef.current = null;
      }
    };
    typeTimerRef.current = requestAnimationFrame(tick);
  }, []);

  const revealAll = useCallback(() => {
    if (typeTimerRef.current) {
      cancelAnimationFrame(typeTimerRef.current);
      typeTimerRef.current = null;
    }
    if (scene) {
      setDisplayedText(getText(scene));
      setIsTyping(false);
    }
  }, [scene, getText]);

  const advance = useCallback(() => {
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
  }, [currentIndex, scenes]);

  const handleTap = useCallback(() => {
    if (isCompleted) return;
    if (isTyping) {
      revealAll();
    } else {
      advance();
    }
  }, [isTyping, isCompleted, revealAll, advance]);

  // Play audio and start typewriter when scene changes
  useEffect(() => {
    if (!scene) return;
    startTypewriter(getText(scene));
    if (audioRef.current) {
      if (scene.audio_url) {
        audioRef.current.src = scene.audio_url;
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
      }
    }
    setLayerTransition(false);
  }, [currentIndex, scene, getText, startTypewriter]);

  useEffect(() => {
    return () => {
      if (typeTimerRef.current) cancelAnimationFrame(typeTimerRef.current);
    };
  }, []);

  if (scenes.length === 0) return null;

  const layers: Layer[] = Array.isArray(scene.layers) ? scene.layers : [];
  const transitionStyle = scene.transition_effect === "cut" ? "none" : "opacity 0.5s ease";

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
      <audio ref={audioRef} preload="auto" />

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

      {/* Layers — rendered in array order (index 0 = back, last = front) */}
      {layers.map((layer, i) => {
        if (layer.type === "char") {
          return (
            <img
              key={i}
              src={layer.image_url}
              alt=""
              style={{
                position: "absolute",
                bottom: "28%",
                ...charPositionStyle(layer.position),
                maxHeight: "55%",
                maxWidth: "50%",
                objectFit: "contain",
                zIndex: i + 1,
                opacity: layerTransition ? 0 : 1,
                transition: transitionStyle,
                pointerEvents: "none",
                filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
              }}
            />
          );
        }
        // type === "bg"
        return (
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
        );
      })}

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

      {/* Text box (hidden when completed) */}
      {!isCompleted && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px 16px 32px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.92))",
            minHeight: "25%",
            display: "flex",
            flexDirection: "column",
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
                marginBottom: 6,
                letterSpacing: 1,
              }}
            >
              {getSpeaker(scene)}
            </div>
          )}

          <div
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: "#e0e0e0",
              fontFamily: "'SoukouMincho', serif",
              whiteSpace: "pre-wrap",
              minHeight: 80,
            }}
          >
            {displayedText}
            {isTyping && (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: "1em",
                  background: "#e0e0e0",
                  marginLeft: 2,
                  animation: "novel-cursor-blink 0.6s infinite",
                  verticalAlign: "text-bottom",
                }}
              />
            )}
          </div>

          {!isTyping && (
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.4)",
                textAlign: "center",
                marginTop: 8,
                animation: "novel-tap-pulse 1.5s infinite",
              }}
            >
              {dict.tapToContinue} &raquo;
            </div>
          )}
        </div>
      )}

      {/* Completed: socia-game-style home overlay */}
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
        @keyframes novel-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes novel-tap-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
