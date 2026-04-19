"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Layer = {
  type: "bg" | "char";
  image_url: string;
  role?: "shadow";
};

type EpisodeSummary = {
  id: string;
  title_ja: string;
  title_en: string | null;
  description_ja: string | null;
  description_en: string | null;
  access_tier?: "free" | "premium" | "members_only";
  required_membership?: string | null;
  premium_unlock_note_ja?: string | null;
  premium_unlock_note_en?: string | null;
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
  episodes?: EpisodeSummary[];
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

const controlBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 6,
  padding: "4px 12px",
  color: "rgba(255,255,255,0.85)",
  fontSize: 11,
  letterSpacing: 1,
  cursor: "pointer",
  fontFamily: "'SoukouMincho', serif",
};

const settingsLabel: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
  color: "#e0e0e0",
  marginBottom: 6,
  fontFamily: "'SoukouMincho', serif",
  letterSpacing: 1,
};

const settingsValue: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.55)",
};

const segBtnStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 6,
  padding: "6px 0",
  color: "rgba(255,255,255,0.85)",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "'SoukouMincho', serif",
};

function IconButton({
  onClick,
  title,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
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
        cursor: "pointer",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

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

export default function NovelIdleScreen({ layers, locale, dict, storyHref, speakerName, episodes = [] }: Props) {
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

  // UI preferences (persisted)
  const [muted, setMuted] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [textSpeed, setTextSpeed] = useState<0.5 | 1 | 2>(1);
  const [fontSize, setFontSize] = useState(16);
  const [volume, setVolume] = useState(1);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // UI modals
  const [showBacklog, setShowBacklog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Navigation fade-out overlay
  const [isNavigating, setIsNavigating] = useState(false);

  // Backlog — all displayed lines
  const [backlog, setBacklog] = useState<Array<{ speaker: string; text: string; expr: string }>>([]);

  // Load preferences once
  useEffect(() => {
    try {
      const m = localStorage.getItem("creepyhub_novel_muted");
      const a = localStorage.getItem("creepyhub_novel_autoplay");
      const s = localStorage.getItem("creepyhub_novel_textspeed");
      const f = localStorage.getItem("creepyhub_novel_fontsize");
      const v = localStorage.getItem("creepyhub_novel_volume");
      if (m !== null) setMuted(m === "1");
      if (a !== null) setAutoPlay(a === "1");
      if (s !== null) {
        const n = Number(s);
        if (n === 0.5 || n === 1 || n === 2) setTextSpeed(n);
      }
      if (f !== null) {
        const n = Number(f);
        if (!Number.isNaN(n) && n >= 12 && n <= 22) setFontSize(n);
      }
      if (v !== null) {
        const n = Number(v);
        if (!Number.isNaN(n) && n >= 0 && n <= 1) setVolume(n);
      }
    } catch {}
    setPrefsLoaded(true);
  }, []);

  // Persist preferences
  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem("creepyhub_novel_muted", muted ? "1" : "0");
      localStorage.setItem("creepyhub_novel_autoplay", autoPlay ? "1" : "0");
      localStorage.setItem("creepyhub_novel_textspeed", String(textSpeed));
      localStorage.setItem("creepyhub_novel_fontsize", String(fontSize));
      localStorage.setItem("creepyhub_novel_volume", String(volume));
    } catch {}
  }, [muted, autoPlay, textSpeed, fontSize, volume, prefsLoaded]);

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

  // Typewriter — sets expression, respects textSpeed, and records backlog
  const textSpeedRef = useRef(textSpeed);
  useEffect(() => {
    textSpeedRef.current = textSpeed;
  }, [textSpeed]);

  const startTypewriter = useCallback((line: Line) => {
    setCurrentExpr(line.expr);
    setIsTyping(true);
    setDisplayedText("");
    setBacklog((prev) => [...prev, { speaker: speakerName ?? "", text: line.text, expr: line.expr }]);
    let i = 0;
    let frame = 0;
    const tick = () => {
      const speed = textSpeedRef.current;
      frame++;
      // 0.5x: advance every 2 frames; 1x: every frame; 2x: 2 chars per frame
      if (speed === 0.5 && frame % 2 !== 0) {
        requestAnimationFrame(tick);
        return;
      }
      const step = speed === 2 ? 2 : 1;
      i = Math.min(i + step, line.text.length);
      setDisplayedText(line.text.slice(0, i));
      if (i < line.text.length) {
        requestAnimationFrame(tick);
      } else {
        setIsTyping(false);
      }
    };
    requestAnimationFrame(tick);
  }, [speakerName]);

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

  // Auto-advance for script/branch when autoPlay is enabled
  useEffect(() => {
    if (!autoPlay) return;
    if (isTyping) return;
    if (!(phase === "script" || phase === "branch")) return;
    if (displayedText.length === 0) return;
    const timer = setTimeout(() => {
      handleTapRef.current?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [autoPlay, isTyping, phase, displayedText]);

  // ESC closes modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSettings) setShowSettings(false);
        else if (showBacklog) setShowBacklog(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSettings, showBacklog]);

  const startScript = (topic: ScriptTopic) => {
    setActiveScript(topic);
    setScriptIndex(0);
    setPhase("script");
    startTypewriter(topic.lines[0]);
  };

  const handleTapRef = useRef<(() => void) | null>(null);

  const handleTap = () => {
    // Don't advance while any modal is open
    if (showBacklog || showSettings) return;
    if (phase === "greeting" && isTyping) {
      setDisplayedText(greeting.text);
      setIsTyping(false);
    } else if (phase === "greeting") {
      setPhase("idle");
    } else if (phase === "idle") {
      // When episodes are available, tapping the body should NOT auto-start —
      // the user needs to pick an episode from the list.
      if (storyHref && episodes.length === 0) {
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
    } else if (phase === "tap") {
      setPhase("idle");
    } else if (phase === "script" && activeScript) {
      if (isTyping) {
        setDisplayedText(activeScript.lines[scriptIndex].text);
        setIsTyping(false);
      } else if (scriptIndex < activeScript.lines.length - 1) {
        const next = scriptIndex + 1;
        setScriptIndex(next);
        startTypewriter(activeScript.lines[next]);
      } else if (activeScript.choices && activeScript.choices.length > 0) {
        setCurrentExpr(EXPR.normal);
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

  // Keep latest handleTap in ref for use in effects
  handleTapRef.current = handleTap;

  // Navigate to episode with fade-out transition
  const goToEpisode = useCallback(
    (episodeId: string) => {
      if (isNavigating) return;
      setIsNavigating(true);
      // Wait for fade-to-black (600ms) before navigation so the jump is not abrupt
      setTimeout(() => {
        window.location.href = `/${locale}/novel/${episodeId}`;
      }, 600);
    },
    [isNavigating, locale]
  );

  // Skip — complete current typing instantly (only relevant during isTyping)
  const skipTyping = () => {
    if (!isTyping) return;
    if (phase === "greeting") {
      setDisplayedText(greeting.text);
      setIsTyping(false);
    } else if (phase === "tap") {
      setDisplayedText(tapLines[lastTapLineRef.current].text);
      setIsTyping(false);
    } else if (phase === "script" && activeScript) {
      setDisplayedText(activeScript.lines[scriptIndex].text);
      setIsTyping(false);
    } else if (phase === "branch" && activeBranch) {
      setDisplayedText(activeBranch.lines[branchIndex].text);
      setIsTyping(false);
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
          const isMainChar = layer.type === "char" && layer.role !== "shadow";
          // Only show expression while the text box is visible; otherwise normal
          const isTextVisible =
            (phase === "greeting" || phase === "tap" || phase === "script" || phase === "branch");
          const displayExpr = isTextVisible ? currentExpr : EXPR.normal;
          const src = isMainChar ? displayExpr : layer.image_url;
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

      {/* Top-right control icons */}
      {phase !== "loading" && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            gap: 8,
            zIndex: layers.length + 10,
            animation: "novel-fade-in 0.5s ease",
          }}
        >
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            title={muted ? "音声ON" : "音声OFF"}
          >
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setShowBacklog(true);
            }}
            title="履歴"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(true);
            }}
            title="設定"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </IconButton>
        </div>
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
              fontSize: fontSize,
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
          {/* Skip / Auto controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 8,
            }}
          >
            {isTyping && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skipTyping();
                }}
                style={controlBtnStyle}
              >
                &gt;&gt; SKIP
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAutoPlay((a) => !a);
              }}
              style={{
                ...controlBtnStyle,
                background: autoPlay ? "rgba(198,40,40,0.7)" : controlBtnStyle.background,
                borderColor: autoPlay ? "rgba(255,100,100,0.6)" : controlBtnStyle.borderColor,
              }}
            >
              {autoPlay ? "■ AUTO" : "▶ AUTO"}
            </button>
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

      {/* Idle: episode list + topic buttons */}
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
            maxHeight: "70vh",
            overflowY: "auto",
            padding: "0 16px",
          }}
        >
          {/* Episode list (new) */}
          {episodes.length > 0 && (
            <>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "'SoukouMincho', serif",
                  margin: "0 0 4px",
                  textTransform: "uppercase",
                }}
              >
                Episodes
              </p>
              {episodes.map((ep) => {
                const title = locale === "en" && ep.title_en ? ep.title_en : ep.title_ja;
                const desc = locale === "en" && ep.description_en ? ep.description_en : ep.description_ja;
                const isPremium = ep.access_tier === "premium" || ep.access_tier === "members_only";
                return (
                  <button
                    key={ep.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToEpisode(ep.id);
                    }}
                    style={{
                      width: "100%",
                      maxWidth: 360,
                      background: isPremium ? "rgba(40,15,25,0.82)" : "rgba(10,5,8,0.78)",
                      border: isPremium
                        ? "1px solid rgba(255, 200, 80, 0.55)"
                        : "1px solid rgba(var(--accent-rgb, 200,40,50), 0.45)",
                      borderRadius: 8,
                      padding: "12px 18px",
                      color: "rgba(255,255,255,0.92)",
                      fontSize: 15,
                      fontFamily: "'SoukouMincho', serif",
                      letterSpacing: 1,
                      cursor: "pointer",
                      backdropFilter: "blur(6px)",
                      WebkitBackdropFilter: "blur(6px)",
                      transition: "all 0.2s ease",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      position: "relative",
                    }}
                  >
                    {isPremium && (
                      <span
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 10,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 10,
                          letterSpacing: 1,
                          color: "rgba(255, 210, 130, 0.95)",
                          background: "rgba(60, 30, 10, 0.8)",
                          border: "1px solid rgba(255, 200, 80, 0.5)",
                          borderRadius: 4,
                          padding: "2px 6px",
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="4" y="11" width="16" height="10" rx="2" />
                          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                        </svg>
                        {locale === "en" ? "MEMBERS" : "限定"}
                      </span>
                    )}
                    <span style={{ fontWeight: 700, letterSpacing: 2 }}>{title}</span>
                    {desc && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.55)",
                          letterSpacing: 0.5,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {desc}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          )}

          {/* Existing scripted topics (dialogue branches) */}
          {scriptTopics.length > 0 && (
            <>
              {episodes.length > 0 && (
                <p
                  style={{
                    fontSize: 10,
                    letterSpacing: 3,
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "'SoukouMincho', serif",
                    margin: "8px 0 4px",
                    textTransform: "uppercase",
                  }}
                >
                  Talk
                </p>
              )}
              {scriptTopics.map((topic, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    startScript(topic);
                  }}
                  style={{
                    width: "100%",
                    maxWidth: 360,
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
            </>
          )}
          {storyHref && episodes.length === 0 && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'SoukouMincho', serif", letterSpacing: 2, marginTop: 4 }}>
              {dict.tapToContinue ?? "タップで始める"}
            </p>
          )}
        </div>
      )}

      {/* Navigation fade-out overlay */}
      {isNavigating && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#000",
            zIndex: 99999,
            opacity: 0,
            animation: "novel-fade-to-black 0.6s forwards ease-out",
            pointerEvents: "all",
          }}
        />
      )}

      {/* Backlog modal */}
      {showBacklog && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowBacklog(false);
          }}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: layers.length + 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "novel-fade-in 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 480,
              maxHeight: "80vh",
              background: "rgba(10,5,8,0.95)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: "20px 20px 16px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#e0e0e0", fontSize: 16, fontFamily: "'SoukouMincho', serif", letterSpacing: 2 }}>
                履歴
              </h3>
              <button
                onClick={() => setShowBacklog(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 0,
                  width: 28,
                  height: 28,
                }}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4 }}>
              {backlog.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
                  まだセリフがありません
                </p>
              ) : (
                backlog.map((entry, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {entry.speaker && (
                      <div style={{ fontSize: 11, color: "var(--accent, #c62828)", fontWeight: 700, marginBottom: 2, letterSpacing: 1 }}>
                        {entry.speaker}
                      </div>
                    )}
                    <div style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.7, fontFamily: "'SoukouMincho', serif" }}>
                      {entry.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings(false);
          }}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: layers.length + 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "novel-fade-in 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 380,
              background: "rgba(10,5,8,0.95)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: "20px 20px 16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: "#e0e0e0", fontSize: 16, fontFamily: "'SoukouMincho', serif", letterSpacing: 2 }}>
                設定
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 0,
                  width: 28,
                  height: 28,
                }}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            {/* Text speed */}
            <div style={{ marginBottom: 16 }}>
              <label style={settingsLabel}>
                テキスト速度
                <span style={settingsValue}>
                  {textSpeed === 0.5 ? "遅い" : textSpeed === 2 ? "速い" : "標準"}
                </span>
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setTextSpeed(s as 0.5 | 1 | 2)}
                    style={{
                      ...segBtnStyle,
                      background: textSpeed === s ? "rgba(198,40,40,0.7)" : segBtnStyle.background,
                      borderColor: textSpeed === s ? "rgba(255,100,100,0.6)" : segBtnStyle.borderColor,
                    }}
                  >
                    {s === 0.5 ? "遅" : s === 2 ? "速" : "中"}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div style={{ marginBottom: 16 }}>
              <label style={settingsLabel}>
                フォントサイズ
                <span style={settingsValue}>{fontSize}px</span>
              </label>
              <input
                type="range"
                min={12}
                max={22}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Volume */}
            <div style={{ marginBottom: 8 }}>
              <label style={settingsLabel}>
                音量
                <span style={settingsValue}>{Math.round(volume * 100)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                style={{ width: "100%" }}
                disabled={muted}
              />
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                {muted ? "ミュート中" : "※ 音声機能は今後追加予定"}
              </p>
            </div>
          </div>
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
        @keyframes novel-fade-to-black {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
