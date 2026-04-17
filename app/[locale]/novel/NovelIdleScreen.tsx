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
  storyHref?: string;
  speakerName?: string;
};

const CHAR_BASE = "/images/novel/char";
const EXPR = {
  normal: `${CHAR_BASE}/eiko_normal.png`,
  talk1: `${CHAR_BASE}/eiko_talk_1.png`,
  talk2: `${CHAR_BASE}/eiko_talk_2.png`,
  talkConfuse1: `${CHAR_BASE}/eiko_talk_confuse_1.png`,
  talkConfuse2: `${CHAR_BASE}/eiko_talk_confuse_2.png`,
  talkEyeclose1: `${CHAR_BASE}/eiko_talk_eyeclose_1.png`,
  talkEyeclose2: `${CHAR_BASE}/eiko_talk_eyeclose_2.png`,
  talkEyecloseConfuse1: `${CHAR_BASE}/eiko_talk_eyeclose_confuse_1.png`,
  talkEyecloseConfuse2: `${CHAR_BASE}/eiko_talk_eyeclose_confuse_2.png`,
  smile1: `${CHAR_BASE}/eiko_smile_1.png`,
  smile2: `${CHAR_BASE}/eiko_smile_2.png`,
  smile3: `${CHAR_BASE}/eiko_smile_3.png`,
  smileConfuse1: `${CHAR_BASE}/eiko_smile_confuse_1.png`,
  smileEyeclose1: `${CHAR_BASE}/eiko_smile_eyeclose_1.png`,
  smileEyeclose2: `${CHAR_BASE}/eiko_smile_eyeclose_2.png`,
  smileEyeclose3: `${CHAR_BASE}/eiko_smile_eyeclose_3.png`,
  smileEyecloseConfuse1: `${CHAR_BASE}/eiko_smile_eyeclose_confuse_1.png`,
  smileEyecloseConfuse2: `${CHAR_BASE}/eiko_smile_eyeclose_confuse_2.png`,
  smileEyecloseConfuse3: `${CHAR_BASE}/eiko_smile_eyeclose_confuse_3.png`,
  normalEyecloseConfuse1: `${CHAR_BASE}/eiko_normal_eyeclose_confuse_1.png`,
} as const;

type Line = { text: string; expr: string };

const greetings: Line[] = [
  { text: "……いらっしゃい。", expr: EXPR.talk1 },
  { text: "今日も来てくれたんだ。", expr: EXPR.smile1 },
  { text: "……何か、怖い話でも聞きたいの？", expr: EXPR.talkConfuse1 },
  { text: "ふぅん……暇なの？", expr: EXPR.smile2 },
  { text: "あら、また会ったわね。", expr: EXPR.smile1 },
  { text: "……静かな夜ね。", expr: EXPR.talkEyeclose1 },
  { text: "怖い話、聞かせてあげようか。", expr: EXPR.smile3 },
  { text: "ここに座って。……話があるの。", expr: EXPR.talk2 },
  { text: "……こんばんは。", expr: EXPR.talk1 },
  { text: "今夜は、どんな話がいい？", expr: EXPR.smile1 },
];

const tapLines: Line[] = [
  { text: "……なに？", expr: EXPR.talkConfuse1 },
  { text: "触らないで。", expr: EXPR.talk2 },
  { text: "……用があるの？", expr: EXPR.talkConfuse2 },
  { text: "ふぅん……。", expr: EXPR.talkEyeclose1 },
  { text: "そんなに見つめないで。", expr: EXPR.smileConfuse1 },
  { text: "……退屈？", expr: EXPR.smileEyeclose1 },
  { text: "私に何か聞きたいことでも？", expr: EXPR.smile1 },
  { text: "……べ、別に嬉しくないから。", expr: EXPR.smileEyecloseConfuse1 },
  { text: "静かにして……集中できない。", expr: EXPR.normalEyecloseConfuse1 },
  { text: "……もう。", expr: EXPR.smileEyecloseConfuse2 },
  { text: "なんでもない、って顔してる。", expr: EXPR.smile2 },
  { text: "話なら、いくらでもあるけど。", expr: EXPR.smile3 },
  { text: "……そろそろ、始めようか。", expr: EXPR.smile1 },
];

type ScriptChoice = {
  label: string;
  lines: Line[];
};

type ScriptTopic = {
  label: string;
  lines: Line[];
  choices?: ScriptChoice[];
};

const scriptTopics: ScriptTopic[] = [
  {
    label: "最近の投稿について",
    lines: [
      { text: "そういえば、最近このような投稿が増えたような気がするの", expr: EXPR.talk1 },
      { text: "えーと...そうこれ", expr: EXPR.talkEyecloseConfuse1 },
      { text: "tiktokホラーmovie", expr: EXPR.talk2 },
      { text: "縦画面の動画が中心となっているのだけれど、その中でも特に特徴的なのが『1982年』のテイストが用いられているということよ", expr: EXPR.talk1 },
      { text: "これの意味するところがどういうことか...わかるでしょう？", expr: EXPR.smile1 },
    ],
    choices: [
      {
        label: "レトロホラーの流行？",
        lines: [
          { text: "……そう、正解。よくわかったわね", expr: EXPR.smile2 },
          { text: "VHSのノイズや粗いフィルム感……あの時代特有の不気味さが、今の世代には新鮮に映るみたい", expr: EXPR.talk1 },
          { text: "でもね、それだけじゃないの。あの頃のホラーには……『説明しすぎない恐怖』があったのよ", expr: EXPR.talk2 },
          { text: "……今の投稿者たちも、それを本能的に理解しているのかもしれないわね", expr: EXPR.smileEyeclose1 },
        ],
      },
      {
        label: "よくわからない",
        lines: [
          { text: "……そう。まあ、無理もないわね", expr: EXPR.normalEyecloseConfuse1 },
          { text: "簡単に言うと、1982年頃のホラー映画の雰囲気……VHSの質感やフィルムの粗さを、わざと再現しているの", expr: EXPR.talk1 },
          { text: "なぜかって？　それはね……『本物の記録映像』に見せかけるため", expr: EXPR.talkEyeclose2 },
          { text: "作り物だとわかっていても、あのノイズが走った瞬間……背筋が凍るでしょう？", expr: EXPR.smile1 },
          { text: "……それが、この手法の狙いよ", expr: EXPR.smileEyeclose1 },
        ],
      },
    ],
  },
];

export default function NovelIdleScreen({ layers, locale, dict, storyHref, speakerName }: Props) {
  const [phase, setPhase] = useState<"loading" | "greeting" | "idle" | "tap" | "script" | "choice" | "branch">("loading");
  const [displayedText, setDisplayedText] = useState("");
  const [greeting] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);
  const [isTyping, setIsTyping] = useState(false);
  const lastTapLineRef = useRef(-1);
  const [activeScript, setActiveScript] = useState<ScriptTopic | null>(null);
  const [scriptIndex, setScriptIndex] = useState(0);
  const [activeBranch, setActiveBranch] = useState<ScriptChoice | null>(null);
  const [branchIndex, setBranchIndex] = useState(0);
  const [currentExpr, setCurrentExpr] = useState<string>(EXPR.normal);
  const [loadedCount, setLoadedCount] = useState(0);
  const transitionStarted = useRef(false);

  // Preload all images (layers + all expressions)
  const allImageUrls = [
    ...layers.map((l) => l.image_url),
    ...Object.values(EXPR),
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
  }, [layers]);

  // Transition from loading to greeting once all images loaded
  useEffect(() => {
    if (phase === "loading" && loadedCount >= totalImages && !transitionStarted.current) {
      transitionStarted.current = true;
      // Short delay for smooth transition
      const timer = setTimeout(() => setPhase("greeting"), 400);
      return () => clearTimeout(timer);
    }
  }, [phase, loadedCount, totalImages]);

  // Typewriter — shows line expression while speaking, reverts to normal when done
  const startTypewriter = useCallback((line: Line) => {
    setCurrentExpr(line.expr);
    setIsTyping(true);
    setDisplayedText("");
    let i = 0;
    const tick = () => {
      i++;
      setDisplayedText(line.text.slice(0, i));
      if (i < line.text.length) {
        requestAnimationFrame(tick);
      } else {
        setIsTyping(false);
        setCurrentExpr(EXPR.normal);
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
      const timer = setTimeout(() => {
        setCurrentExpr(EXPR.normal);
        setPhase("idle");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, isTyping, displayedText]);

  const startScript = (topic: ScriptTopic) => {
    setActiveScript(topic);
    setScriptIndex(0);
    setPhase("script");
    startTypewriter(topic.lines[0]);
  };

  const handleTap = () => {
    if (phase === "greeting" && isTyping) {
      setDisplayedText(greeting.text);
      setIsTyping(false);
      setCurrentExpr(EXPR.normal);
    } else if (phase === "greeting") {
      setPhase("idle");
    } else if (phase === "idle") {
      if (storyHref) {
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
      setDisplayedText(tapLines[lastTapLineRef.current].text);
      setIsTyping(false);
      setCurrentExpr(EXPR.normal);
    } else if (phase === "tap") {
      setPhase("idle");
    } else if (phase === "script" && activeScript) {
      if (isTyping) {
        setDisplayedText(activeScript.lines[scriptIndex].text);
        setIsTyping(false);
        setCurrentExpr(EXPR.normal);
      } else if (scriptIndex < activeScript.lines.length - 1) {
        const next = scriptIndex + 1;
        setScriptIndex(next);
        startTypewriter(activeScript.lines[next]);
      } else if (activeScript.choices && activeScript.choices.length > 0) {
        setPhase("choice");
      } else {
        setActiveScript(null);
        setScriptIndex(0);
        setCurrentExpr(EXPR.normal);
        setPhase("idle");
      }
    } else if (phase === "branch" && activeBranch) {
      if (isTyping) {
        setDisplayedText(activeBranch.lines[branchIndex].text);
        setIsTyping(false);
        setCurrentExpr(EXPR.normal);
      } else if (branchIndex < activeBranch.lines.length - 1) {
        const next = branchIndex + 1;
        setBranchIndex(next);
        startTypewriter(activeBranch.lines[next]);
      } else {
        setActiveScript(null);
        setActiveBranch(null);
        setScriptIndex(0);
        setBranchIndex(0);
        setCurrentExpr(EXPR.normal);
        setPhase("idle");
      }
    }
  };

  const selectChoice = (choice: ScriptChoice) => {
    setActiveBranch(choice);
    setBranchIndex(0);
    setPhase("branch");
    startTypewriter(choice.lines[0]);
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
          const isMainChar = layer.type === "char" && layer.role !== "shadow";
          // Main character always uses currentExpr (defaults to normal)
          const src = isMainChar ? currentExpr : layer.image_url;
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

      {/* Text box (greeting, tap, script & branch) */}
      {(phase === "greeting" || phase === "tap" || phase === "script" || phase === "branch") && (
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
          {speakerName && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--accent, #c62828)",
                marginBottom: 6,
                letterSpacing: 1,
              }}
            >
              {speakerName}
            </div>
          )}
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

      {/* Choice: branching options */}
      {phase === "choice" && activeScript?.choices && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "20px 16px 40px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.92))",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            zIndex: layers.length + 5,
            animation: "novel-fade-in 0.5s ease",
          }}
        >
          {activeScript.choices.map((choice, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                selectChoice(choice);
              }}
              style={{
                width: "100%",
                maxWidth: 320,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 8,
                padding: "12px 20px",
                color: "#e0e0e0",
                fontSize: 15,
                fontFamily: "'SoukouMincho', serif",
                letterSpacing: 1,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.2s ease, border-color 0.2s ease",
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

      {/* Idle: topic buttons + tap-to-start hint */}
      {phase === "idle" && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            zIndex: layers.length + 5,
            animation: "novel-fade-in 0.8s ease",
          }}
        >
          {scriptTopics.map((topic, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                startScript(topic);
              }}
              style={{
                background: "rgba(0,0,0,0.7)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8,
                padding: "10px 24px",
                color: "rgba(255,255,255,0.8)",
                fontSize: 14,
                fontFamily: "'SoukouMincho', serif",
                letterSpacing: 1,
                cursor: "pointer",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                transition: "background 0.2s ease, border-color 0.2s ease",
              }}
            >
              {topic.label}
            </button>
          ))}
          {storyHref && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'SoukouMincho', serif", letterSpacing: 2, marginTop: 4 }}>
              {dict.tapToContinue ?? "タップで始める"}
            </p>
          )}
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
