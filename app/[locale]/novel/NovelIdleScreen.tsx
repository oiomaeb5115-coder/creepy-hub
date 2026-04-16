"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Layer = {
  type: "bg" | "char";
  image_url: string;
  role?: "shadow";
};

type Props = {
  layers: Layer[];
  locale: string;
  dict: {
    title: string;
    subtitle: string;
    backToList: string;
    tapToContinue?: string;
  };
  speakingCharUrl?: string;
  storyHref?: string;
};

const greetings = [
  "……いらっしゃい。",
  "今日も来てくれたんだ。",
  "……何か、怖い話でも聞きたいの？",
  "ふぅん……暇なの？",
  "あら、また会ったわね。",
  "……静かな夜ね。",
  "怖い話、聞かせてあげようか。",
  "ここに座って。……話があるの。",
  "……こんばんは。",
  "今夜は、どんな話がいい？",
];

const tapLines = [
  "……なに？",
  "触らないで。",
  "……用があるの？",
  "ふぅん……。",
  "そんなに見つめないで。",
  "……退屈？",
  "私に何か聞きたいことでも？",
  "……べ、別に嬉しくないから。",
  "静かにして……集中できない。",
  "……もう。",
  "なんでもない、って顔してる。",
  "話なら、いくらでもあるけど。",
  "……そろそろ、始めようか。",
];

export default function NovelIdleScreen({ layers, locale, dict, speakingCharUrl, storyHref }: Props) {
  const [phase, setPhase] = useState<"loading" | "greeting" | "idle" | "tap">("loading");
  const [displayedText, setDisplayedText] = useState("");
  const [greeting] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);
  const [isTyping, setIsTyping] = useState(false);
  const lastTapLineRef = useRef(-1);
  const [loadedCount, setLoadedCount] = useState(0);
  const transitionStarted = useRef(false);

  // Preload all images (including speaking character)
  const allImageUrls = [
    ...layers.map((l) => l.image_url),
    ...(speakingCharUrl ? [speakingCharUrl] : []),
  ];
  const totalImages = allImageUrls.length;

  useEffect(() => {
    let count = 0;
    allImageUrls.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        count++;
        setLoadedCount(count);
      };
      img.src = url;
    });
  }, [layers, speakingCharUrl]);

  // Transition from loading to greeting once all images loaded
  useEffect(() => {
    if (phase === "loading" && loadedCount >= totalImages && !transitionStarted.current) {
      transitionStarted.current = true;
      // Short delay for smooth transition
      const timer = setTimeout(() => setPhase("greeting"), 400);
      return () => clearTimeout(timer);
    }
  }, [phase, loadedCount, totalImages]);

  // Typewriter
  const startTypewriter = useCallback((text: string) => {
    setIsTyping(true);
    setDisplayedText("");
    let i = 0;
    const tick = () => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i < text.length) {
        requestAnimationFrame(tick);
      } else {
        setIsTyping(false);
      }
    };
    requestAnimationFrame(tick);
  }, []);

  // Start greeting
  useEffect(() => {
    if (phase === "greeting") {
      const timer = setTimeout(() => startTypewriter(greeting), 600);
      return () => clearTimeout(timer);
    }
  }, [phase, greeting, startTypewriter]);

  // Greeting / tap → idle
  useEffect(() => {
    if ((phase === "greeting" || phase === "tap") && !isTyping && displayedText.length > 0) {
      const timer = setTimeout(() => setPhase("idle"), 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, isTyping, displayedText]);

  const handleTap = () => {
    if (phase === "greeting" && isTyping) {
      setDisplayedText(greeting);
      setIsTyping(false);
    } else if (phase === "greeting") {
      setPhase("idle");
    } else if (phase === "idle") {
      if (storyHref) {
        // Navigate to the story
        window.location.href = storyHref;
        return;
      }
      // No story available — show random tap line
      let idx: number;
      do {
        idx = Math.floor(Math.random() * tapLines.length);
      } while (idx === lastTapLineRef.current && tapLines.length > 1);
      lastTapLineRef.current = idx;
      setPhase("tap");
      startTypewriter(tapLines[idx]);
    } else if (phase === "tap" && isTyping) {
      // Skip typewriter on tap during tap phase
      setDisplayedText(tapLines[lastTapLineRef.current]);
      setIsTyping(false);
    } else if (phase === "tap") {
      setPhase("idle");
    }
  };

  return (
    <div
      onClick={handleTap}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        overflow: "hidden",
        cursor: phase === "loading" ? "default" : "pointer",
        touchAction: "manipulation",
      }}
    >
      {/* Loading screen with logo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 100,
          background: "#000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: phase === "loading" ? 1 : 0,
          transition: "opacity 0.8s ease",
          pointerEvents: phase === "loading" ? "auto" : "none",
        }}
      >
        <img
          src="/images/ui/auth-logo_2.webp"
          alt=""
          style={{
            width: 80,
            height: "auto",
            animation: "novel-logo-pulse 2s ease-in-out infinite",
          }}
        />
        <p
          style={{
            marginTop: 16,
            fontSize: 13,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "'SoukouMincho', serif",
            letterSpacing: 3,
          }}
        >
          {dict.title}
        </p>
      </div>

      {/* Layers (always rendered for preloading, fade in when ready) */}
      <div
        style={{
          opacity: phase !== "loading" ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      >
        {layers.map((layer, i) => {
          const isSpeaking = phase === "greeting" || phase === "tap";
          const isMainChar = layer.type === "char" && layer.role !== "shadow";
          const src = isMainChar && isSpeaking && speakingCharUrl
            ? speakingCharUrl
            : layer.image_url;
          return (
            <img
              key={i}
              src={src}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: i + 1,
                pointerEvents: "none",
              }}
            />
          );
        })}
      </div>

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.5) 100%)",
          zIndex: layers.length + 1,
          pointerEvents: "none",
          opacity: phase !== "loading" ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      />

      {/* Home button (icon) */}
      {phase !== "loading" && (
        <a
          href={`/${locale}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: layers.length + 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            background: "rgba(0,0,0,0.6)",
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            animation: "novel-fade-in 0.5s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </a>
      )}

      {/* Text box (greeting & tap) */}
      {(phase === "greeting" || phase === "tap") && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px 16px 32px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.92))",
            minHeight: "20%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            zIndex: layers.length + 5,
          }}
        >
          <div
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: "#e0e0e0",
              fontFamily: "'SoukouMincho', serif",
              whiteSpace: "pre-wrap",
              minHeight: 60,
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
        </div>
      )}

      {/* Tap to start hint (idle with story available) */}
      {phase === "idle" && storyHref && (
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: layers.length + 5,
            pointerEvents: "none",
            animation: "novel-fade-in 0.8s ease",
          }}
        >
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontFamily: "'SoukouMincho', serif", letterSpacing: 2 }}>
            {dict.tapToContinue ?? "タップで始める"}
          </p>
        </div>
      )}

      <style>{`
        @keyframes novel-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes novel-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes novel-logo-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
