"use client";

import { useState, useEffect, useCallback } from "react";

type Layer = {
  type: "bg" | "char";
  image_url: string;
};

type Props = {
  layers: Layer[];
  locale: string;
  dict: {
    title: string;
    subtitle: string;
    backToList: string;
  };
};

/** キャラのランダムセリフ */
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

export default function NovelIdleScreen({ layers, locale, dict }: Props) {
  const [phase, setPhase] = useState<"greeting" | "idle">("greeting");
  const [displayedText, setDisplayedText] = useState("");
  const [greeting] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);
  const [isTyping, setIsTyping] = useState(false);

  // Typewriter effect
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

  // Start greeting on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      startTypewriter(greeting);
    }, 500);
    return () => clearTimeout(timer);
  }, [greeting, startTypewriter]);

  // Transition to idle after greeting finishes
  useEffect(() => {
    if (phase === "greeting" && !isTyping && displayedText === greeting) {
      const timer = setTimeout(() => {
        setPhase("idle");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, isTyping, displayedText, greeting]);

  const handleTap = () => {
    if (phase === "greeting" && isTyping) {
      // Skip typewriter
      setDisplayedText(greeting);
      setIsTyping(false);
    } else if (phase === "greeting") {
      // Skip wait, go to idle
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
        cursor: phase === "greeting" ? "pointer" : "default",
        touchAction: "manipulation",
      }}
    >
      {/* Layers */}
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
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.5) 100%)",
          zIndex: layers.length + 1,
          pointerEvents: "none",
        }}
      />

      {/* Home button */}
      <a
        href={`/${locale}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: layers.length + 10,
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

      {/* Greeting text box */}
      {phase === "greeting" && (
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
            transition: "opacity 0.5s ease",
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

      {/* Idle: title overlay at bottom */}
      {phase === "idle" && (
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
          <p
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.6)",
              fontFamily: "'SoukouMincho', serif",
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            {dict.title}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              marginTop: 4,
            }}
          >
            {dict.subtitle}
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
      `}</style>
    </div>
  );
}
