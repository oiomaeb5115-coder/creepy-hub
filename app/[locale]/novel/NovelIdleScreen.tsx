"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

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

type LineMedia = { src: string; alt?: string };
type Line = { text: string; expr: string; audio?: string; visual?: LineMedia; keepVisual?: boolean };
type OpeningLine = Line & { audio: string };

const AUDIO_BASE = "/audio/novel/opening";
const WHAT_DO_YOU_DO_AUDIO_BASE = "/audio/novel/what-do-you-do";
const INAKURO_CLUB_AUDIO_BASE = "/audio/novel/inakuro-club";
const NO_EXPLANATION_AUDIO_BASE = "/audio/novel/no-explanation";
const KUTISAKE_ONNA_AUDIO_BASE = "/audio/novel/kutisake-onna";
const NOVEL_BGM_AUDIO = "/audio/novel/bgm/mirror-hall.mp3";
const NOVEL_BGM_VOLUME = 0.08;
const NOVEL_BGM_FADE_MS = 5000;
const NOVEL_VOICE_VOLUME_MULTIPLIER = 2;
const DIALOGUE_AUDIO_PRELOAD_AHEAD = 4;
const OPENING_LINES: OpeningLine[] = [
  { text: "...ふふふ", expr: EXPR.smileEyeclose2, audio: `${AUDIO_BASE}/001.wav` },
  { text: "いらっしゃい。", expr: EXPR.smile1, audio: `${AUDIO_BASE}/002.wav` },
  { text: "いつも私のYoutubeチャンネルを見てくれてありがとう。", expr: EXPR.talk1, audio: `${AUDIO_BASE}/003.wav` },
  { text: "もし初めての方だったならごめんなさいね。", expr: EXPR.talkConfuse1, audio: `${AUDIO_BASE}/004.wav` },
  { text: "私の名前は四咲映子。", expr: EXPR.smile1, audio: `${AUDIO_BASE}/005.wav` },
  { text: "世界中のオカルト話を収集する活動を行っているの。", expr: EXPR.talk1, audio: `${AUDIO_BASE}/006.wav` },
  { text: "貴方が今入ったサイト、アプリなんかもその活動の一環で制作してもらったものよ。", expr: EXPR.talk2, audio: `${AUDIO_BASE}/007.wav` },
  { text: "まず初めに... 何から話しましょう。", expr: EXPR.talkEyeclose1, audio: `${AUDIO_BASE}/008.wav` },
  { text: "何でもいいわ。", expr: EXPR.smileConfuse1, audio: `${AUDIO_BASE}/009.wav` },
  { text: "この中から選んでね。", expr: EXPR.smile1, audio: `${AUDIO_BASE}/010.wav` },
];

const getLineAutoDelay = (text: string) => {
  const ellipsisMatches = text.match(/\.\.\.|…/g) ?? [];
  const withoutEllipsis = text.replace(/\.\.\.|…/g, "");
  const commaMatches = withoutEllipsis.match(/[、,]/g) ?? [];
  const periodMatches = withoutEllipsis.match(/[。！？!?]/g) ?? [];
  const pauseDelay =
    ellipsisMatches.length * 1500 +
    commaMatches.length * 500 +
    periodMatches.length * 1000;

  return Math.max(1500, text.length * 60 + pauseDelay);
};

const expressionGroups = {
  smile: [EXPR.smile1, EXPR.smile2, EXPR.smile3, EXPR.smileEyeclose1, EXPR.smileEyeclose2, EXPR.smileEyeclose3],
  confused: [
    EXPR.talkConfuse1,
    EXPR.talkConfuse2,
    EXPR.talkEyecloseConfuse1,
    EXPR.talkEyecloseConfuse2,
    EXPR.smileConfuse1,
    EXPR.smileEyecloseConfuse1,
    EXPR.smileEyecloseConfuse2,
    EXPR.smileEyecloseConfuse3,
    EXPR.normalEyecloseConfuse1,
  ],
  soft: [EXPR.talkEyeclose1, EXPR.talkEyeclose2, EXPR.smileEyeclose1, EXPR.smileEyeclose2, EXPR.smileEyeclose3],
  talk: [EXPR.talk1, EXPR.talk2, EXPR.talkEyeclose1, EXPR.talkEyeclose2],
} as const;

const expressionGroupValues = Object.values(expressionGroups).flat();
const isKnownExpression = (expr: string): expr is (typeof expressionGroupValues)[number] =>
  expressionGroupValues.includes(expr as (typeof expressionGroupValues)[number]) || expr === EXPR.normal;

const getMatchingExpressionGroup = (line: Line) => {
  const text = line.text;
  if (/[？?]/.test(text) || /かしら|でしょう|思わない|知っている|わかる|かな|かも|けれど|だけれど|ごめんなさい/.test(text)) {
    return expressionGroups.confused;
  }
  if (/ふふ|嬉|ありがとう|正解|いらっしゃい|選んでね|始めましょう|また会った/.test(text)) {
    return expressionGroups.smile;
  }
  if (/……|…|静か|正直|注意|もちろん|ただ|もっとも/.test(text)) {
    return expressionGroups.soft;
  }
  if (expressionGroups.smile.includes(line.expr as (typeof expressionGroups.smile)[number])) {
    return expressionGroups.smile;
  }
  if (expressionGroups.confused.includes(line.expr as (typeof expressionGroups.confused)[number])) {
    return expressionGroups.confused;
  }
  if (expressionGroups.soft.includes(line.expr as (typeof expressionGroups.soft)[number])) {
    return expressionGroups.soft;
  }
  return expressionGroups.talk;
};

const resolveLineExpression = (line: Line, previousExpr: string) => {
  const preferredExpr = isKnownExpression(line.expr) ? line.expr : EXPR.talk1;
  if (preferredExpr !== previousExpr) return preferredExpr;

  const group = getMatchingExpressionGroup(line);
  const currentIndex = group.indexOf(preferredExpr as never);
  if (currentIndex >= 0) return group[(currentIndex + 1) % group.length];

  return group.find((expr) => expr !== previousExpr) ?? EXPR.talk2;
};

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

type ScriptChoice = { label: string; lines: Line[] };
type ScriptTopic = { id?: string; label: string; lines: Line[]; choices?: ScriptChoice[] };
type OpeningChoice = { label: string; lines?: Line[]; skipExplanation?: boolean };
type AnalogEffect = "none" | "film" | "vhs" | "crt" | "max" | "fog" | "sepia" | "red" | "dream";

const kutisakeOnnaLines: Line[] = [
  { text: "私のチャンネルでは普段、それほどメジャーではないホラーコンテンツを中心に取り扱っているから、", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/001.wav` },
  { text: "何故今になってこんなにもベターな怪異を取り上げたのかなんて、そう思っているのでしょう?", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/002.wav` },
  { text: "…ふふ。", expr: EXPR.smile1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/003.wav` },
  { text: "今回私がお話ししたいのは、口裂け女の発生源についてよ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/004.wav` },
  { text: "まずは、口裂け女という怪異の概要について、簡単にお話ししましょう...", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/005.wav` },
  { text: "…知っての通り、口裂け女というのは、マスクで顔の下半分を隠した女が、道端で突然あなたを呼び止めて、こう問いかけてくる...", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/006.wav` },
  { text: "「私、綺麗?」", expr: EXPR.smile1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/007.wav` },
  { text: "あなたがもし「綺麗」と答えれば、女はマスクを外し、耳まで裂けた口を見せつけて、こう続けるわ。", expr: EXPR.smile1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/008.wav` },
  { text: "「…これでも?」", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/009.wav` },
  { text: "...あなたなら、知らないはずがないでしょう？", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/010.wav` },
  { text: "もし答え方を間違えたなら、あなたも同じように口を裂かれてしまう...といったものね。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/011.wav` },
  { text: "べっこう飴が好きだとか、ポマードと三回唱えれば退散するとか、そういった対処法もセットで伝わっているわね。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/012.wav` },
  { text: "実際、国際日本文化研究センターの「怪異・妖怪伝承データベース」にも、口裂け女に出会った時には「ポマード」と三回言うと消える、べっこう飴をあげると喜ぶ、という類の伝承例が記録されているわ。", expr: EXPR.smile1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/013.wav` },
  { text: "…けれど、これほど有名な怪異にもかかわらず、いつ、どこで、どうやって生まれたのか。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/014.wav` },
  { text: "その「最初の一歩」を正確に答えられる人は、案外少ないようなのよ。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/015.wav` },
  { text: "実際のところ、あなたはこの噂の発生源を知っている？", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/016.wav` },
  { text: "この噂が明確に全国に広まったとされているのは、1979年のこと。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/017.wav` },
  { text: "この年の春から夏にかけて、日本中の子どもたちの間で、この話は爆発的に流行したの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/018.wav` },
  { text: "地域によっては、集団下校や見回りが行われるほどの騒ぎになったとも言われているわ。", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/019.wav` },
  { text: "民俗学者の飯倉義之氏は、口裂け女の噂が半年ほどで岐阜から青森、鹿児島まで伝わったとし、その背景には塾通いの増加、電話、新聞、テレビなどのメディアが関係していたと説明しているの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/020.wav` },
  { text: "つまり、ひとつの怪異が、ほんの数ヶ月で日本列島の端から端まで伝播した...ということよ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/021.wav` },
  { text: "SNSもインターネットも無い時代にね。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/022.wav` },
  { text: "...インターネットが普及していなかった時代でも、例えば「ポケモンのミュウ」なんかは小学生やゲーマーの大人による口コミで広範囲にわたって知れ渡ったとされているけれど、それはあくまでも「コレクション精神を刺激する明確な報酬」があってのものよ。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/023.wav` },
  { text: "言い方が少し悪いかもしれないけれど、ただ不気味なだけの噂がこれほど広範囲に、それも、急速に広まったという事実が、少し不気味な話だと思わない?", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/024.wav` },
  { text: "さて、では、その「火種」はどこにあったのか。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/025.wav` },
  { text: "…最も有力とされているのが、岐阜県発祥説ね。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/026.wav` },
  { text: "飯倉義之氏の解説によると、1978年の暮れごろ、岐阜県の八百津町でのことよ...", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/027.wav` },
  { text: "農家のおばあさんが庭の隅に口が耳まで裂けた女が立っているのを見た、という噂が広まり始めたとされているわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/028.wav` },
  { text: "これについては諸説あるのだけれどね。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/029.wav` },
  { text: "そして1979年初めには、岐阜日日新聞がこの噂を報じたとされるの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/030.wav` },
  { text: "…ただ、岐阜のどの町で最初に発生したのか、具体的な場所についてもいくつか候補があるようで、", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/031.wav` },
  { text: "八百津町だとか、美濃加茂市だとか、岐阜市だとか、いろんな話があるの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/032.wav` },
  { text: "実際、国立国会図書館のレファレンス協同データベースでも、口裂け女の噂は1978年暮れごろから翌年にかけて岐阜市内で話題になり、", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/033.wav` },
  { text: "発信地には美濃加茂市、八百津町、岐阜市などの説があった、と整理されているわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/034.wav` },
  { text: "そして、その噂は瞬く間に愛知、三重、静岡…と中京圏に広がり、翌年には関東や関西、さらに日本各地へと広まっていった、と考えられているの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/035.wav` },
  { text: "…でも、ここで少し考えてみて欲しいのだけれど、", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/036.wav` },
  { text: "…岐阜で生まれた噂が、なぜこれほどまでに早く全国に広まったのかしら?", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/037.wav` },
  { text: "もちろん、子ども同士の口コミは侮れないわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/038.wav` },
  { text: "それに、当時は塾という場所が、複数の学区の子どもたちをつなぐ場所になっていた。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/039.wav` },
  { text: "さらに、電話や親戚づての会話、新聞やテレビの報道も、噂の拡散を後押ししたとされているの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/040.wav` },
  { text: "…つまり、口裂け女は、単なる怪談ではなく、当時の子どもたちの生活環境やメディア環境と結びついて広がった怪異だったのよ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/041.wav` },
  { text: "…でもね、実はこの「岐阜発祥説」にも、少し注意が必要なの。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/042.wav` },
  { text: "岐阜が「全国的な流行の火元」として有力なのは確か。", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/043.wav` },
  { text: "けれど、それがそのまま「口が裂けた女」というイメージそのものの最初の発生源だったとは限らないのよ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/044.wav` },
  { text: "というのも、「口が耳まで裂けた女」というモチーフ自体は、もっと古い怪談や妖怪譚の中にも見られるからなの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/045.wav` },
  { text: "たとえば、江戸時代の怪談集には、口が耳元まで裂けた女や、狐が化けた女の口が裂けていた、という類の話が残されている。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/046.wav` },
  { text: "朝里樹氏は、現代の口裂け女と、江戸時代の『新著聞集』や『怪談老の杖』などに見られる「口が裂けた女」の怪談との類似を紹介しているわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/047.wav` },
  { text: "…もちろん、これは注意して聞いてほしいのだけれど、", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/048.wav` },
  { text: "江戸時代の怪談が、そのまま現代の口裂け女になった、というわけではないの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/049.wav` },
  { text: "そこにあるのは、直接の系譜というよりも、", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/050.wav` },
  { text: "「異常な口を持つ女」", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/051.wav` },
  { text: "「人間ではない女」", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/052.wav` },
  { text: "「顔の一部が恐怖の対象になる女」", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/053.wav` },
  { text: "という、古くからのイメージの重なりなのかもしれないわね。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/054.wav` },
  { text: "…妖怪の「二口女」は知っているかしら。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/055.wav` },
  { text: "後頭部にもう一つの口を持ち、後ろの口で大量に食事をするという、あの妖怪よ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/056.wav` },
  { text: "もっとも、二口女は後頭部にもう一つの口を持つ妖怪で、口裂け女とは性質が違うわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/057.wav` },
  { text: "だから、直接の原型とまでは言えない...。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/058.wav` },
  { text: "けれど、「女」と「異常な口」という組み合わせが、昔から日本の怪異の中に存在していたことは、少し興味深いと思わない?", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/059.wav` },
  { text: "ふふ...", expr: EXPR.smile1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/060.wav` },
  { text: "日本人は昔から、「顔に異常な口を持つ女」という存在に、特別な恐怖を感じていたのかもしれないわね。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/061.wav` },
  { text: "…そして、これは少し別のアプローチになるのだけれど。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/062.wav` },
  { text: "「口裂け女のモデルは実在した」という噂もあるの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/063.wav` },
  { text: "一番有名なのは、「整形手術に失敗した女性」説かしら。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/064.wav` },
  { text: "美しくなるために手術を受けたところ、失敗して口が耳まで裂けてしまった。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/065.wav` },
  { text: "絶望した彼女が、精神に異常をきたして街を徘徊するようになり、それが目撃談として広まった…というのが、この説の骨子よ。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/066.wav` },
  { text: "…ただ、これはあくまで後から語られるようになった正体譚のひとつと考えた方がよさそうね。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/067.wav` },
  { text: "国際日本文化研究センターのデータベースにも、整形手術の失敗を口裂け女の由来とするような伝承例はあるけれど、それは「そういう話が語られていた」という記録であって、実在の事件を証明するものではないし...", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/068.wav` },
  { text: "他にも、「狐に憑かれた三姉妹の一番下が、姉二人に口を裂かれた」という説や、「精神病院から脱走した患者だった」という説。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/069.wav` },
  { text: "あるいは、何らかの事件や事故と結びつける説。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/070.wav` },
  { text: "…こういった「モデル実在説」は、どれも決定的な裏付けに欠けるの。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/071.wav` },
  { text: "むしろ、そういう「如何にも」なエピソードが次々と付け足されていくところに、この怪異の本質があるのかもしれないわね。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/072.wav` },
  { text: "人間の想像力によって尾鰭背鰭がつき、やがて実在していたのかもしれない彼女の存在がより強力に、そして抽象的なものから多岐な具体性を経て、私たちの頭の中に出現する...。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/073.wav` },
  { text: "口裂け女は、ひとりの作者が作った物語ではなく、", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/074.wav` },
  { text: "多くの人が語り、怖がり、面白がり、少しずつ設定を足していった怪異なの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/075.wav` },
  { text: "國學院大學の記事でも、口裂け女は「特定の作者がいる物語」というより、人々の語りの中で解釈が積み重なり、形を変えながら残っていったものとして説明されているわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/076.wav` },
  { text: "つまり、この怪異は、特定の一人から生まれたものではない...", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/077.wav` },
  { text: "古くから存在していた「異形の口を持つ女」のイメージ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/078.wav` },
  { text: "見知らぬ女に声をかけられるという、不審者への恐怖。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/079.wav` },
  { text: "子どもたちの間で噂が広がっていく学校文化。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/080.wav` },
  { text: "そして1970年代後半という、社会や生活環境が大きく変わっていた時代の不安。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/081.wav` },
  { text: "それらが一点に集まって、岐阜という土地で偶然、火が点いた。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/082.wav` },
  { text: "…私には、そんな風に見えるわ。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/083.wav` },
  { text: "…特に、当時の社会背景は重要よ。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/084.wav` },
  { text: "1970年代後半というのは、子どもたちの生活圏が変化していた時代でもあるの。", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/085.wav` },
  { text: "塾に通う子どもが増え、学校の外で別の学区の子どもたちと出会う機会が増えていたわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/086.wav` },
  { text: "この噂が広がるより以前の時代と比べて、同じような年代の人々が繋がる場が作られやすい...", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/087.wav` },
  { text: "…ひとつの学校で生まれた噂が、塾で別の学校の子どもに伝わる。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/088.wav` },
  { text: "それがまた別の学校に持ち帰られる。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/089.wav` },
  { text: "そして電話や新聞、テレビによって、さらに遠くへ運ばれていく。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/090.wav` },
  { text: "…まるで、怪異そのものが、当時の情報網を歩いていたみたいね。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/091.wav` },
  { text: "それに、口裂け女には「美しさ」への問いがあるわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/092.wav` },
  { text: "「私、綺麗?」", expr: EXPR.smile1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/093.wav` },
  { text: "この問いかけは、ただ怖いだけではないの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/094.wav` },
  { text: "美しさを求める欲望。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/095.wav` },
  { text: "他人からどう見られるかという不安。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/096.wav` },
  { text: "顔を隠すことと、顔を暴かれることへの恐怖。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/097.wav` },
  { text: "そういったものが、あの短い問いかけの中に詰まっているようにも思えるの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/098.wav` },
  { text: "ただし、ここは断定できないわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/099.wav` },
  { text: "「女性の社会進出」や「美容整形への関心」が、そのまま口裂け女を生んだとまでは言えない。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/100.wav` },
  { text: "けれど、後年の語りの中で、彼女の正体が「美容整形に失敗した女性」とされたことを考えると、", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/101.wav` },
  { text: "人々が口裂け女に「美しさへの恐怖」を重ねていたことは、少なくとも見逃せないと思うの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/102.wav` },
  { text: "…これは、偶然なのかしら?", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/103.wav` },
  { text: "それとも、時代が彼女にそういう意味を与えたのかしら?", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/104.wav` },
  { text: "私には、後者に思えてならないわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/105.wav` },
  { text: "…そして、もう一つ、興味深い事実があるの。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/106.wav` },
  { text: "口裂け女の噂が全国で爆発的に広まった1979年。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/107.wav` },
  { text: "その騒ぎは、ある時期を境に、かなり急速に沈静化していったとされているわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/108.wav` },
  { text: "岐阜日日新聞の1979年6月15日夕刊には、「岐阜で生まれた口裂け女 騒ぎやっと下火へ」という記事があり、そこに想像図も掲載されていたことが、レファレンス協同データベースで確認できるのよ", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/109.wav` },
  { text: "これもまた面白い話だと思わない?", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/110.wav` },
  { text: "人のイメージに棲みつく怪異にも、寿命のようなものがあるのかもしれないわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/111.wav` },
  { text: "…もっとも、口裂け女はその後も形を変えて、何度も蘇ってくるのだけれどね。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/112.wav` },
  { text: "1990年代にも、学校の怪談や都市伝説の文脈の中で再び語られるようになっていたわ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/113.wav` },
  { text: "研究資料でも、1979年以降、新聞や雑誌で口裂け女の記事が断続的に掲載され、1990年代にも再び記事が見られることが指摘されているようだし...", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/114.wav` },
  { text: "2000年代にはホラー映画や漫画の題材としても定着した。", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/115.wav` },
  { text: "そして近年では、韓国や中華圏など、国境を越えた都市伝説としても知られるようになっているようね。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/116.wav` },
  { text: "…一度生まれた怪異は、簡単には消えないのよ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/117.wav` },
  { text: "むしろ、土地を越え、時代を越えて、姿を変えながら生き続けるの。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/118.wav` },
  { text: "…ここまで聞いて、あなたはどう感じたかしら?", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/119.wav` },
  { text: "口裂け女の発生源は岐阜なのか。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/120.wav` },
  { text: "それとも江戸時代の怪談なのか。", expr: EXPR.talk2, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/121.wav` },
  { text: "あるいは、もっと別のところにあるのか。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/122.wav` },
  { text: "…正直に言うとね、私は、これを明確にひとつへ絞ることに、そこまで意味があるとは思わないの。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/123.wav` },
  { text: "大事なのは、「なぜこの怪異が、この時代、この土地で全国へ広がり得たのか」ということ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/124.wav` },
  { text: "そして、「なぜ私たちは、今も彼女を忘れられないのか」ということよ。", expr: EXPR.talk1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/125.wav` },
  { text: "…ふふ、マスクで顔を隠して、「私、綺麗?」と問いかけてくる女。", expr: EXPR.smile1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/126.wav` },
  { text: "…マスクが日常になった時代を経た私たちにとって、あの問いかけは、少し違った響きを持って聞こえるのかもしれないわね。", expr: EXPR.talkEyeclose1, audio: `${KUTISAKE_ONNA_AUDIO_BASE}/127.wav` },
];

const openingChoices: OpeningChoice[] = [
  {
    label: "君はここで何をするの？",
    lines: [
      { text: "私が見たcreepyhubへの投稿やその他SNSで最近話題のことについてお話しすることとなるわ", expr: EXPR.talk1, audio: `${WHAT_DO_YOU_DO_AUDIO_BASE}/051.wav` },
      { text: "それ以外にも、私が気になったゲームの実況もたまにするかもね…", expr: EXPR.smile1, audio: `${WHAT_DO_YOU_DO_AUDIO_BASE}/052.wav` },
      { text: "まぁ、頻度はそんなに高くないかもしれないけれど。", expr: EXPR.talkConfuse1, audio: `${WHAT_DO_YOU_DO_AUDIO_BASE}/053.wav` },
      { text: "私の話はかなり長時間になるとおもうから、睡眠用にも聞いてくれると嬉しいわ。", expr: EXPR.smile2, audio: `${WHAT_DO_YOU_DO_AUDIO_BASE}/055.wav` },
    ],
  },
  {
    label: "イナクロ怪集部とは？",
    lines: [
      { text: "私が通っている高校の部活動のことよ。", expr: EXPR.talk1, audio: `${INAKURO_CLUB_AUDIO_BASE}/102.wav` },
      { text: "世界中のオカルトコンテンツを集めよう...という触れ込みのものね。", expr: EXPR.talk2, audio: `${INAKURO_CLUB_AUDIO_BASE}/103.wav` },
      { text: "...まぁ、部員はそれほどいないし、活動場所も学校にこだわる必要がないから、", expr: EXPR.talkConfuse1, audio: `${INAKURO_CLUB_AUDIO_BASE}/104.wav` },
      { text: "最近は外やネット上でやり取りする場面が多いかな…", expr: EXPR.smileConfuse1, audio: `${INAKURO_CLUB_AUDIO_BASE}/105.wav` },
      { text: "あまり学校でも関わりがないしね。", expr: EXPR.talkEyecloseConfuse1, audio: `${INAKURO_CLUB_AUDIO_BASE}/106.wav` },
      { text: "各々役割分担しているから、お目にかかる機会もほとんどないでしょう…", expr: EXPR.talkConfuse2, audio: `${INAKURO_CLUB_AUDIO_BASE}/107.wav` },
      { text: "………", expr: EXPR.normalEyecloseConfuse1, audio: `${INAKURO_CLUB_AUDIO_BASE}/108.wav` },
      { text: "ここでは、私達のお話をしましょう？", expr: EXPR.smileEyeclose1, audio: `${INAKURO_CLUB_AUDIO_BASE}/109.wav` },
    ],
  },
  {
    label: "説明は大丈夫です",
    skipExplanation: true,
    lines: [
      { text: "じゃあ、早速始めましょう...", expr: EXPR.smileEyeclose1, audio: `${NO_EXPLANATION_AUDIO_BASE}/110.wav` },
      { text: "怪異の収集の旅を...ね", expr: EXPR.smile2, audio: `${NO_EXPLANATION_AUDIO_BASE}/111.wav` },
    ],
  },
];

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

const kutisakeOnnaTopic: ScriptTopic = {
  id: "kvutisake-onna",
  label: "口裂け女の発祥について",
  lines: kutisakeOnnaLines,
};
const getLineMediaUrls = (lines: Line[]) => lines.flatMap((line) => line.visual?.src ? [line.visual.src] : []);

export default function NovelIdleScreen({ layers, locale, storyHref, speakerName, episodes = [] }: Props) {
  const [phase, setPhase] = useState<"loading" | "opening" | "openingChoice" | "greeting" | "idle" | "tap" | "script" | "choice" | "branch">("loading");
  const [displayedText, setDisplayedText] = useState("");
  const [greeting] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);
  const lastTapLineRef = useRef(-1);
  const [activeScript, setActiveScript] = useState<ScriptTopic | null>(null);
  const [scriptIndex, setScriptIndex] = useState(0);
  const [activeBranch, setActiveBranch] = useState<ScriptChoice | null>(null);
  const [branchIndex, setBranchIndex] = useState(0);
  const [isOpeningBranch, setIsOpeningBranch] = useState(false);
  const [currentExpr, setCurrentExpr] = useState<string>(EXPR.normal);
  const currentExprRef = useRef<string>(EXPR.normal);
  const [activeLineMedia, setActiveLineMedia] = useState<LineMedia | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const transitionStarted = useRef(false);

  // Opening state
  const [openingIndex, setOpeningIndex] = useState(0);
  const openingIndexRef = useRef(0);
  const openingAudioRef = useRef<HTMLAudioElement | null>(null);
  const openingAdvancedRef = useRef(false);
  const openingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogueAudioRef = useRef<HTMLAudioElement | null>(null);
  const dialogueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openingPlaybackIdRef = useRef(0);
  const dialoguePlaybackIdRef = useRef(0);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmFadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgmFadingOutRef = useRef(false);
  const handleTapRef = useRef<(() => void) | null>(null);
  const dialogueAudioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // UI preferences (persisted)
  const [muted, setMuted] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [volume, setVolume] = useState(1);
  const [analogEffect, setAnalogEffect] = useState<AnalogEffect>("crt");
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [openingSeenResolved, setOpeningSeenResolved] = useState(false);
  const openingSeenKeyRef = useRef("creepyhub_novel_firstvisit:guest");

  const mutedRef = useRef(muted);
  const volumeRef = useRef(volume);
  const autoPlayRef = useRef(autoPlay);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);
  useEffect(() => { openingIndexRef.current = openingIndex; }, [openingIndex]);
  useEffect(() => { currentExprRef.current = currentExpr; }, [currentExpr]);

  const getTargetBgmVolume = useCallback(() => Math.min(1, volumeRef.current * NOVEL_BGM_VOLUME), []);
  const getTargetVoiceVolume = useCallback(() => Math.min(1, volumeRef.current * NOVEL_VOICE_VOLUME_MULTIPLIER), []);

  const preloadDialogueAudio = useCallback((src?: string) => {
    if (!src) return null;
    const cached = dialogueAudioCacheRef.current.get(src);
    if (cached) return cached;

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = src;
    dialogueAudioCacheRef.current.set(src, audio);
    audio.load();
    return audio;
  }, []);

  const prepareDialogueAudio = useCallback((src: string) => {
    const audio = preloadDialogueAudio(src);
    if (!audio) return null;

    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {}
    audio.volume = getTargetVoiceVolume();
    audio.muted = mutedRef.current;
    return audio;
  }, [getTargetVoiceVolume, preloadDialogueAudio]);

  const preloadLineAudios = useCallback((lines: Line[], start = 0, count = DIALOGUE_AUDIO_PRELOAD_AHEAD) => {
    lines.slice(start, start + count).forEach((line) => {
      preloadDialogueAudio(line.audio);
    });
  }, [preloadDialogueAudio]);

  const clearBgmFade = useCallback(() => {
    if (bgmFadeIntervalRef.current !== null) {
      clearInterval(bgmFadeIntervalRef.current);
      bgmFadeIntervalRef.current = null;
    }
  }, []);

  const fadeBgmTo = useCallback((targetVolume: number, durationMs: number, onComplete?: () => void) => {
    const audio = bgmAudioRef.current;
    if (!audio) return;
    clearBgmFade();
    const startVolume = audio.volume;
    const startedAt = Date.now();
    bgmFadeIntervalRef.current = setInterval(() => {
      const current = bgmAudioRef.current;
      if (!current) {
        clearBgmFade();
        return;
      }
      const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
      current.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress >= 1) {
        clearBgmFade();
        onComplete?.();
      }
    }, 100);
  }, [clearBgmFade]);

  const restartBgmLoop = useCallback(() => {
    const audio = bgmAudioRef.current;
    if (!audio) return;
    bgmFadingOutRef.current = false;
    clearBgmFade();
    audio.currentTime = 0;
    audio.volume = 0;
    audio.muted = mutedRef.current;
    audio.play().then(() => {
      fadeBgmTo(getTargetBgmVolume(), NOVEL_BGM_FADE_MS);
    }).catch(() => {
      audio.volume = getTargetBgmVolume();
    });
  }, [clearBgmFade, fadeBgmTo, getTargetBgmVolume]);

  const syncBgmAudio = useCallback(() => {
    const audio = bgmAudioRef.current;
    if (!audio) return;
    audio.muted = mutedRef.current;
    if (!bgmFadingOutRef.current && !mutedRef.current) {
      audio.volume = getTargetBgmVolume();
    }
  }, [getTargetBgmVolume]);

  const startBgmAudio = useCallback(() => {
    if (!bgmAudioRef.current) {
      const audio = new Audio(NOVEL_BGM_AUDIO);
      audio.loop = false;
      audio.preload = "auto";
      audio.ontimeupdate = () => {
        const current = bgmAudioRef.current;
        if (!current || bgmFadingOutRef.current || !Number.isFinite(current.duration)) return;
        const remainingMs = Math.max(0, (current.duration - current.currentTime) * 1000);
        if (remainingMs <= NOVEL_BGM_FADE_MS) {
          bgmFadingOutRef.current = true;
          fadeBgmTo(0, Math.max(250, remainingMs));
        }
      };
      audio.onended = () => {
        restartBgmLoop();
      };
      bgmAudioRef.current = audio;
    }
    syncBgmAudio();
    const audio = bgmAudioRef.current;
    if (!mutedRef.current && audio.paused) {
      bgmFadingOutRef.current = false;
      clearBgmFade();
      audio.volume = 0;
      audio.play().then(() => {
        fadeBgmTo(getTargetBgmVolume(), NOVEL_BGM_FADE_MS);
      }).catch(() => {
        audio.volume = getTargetBgmVolume();
      });
    }
  }, [clearBgmFade, fadeBgmTo, getTargetBgmVolume, restartBgmLoop, syncBgmAudio]);

  // UI modals
  const [showBacklog, setShowBacklog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Backlog
  const [backlog, setBacklog] = useState<Array<{ speaker: string; text: string; expr: string }>>([]);

  // Load preferences
  useEffect(() => {
    try {
      const m = localStorage.getItem("creepyhub_novel_muted");
      const a = localStorage.getItem("creepyhub_novel_autoplay");
      const f = localStorage.getItem("creepyhub_novel_fontsize");
      const v = localStorage.getItem("creepyhub_novel_volume");
      const e = localStorage.getItem("creepyhub_novel_analog_effect") as AnalogEffect | null;
      if (m !== null) setMuted(m === "1");
      if (a !== null) setAutoPlay(a === "1");
      if (
        e === "none" ||
        e === "film" ||
        e === "vhs" ||
        e === "crt" ||
        e === "max" ||
        e === "fog" ||
        e === "sepia" ||
        e === "red" ||
        e === "dream"
      ) setAnalogEffect(e);
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
      localStorage.setItem("creepyhub_novel_fontsize", String(fontSize));
      localStorage.setItem("creepyhub_novel_volume", String(volume));
      localStorage.setItem("creepyhub_novel_analog_effect", analogEffect);
    } catch {}
  }, [muted, autoPlay, fontSize, volume, analogEffect, prefsLoaded]);

  useEffect(() => {
    let cancelled = false;

    const resolveOpeningSeen = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;
        openingSeenKeyRef.current = userId
          ? `creepyhub_novel_firstvisit:${userId}`
          : "creepyhub_novel_firstvisit:guest";
      } catch {
        openingSeenKeyRef.current = "creepyhub_novel_firstvisit:guest";
      }

      if (!cancelled) setOpeningSeenResolved(true);
    };

    resolveOpeningSeen();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    syncBgmAudio();
    if (!muted) startBgmAudio();
  }, [muted, volume, prefsLoaded, startBgmAudio, syncBgmAudio]);

  useEffect(() => {
    const targetVolume = getTargetVoiceVolume();
    if (openingAudioRef.current) openingAudioRef.current.volume = targetVolume;
    if (dialogueAudioRef.current) dialogueAudioRef.current.volume = targetVolume;
  }, [getTargetVoiceVolume, volume]);

  useEffect(() => {
    preloadLineAudios(OPENING_LINES, 0, DIALOGUE_AUDIO_PRELOAD_AHEAD);
    openingChoices.forEach((choice) => preloadLineAudios(choice.lines ?? [], 0, 1));
  }, [preloadLineAudios]);

  useEffect(() => {
    if (phase === "opening") {
      preloadLineAudios(OPENING_LINES, openingIndex, DIALOGUE_AUDIO_PRELOAD_AHEAD);
      return;
    }

    if (phase === "script" && activeScript) {
      preloadLineAudios(activeScript.lines, scriptIndex, DIALOGUE_AUDIO_PRELOAD_AHEAD);
      return;
    }

    if (phase === "branch" && activeBranch) {
      preloadLineAudios(activeBranch.lines, branchIndex, DIALOGUE_AUDIO_PRELOAD_AHEAD);
    }
  }, [activeBranch, activeScript, branchIndex, openingIndex, phase, preloadLineAudios, scriptIndex]);

  // Preload all images
  const allImageUrls = Array.from(new Set([
    ...layers.map((l) => l.image_url),
    ...Object.values(EXPR),
    ...openingChoices.flatMap((choice) => getLineMediaUrls(choice.lines ?? [])),
    ...scriptTopics.flatMap((topic) => [
      ...getLineMediaUrls(topic.lines),
      ...(topic.choices ?? []).flatMap((choice) => getLineMediaUrls(choice.lines)),
    ]),
    ...getLineMediaUrls(kutisakeOnnaTopic.lines),
  ]));
  const totalImages = allImageUrls.length;

  useEffect(() => {
    let count = 0;
    allImageUrls.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => { count++; setLoadedCount(count); };
      img.src = url;
    });
  }, [layers]);

  const stopDialogueAudio = useCallback(() => {
    dialoguePlaybackIdRef.current += 1;
    if (dialogueTimerRef.current !== null) {
      clearTimeout(dialogueTimerRef.current);
      dialogueTimerRef.current = null;
    }
    if (dialogueAudioRef.current) {
      dialogueAudioRef.current.onended = null;
      dialogueAudioRef.current.pause();
      dialogueAudioRef.current = null;
    }
  }, []);

  // Show a line instantly (no typewriter)
  const showLine = useCallback((line: Line, playAudio = true) => {
    stopDialogueAudio();
    const nextExpr = resolveLineExpression(line, currentExprRef.current);
    currentExprRef.current = nextExpr;
    setCurrentExpr(nextExpr);
    setActiveLineMedia((current) => line.visual ?? (line.keepVisual ? current : null));
    setDisplayedText(line.text);
    setBacklog((prev) => [...prev, { speaker: speakerName ?? "", text: line.text, expr: nextExpr }]);

    if (!playAudio || !line.audio || mutedRef.current) return;

    const audio = prepareDialogueAudio(line.audio);
    if (!audio) return;
    const playbackId = dialoguePlaybackIdRef.current;
    dialogueAudioRef.current = audio;
    audio.onended = () => {
      if (playbackId !== dialoguePlaybackIdRef.current || dialogueAudioRef.current !== audio) return;
      if (autoPlayRef.current) {
        dialogueTimerRef.current = setTimeout(() => handleTapRef.current?.(), 400);
      }
    };
    audio.play().catch(() => {
      if (playbackId !== dialoguePlaybackIdRef.current || dialogueAudioRef.current !== audio) return;
      dialogueAudioRef.current = null;
      if (autoPlayRef.current) {
        dialogueTimerRef.current = setTimeout(() => handleTapRef.current?.(), getLineAutoDelay(line.text));
      }
    });
  }, [prepareDialogueAudio, speakerName, stopDialogueAudio]);

  // Advance opening to next line (or idle when done)
  const advanceOpening = useCallback(() => {
    if (openingAdvancedRef.current) return;
    openingAdvancedRef.current = true;
    openingPlaybackIdRef.current += 1;
    if (openingTimerRef.current !== null) {
      clearTimeout(openingTimerRef.current);
      openingTimerRef.current = null;
    }
    if (openingAudioRef.current) {
      openingAudioRef.current.onended = null;
      openingAudioRef.current.pause();
      openingAudioRef.current = null;
    }
    const next = openingIndexRef.current + 1;
    if (next >= OPENING_LINES.length) {
      try { localStorage.setItem(openingSeenKeyRef.current, "1"); } catch {}
      setCurrentExpr(EXPR.normal);
      setActiveLineMedia(null);
      setDisplayedText("");
      setPhase("openingChoice");
    } else {
      setOpeningIndex(next);
    }
  }, []);

  // Play each opening line. AUTO advances after audio/read-time; tap mode waits for input.
  useEffect(() => {
    if (phase !== "opening") return;
    openingPlaybackIdRef.current += 1;
    openingAdvancedRef.current = false;

    const line = OPENING_LINES[openingIndex];

    if (openingAudioRef.current) {
      openingAudioRef.current.onended = null;
      openingAudioRef.current.pause();
      openingAudioRef.current = null;
    }
    if (openingTimerRef.current !== null) {
      clearTimeout(openingTimerRef.current);
      openingTimerRef.current = null;
    }

    showLine(line, false);

    // Reading-time fallback: used in AUTO when muted or audio is blocked.
    const readingDelay = getLineAutoDelay(line.text);

    if (mutedRef.current) {
      if (autoPlay) {
        openingTimerRef.current = setTimeout(advanceOpening, readingDelay);
      }
    } else {
      const audio = prepareDialogueAudio(line.audio);
      if (!audio) return;
      const playbackId = openingPlaybackIdRef.current;
      openingAudioRef.current = audio;
      audio.onended = () => {
        if (playbackId !== openingPlaybackIdRef.current || openingAudioRef.current !== audio) return;
        if (autoPlayRef.current) {
          openingTimerRef.current = setTimeout(advanceOpening, 400);
        }
      };
      audio.play().catch(() => {
        if (playbackId !== openingPlaybackIdRef.current || openingAudioRef.current !== audio) return;
        openingAudioRef.current = null;
        if (autoPlay) {
          openingTimerRef.current = setTimeout(advanceOpening, readingDelay);
        }
      });
    }

    return () => {
      if (openingTimerRef.current !== null) {
        clearTimeout(openingTimerRef.current);
        openingTimerRef.current = null;
      }
    };
  }, [phase, openingIndex, autoPlay, prepareDialogueAudio, showLine, advanceOpening]);

  // Transition loading → opening (first visit) or greeting (returning)
  useEffect(() => {
    if (phase === "loading" && loadedCount >= totalImages && prefsLoaded && openingSeenResolved && !transitionStarted.current) {
      transitionStarted.current = true;
      const timer = setTimeout(() => {
        let hasSeenOpening = false;
        try {
          hasSeenOpening = localStorage.getItem(openingSeenKeyRef.current) === "1";
        } catch {}
        setPhase(hasSeenOpening ? "idle" : "opening");
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, loadedCount, totalImages, prefsLoaded, openingSeenResolved]);

  // Start greeting
  useEffect(() => {
    if (phase !== "greeting") return;
    const timer = setTimeout(() => showLine(greeting), 600);
    return () => clearTimeout(timer);
  }, [phase, greeting, showLine]);

  // Greeting / tap → idle after pause (auto mode only; tap mode waits for user input)
  useEffect(() => {
    if (!autoPlay) return;
    if (phase !== "greeting" && phase !== "tap") return;
    if (!displayedText) return;
    const timer = setTimeout(() => {
      setCurrentExpr(EXPR.normal);
      setPhase("idle");
    }, 2500);
    return () => clearTimeout(timer);
  }, [autoPlay, phase, displayedText]);

  // Auto-advance for script/branch in AUTO mode
  useEffect(() => {
    if (!autoPlay) return;
    if (phase !== "script" && phase !== "branch") return;
    if (!displayedText) return;
    const activeLine =
      phase === "script" ? activeScript?.lines[scriptIndex] :
      phase === "branch" ? activeBranch?.lines[branchIndex] :
      null;
    if (activeLine?.audio && !muted) return;
    const delay = getLineAutoDelay(displayedText);
    const timer = setTimeout(() => handleTapRef.current?.(), delay);
    return () => clearTimeout(timer);
  }, [autoPlay, phase, displayedText, activeScript, scriptIndex, activeBranch, branchIndex, muted]);

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

  // Cleanup on unmount
  useEffect(() => {
    const dialogueAudioCache = dialogueAudioCacheRef.current;
    return () => {
      openingPlaybackIdRef.current += 1;
      dialoguePlaybackIdRef.current += 1;
      if (openingTimerRef.current !== null) clearTimeout(openingTimerRef.current);
      if (openingAudioRef.current) {
        openingAudioRef.current.onended = null;
        openingAudioRef.current.pause();
      }
      stopDialogueAudio();
      if (bgmAudioRef.current) {
        clearBgmFade();
        bgmAudioRef.current.ontimeupdate = null;
        bgmAudioRef.current.onended = null;
        bgmAudioRef.current.pause();
        bgmAudioRef.current = null;
      }
      dialogueAudioCache.forEach((audio) => {
        audio.onended = null;
        audio.pause();
      });
      dialogueAudioCache.clear();
    };
  }, [clearBgmFade, stopDialogueAudio]);

  const startScript = (topic: ScriptTopic) => {
    preloadLineAudios(topic.lines, 0, DIALOGUE_AUDIO_PRELOAD_AHEAD);
    setActiveScript(topic);
    setIsOpeningBranch(false);
    setScriptIndex(0);
    setPhase("script");
    showLine(topic.lines[0]);
  };

  const skipConversation = () => {
    stopDialogueAudio();

    if (phase === "greeting" || phase === "tap") {
      setCurrentExpr(EXPR.normal);
      setActiveLineMedia(null);
      setPhase("idle");
      return;
    }

    if (phase === "script") {
      setActiveScript(null);
      setScriptIndex(0);
      setCurrentExpr(EXPR.normal);
      setActiveLineMedia(null);
      setPhase("idle");
      return;
    }

    if (phase === "branch") {
      const shouldReturnToOpeningChoices = isOpeningBranch;
      setActiveScript(null);
      setActiveBranch(null);
      setScriptIndex(0);
      setBranchIndex(0);
      setIsOpeningBranch(false);
      setCurrentExpr(EXPR.normal);
      setActiveLineMedia(null);
      setPhase(shouldReturnToOpeningChoices ? "openingChoice" : "idle");
    }
  };

  const handleTap = () => {
    if (showBacklog || showSettings) return;
    startBgmAudio();

    if (phase === "opening") {
      // Tap skips current line's audio and advances immediately
      advanceOpening();
    } else {
      stopDialogueAudio();
    }

    if (phase === "opening") {
      return;
    } else if (phase === "greeting") {
      setCurrentExpr(EXPR.normal);
      setActiveLineMedia(null);
      setPhase("idle");
    } else if (phase === "idle") {
      if (storyHref && episodes.length === 0) {
        window.location.href = storyHref;
        return;
      }
      let idx: number;
      do {
        idx = Math.floor(Math.random() * tapLines.length);
      } while (idx === lastTapLineRef.current && tapLines.length > 1);
      lastTapLineRef.current = idx;
      setPhase("tap");
      showLine(tapLines[idx]);
    } else if (phase === "tap") {
      setCurrentExpr(EXPR.normal);
      setActiveLineMedia(null);
      setPhase("idle");
    } else if (phase === "script" && activeScript) {
      if (scriptIndex < activeScript.lines.length - 1) {
        const next = scriptIndex + 1;
        setScriptIndex(next);
        showLine(activeScript.lines[next]);
      } else if (activeScript.choices?.length) {
        setCurrentExpr(EXPR.normal);
        setActiveLineMedia(null);
        setPhase("choice");
      } else {
        setActiveScript(null);
        setScriptIndex(0);
        setCurrentExpr(EXPR.normal);
        setActiveLineMedia(null);
        setPhase("idle");
      }
    } else if (phase === "branch" && activeBranch) {
      if (branchIndex < activeBranch.lines.length - 1) {
        const next = branchIndex + 1;
        setBranchIndex(next);
        showLine(activeBranch.lines[next]);
      } else {
        setActiveScript(null);
        setActiveBranch(null);
        setScriptIndex(0);
        setBranchIndex(0);
        const shouldReturnToOpeningChoices = isOpeningBranch;
        setIsOpeningBranch(false);
        setCurrentExpr(EXPR.normal);
        setActiveLineMedia(null);
        setPhase(shouldReturnToOpeningChoices ? "openingChoice" : "idle");
      }
    }
  };

  const selectChoice = (choice: ScriptChoice) => {
    preloadLineAudios(choice.lines, 0, DIALOGUE_AUDIO_PRELOAD_AHEAD);
    setIsOpeningBranch(false);
    setActiveBranch(choice);
    setBranchIndex(0);
    setPhase("branch");
    showLine(choice.lines[0]);
  };

  const selectOpeningChoice = (choice: OpeningChoice) => {
    if (!choice.lines?.length) {
      setCurrentExpr(EXPR.normal);
      setActiveLineMedia(null);
      setDisplayedText("");
      setPhase("idle");
      return;
    }

    preloadLineAudios(choice.lines, 0, DIALOGUE_AUDIO_PRELOAD_AHEAD);
    setActiveBranch({ label: choice.label, lines: choice.lines });
    setIsOpeningBranch(!choice.skipExplanation);
    setBranchIndex(0);
    setPhase("branch");
    showLine(choice.lines[0]);
  };

  handleTapRef.current = handleTap;

  const isTextVisible =
    phase === "greeting" || phase === "tap" || phase === "script" || phase === "branch" || phase === "opening";
  const canSkipConversation = phase === "greeting" || phase === "tap" || phase === "script" || phase === "branch";
  const talkButtonStyle: React.CSSProperties = {
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
  };

  return (
    <div
      onClick={handleTap}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        width: "min(100vw, 430px, calc(100dvh * 9 / 16))",
        maxWidth: "100vw",
        aspectRatio: "9 / 16",
        maxHeight: "100dvh",
        transform: "translate(-50%, -50%)",
        background: "#000",
        zIndex: 9999,
        overflow: "hidden",
        cursor: phase === "loading" ? "default" : "pointer",
        touchAction: "manipulation",
        boxShadow: "0 0 0 100vmax #000, 0 24px 80px rgba(0,0,0,0.72)",
      }}
    >
      {/* Loading screen */}
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
          style={{ width: 128, height: "auto", animation: "novel-logo-pulse 2s ease-in-out infinite" }}
        />
      </div>

      {/* Layers */}
      <div style={{ opacity: phase !== "loading" ? 1 : 0, transition: "opacity 0.8s ease" }}>
        {layers.map((layer, i) => {
          const isCharLayer = layer.type === "char";
          const isMainChar = isCharLayer && layer.role !== "shadow";
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
                objectFit: isCharLayer ? "contain" : "cover",
                objectPosition: isCharLayer ? "center bottom" : "center center",
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

      {/* Per-line media */}
      {phase !== "loading" && activeLineMedia && (
        <div
          key={activeLineMedia.src}
          style={{
            position: "absolute",
            top: "5vh",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(92vw, 520px)",
            height: "min(58vh, 620px)",
            zIndex: layers.length + 2,
            pointerEvents: "none",
            animation: "novel-fade-in 0.75s ease both",
          }}
        >
          <img
            src={activeLineMedia.src}
            alt={activeLineMedia.alt ?? ""}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center top",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.22)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.72), 0 0 0 1px rgba(198,40,40,0.18)",
            }}
          />
        </div>
      )}

      {/* Analog visual effects */}
      {phase !== "loading" && analogEffect !== "none" && (
        <div
          className={`novel-analog-effect novel-analog-${analogEffect}`}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: layers.length + 3,
            pointerEvents: "none",
            opacity: 1,
          }}
        >
          <div className="novel-analog-vignette" />
          <div className="novel-analog-grain" />
          <div className="novel-analog-scanlines" />
          <div className="novel-analog-roll" />
        </div>
      )}

      {/* Home button */}
      {phase !== "loading" && (
        <a
          href={`/${locale}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", top: 12, left: 12, zIndex: layers.length + 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 40, height: 40, background: "rgba(0,0,0,0.6)", borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)", animation: "novel-fade-in 0.5s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </a>
      )}

      {/* Top-right controls */}
      {phase !== "loading" && (
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8, zIndex: layers.length + 10, animation: "novel-fade-in 0.5s ease" }}>
          {canSkipConversation && (
            <IconButton onClick={(e) => { e.stopPropagation(); skipConversation(); }} title="会話をスキップ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </IconButton>
          )}
          <IconButton onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }} title={muted ? "音声ON" : "音声OFF"}>
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </IconButton>
          <IconButton onClick={(e) => { e.stopPropagation(); setShowBacklog(true); }} title="履歴">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </IconButton>
          <IconButton onClick={(e) => { e.stopPropagation(); setShowSettings(true); }} title="設定">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </IconButton>
        </div>
      )}

      {/* Text box */}
      {isTextVisible && (
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "12px 16px 32px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.92))",
            minHeight: "20%", display: "flex", flexDirection: "column", justifyContent: "flex-start",
            zIndex: layers.length + 5,
            animation: "novel-fade-in 0.3s ease",
          }}
        >
          {speakerName && (
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent, #c62828)", marginBottom: 6, letterSpacing: 1 }}>
              {speakerName}
            </div>
          )}
          <div style={{ fontSize: fontSize, lineHeight: 1.8, color: "#e0e0e0", fontFamily: "'SoukouMincho', serif", whiteSpace: "pre-wrap", minHeight: 60, textAlign: "center" }}>
            {displayedText}
          </div>
        </div>
      )}

      {/* Choice buttons */}
      {phase === "choice" && activeScript?.choices && (
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "20px 16px 40px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.92))",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            zIndex: layers.length + 5, animation: "novel-fade-in 0.5s ease",
          }}
        >
          {activeScript.choices.map((choice, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); selectChoice(choice); }}
              style={{
                width: "100%", maxWidth: 320,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 8, padding: "12px 20px", color: "#e0e0e0",
                fontSize: 15, fontFamily: "'SoukouMincho', serif", letterSpacing: 1,
                cursor: "pointer", textAlign: "left", transition: "background 0.2s ease, border-color 0.2s ease",
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

      {/* Opening explanation choices */}
      {phase === "openingChoice" && (
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "20px 16px 40px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.92))",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            zIndex: layers.length + 5, animation: "novel-fade-in 0.5s ease",
          }}
        >
          {openingChoices.map((choice, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); selectOpeningChoice(choice); }}
              style={{
                width: "100%", maxWidth: 360,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 8, padding: "12px 20px", color: "#e0e0e0",
                fontSize: 15, fontFamily: "'SoukouMincho', serif", letterSpacing: 1,
                cursor: "pointer", textAlign: "left", transition: "background 0.2s ease, border-color 0.2s ease",
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
            position: "absolute", bottom: 24, left: 0, right: 0,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            zIndex: layers.length + 5, animation: "novel-fade-in 0.8s ease",
            maxHeight: "70vh", overflowY: "auto", padding: "0 16px",
          }}
        >
          <p style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.45)", fontFamily: "'SoukouMincho', serif", margin: "0 0 4px", textTransform: "uppercase" }}>
            Trial
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); startScript(kutisakeOnnaTopic); }}
            style={talkButtonStyle}
          >
            口裂け女（体験版）
          </button>
        </div>
      )}

      {/* Backlog modal */}
      {showBacklog && (
        <div
          onClick={(e) => { e.stopPropagation(); setShowBacklog(false); }}
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: layers.length + 50, display: "flex", alignItems: "center", justifyContent: "center", animation: "novel-fade-in 0.2s ease" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: 480, maxHeight: "80vh", background: "rgba(10,5,8,0.95)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "20px 20px 16px", display: "flex", flexDirection: "column" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#e0e0e0", fontSize: 16, fontFamily: "'SoukouMincho', serif", letterSpacing: 2 }}>履歴</h3>
              <button onClick={() => setShowBacklog(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 20, cursor: "pointer", padding: 0, width: 28, height: 28 }} aria-label="閉じる">×</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4 }}>
              {backlog.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>まだセリフがありません</p>
              ) : (
                backlog.map((entry, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {entry.speaker && <div style={{ fontSize: 11, color: "var(--accent,#c62828)", fontWeight: 700, marginBottom: 2, letterSpacing: 1 }}>{entry.speaker}</div>}
                    <div style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.7, fontFamily: "'SoukouMincho', serif" }}>{entry.text}</div>
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
          onClick={(e) => { e.stopPropagation(); setShowSettings(false); }}
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: layers.length + 50, display: "flex", alignItems: "center", justifyContent: "center", animation: "novel-fade-in 0.2s ease" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: 380, background: "rgba(10,5,8,0.95)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "20px 20px 16px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: "#e0e0e0", fontSize: 16, fontFamily: "'SoukouMincho', serif", letterSpacing: 2 }}>設定</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 20, cursor: "pointer", padding: 0, width: 28, height: 28 }} aria-label="閉じる">×</button>
            </div>

            {/* 進行モード */}
            <div style={{ marginBottom: 16 }}>
              <label style={settingsLabel}>進行モード</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[false, true].map((isAuto) => (
                  <button
                    key={String(isAuto)}
                    onClick={() => setAutoPlay(isAuto)}
                    style={{
                      flex: 1,
                      background: autoPlay === isAuto ? "rgba(198,40,40,0.7)" : "rgba(255,255,255,0.08)",
                      border: `1px solid ${autoPlay === isAuto ? "rgba(255,100,100,0.6)" : "rgba(255,255,255,0.25)"}`,
                      borderRadius: 6, padding: "8px 0",
                      color: "rgba(255,255,255,0.85)", fontSize: 13,
                      cursor: "pointer", fontFamily: "'SoukouMincho', serif", letterSpacing: 1,
                    }}
                  >
                    {isAuto ? "▶ AUTO" : "タップ"}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                {autoPlay ? "会話が自動で進みます" : "タップ・クリックで進みます"}
              </p>
            </div>

            {/* Font size */}
            <div style={{ marginBottom: 16 }}>
              <label style={settingsLabel}>
                フォントサイズ
                <span style={settingsValue}>{fontSize}px</span>
              </label>
              <input type="range" min={12} max={22} step={1} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: "100%" }} />
            </div>

            {/* Volume */}
            <div style={{ marginBottom: 8 }}>
              <label style={settingsLabel}>
                音量
                <span style={settingsValue}>{Math.round(volume * 100)}%</span>
              </label>
              <input type="range" min={0} max={100} step={1} value={Math.round(volume * 100)} onChange={(e) => setVolume(Number(e.target.value) / 100)} style={{ width: "100%" }} disabled={muted} />
              {muted && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>ミュート中</p>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes novel-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes novel-logo-pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes novel-fade-to-black { from { opacity: 0; } to { opacity: 1; } }
        @keyframes novel-grain-shift {
          0% { transform: translate3d(0, 0, 0); }
          20% { transform: translate3d(-3%, 2%, 0); }
          40% { transform: translate3d(2%, -2%, 0); }
          60% { transform: translate3d(-2%, -1%, 0); }
          80% { transform: translate3d(3%, 1%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        @keyframes novel-scan-roll {
          from { transform: translateY(-18%); }
          to { transform: translateY(18%); }
        }
        @keyframes novel-vhs-drift {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.14; }
          37% { transform: translate3d(0.8%, -0.2%, 0); opacity: 0.22; }
          38% { transform: translate3d(-0.6%, 0.1%, 0); opacity: 0.12; }
          76% { transform: translate3d(0.4%, 0.2%, 0); opacity: 0.2; }
        }
        @keyframes novel-fog-drift {
          0% { transform: translate3d(-4%, 2%, 0) scale(1.04); }
          50% { transform: translate3d(4%, -1%, 0) scale(1.08); }
          100% { transform: translate3d(-4%, 2%, 0) scale(1.04); }
        }
        @keyframes novel-red-pulse {
          0%, 100% { opacity: 0.44; }
          50% { opacity: 0.7; }
        }
        .novel-analog-effect {
          overflow: hidden;
          animation: novel-vhs-drift 7s steps(1, end) infinite;
        }
        .novel-analog-vignette,
        .novel-analog-grain,
        .novel-analog-scanlines,
        .novel-analog-roll {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .novel-analog-vignette {
          background:
            radial-gradient(circle at 50% 42%, transparent 44%, rgba(0,0,0,0.38) 100%),
            linear-gradient(90deg, rgba(255,0,0,0.045), transparent 26%, transparent 74%, rgba(0,120,255,0.045));
          mix-blend-mode: multiply;
        }
        .novel-analog-grain {
          inset: -20%;
          background-image:
            radial-gradient(circle at 12% 18%, rgba(255,255,255,0.48) 0 1px, transparent 1.2px),
            radial-gradient(circle at 78% 28%, rgba(255,255,255,0.32) 0 1px, transparent 1.3px),
            radial-gradient(circle at 42% 72%, rgba(0,0,0,0.5) 0 1px, transparent 1.2px),
            radial-gradient(circle at 62% 52%, rgba(255,255,255,0.24) 0 1px, transparent 1.3px);
          background-size: 11px 13px, 17px 19px, 13px 17px, 19px 23px;
          animation: novel-grain-shift 0.7s steps(2, end) infinite;
        }
        .novel-analog-scanlines {
          background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.16) 0,
            rgba(255,255,255,0.16) 1px,
            rgba(0,0,0,0.14) 2px,
            transparent 5px
          );
        }
        .novel-analog-roll {
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(255,255,255,0.12) 48%,
            rgba(255,255,255,0.2) 50%,
            rgba(0,0,0,0.16) 52%,
            transparent 100%
          );
          animation: novel-scan-roll 5.5s linear infinite;
        }
        .novel-analog-film .novel-analog-grain { opacity: 0.18; }
        .novel-analog-film .novel-analog-scanlines { opacity: 0.1; }
        .novel-analog-film .novel-analog-roll { opacity: 0.06; }
        .novel-analog-vhs .novel-analog-grain { opacity: 0.28; }
        .novel-analog-vhs .novel-analog-scanlines { opacity: 0.18; background-size: auto; }
        .novel-analog-vhs .novel-analog-roll { opacity: 0.22; animation-duration: 3.8s; }
        .novel-analog-vhs .novel-analog-vignette {
          background:
            radial-gradient(circle at 50% 42%, transparent 38%, rgba(0,0,0,0.5) 100%),
            linear-gradient(90deg, rgba(255,0,0,0.1), transparent 24%, transparent 76%, rgba(0,120,255,0.1));
        }
        .novel-analog-crt .novel-analog-grain { opacity: 0.072; }
        .novel-analog-crt .novel-analog-scanlines {
          opacity: 0.144;
          background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.108) 0,
            rgba(255,255,255,0.108) 1px,
            rgba(0,0,0,0.09) 2px,
            transparent 5px
          );
        }
        .novel-analog-crt .novel-analog-roll { opacity: 0.054; animation-duration: 7s; }
        .novel-analog-crt .novel-analog-vignette {
          background:
            radial-gradient(circle at 50% 48%, transparent 30%, rgba(0,0,0,0.198) 100%),
            linear-gradient(90deg, rgba(255,0,0,0.036), transparent 24%, transparent 76%, rgba(0,120,255,0.036));
        }
        .novel-analog-max {
          animation: novel-vhs-drift 1.8s steps(1, end) infinite;
        }
        .novel-analog-max .novel-analog-grain {
          opacity: 0.55;
          background-size: 7px 9px, 11px 13px, 9px 11px, 13px 15px;
          animation-duration: 0.28s;
        }
        .novel-analog-max .novel-analog-scanlines {
          opacity: 0.58;
          background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.36) 0,
            rgba(255,255,255,0.36) 1px,
            rgba(0,0,0,0.36) 2px,
            rgba(0,0,0,0.22) 3px,
            transparent 6px
          );
        }
        .novel-analog-max .novel-analog-roll {
          opacity: 0.45;
          animation-duration: 1.6s;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(255,255,255,0.16) 42%,
            rgba(255,255,255,0.36) 50%,
            rgba(0,0,0,0.34) 56%,
            transparent 100%
          );
        }
        .novel-analog-max .novel-analog-vignette {
          background:
            radial-gradient(circle at 50% 48%, transparent 24%, rgba(0,0,0,0.72) 100%),
            linear-gradient(90deg, rgba(255,0,0,0.2), transparent 22%, transparent 78%, rgba(0,120,255,0.2)),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 9px);
        }
        .novel-analog-fog {
          animation: none;
          mix-blend-mode: screen;
        }
        .novel-analog-fog .novel-analog-vignette {
          background:
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), transparent 36%, rgba(0,0,0,0.36) 100%),
            linear-gradient(180deg, rgba(180,190,205,0.18), rgba(255,255,255,0.04) 42%, rgba(40,45,55,0.18));
        }
        .novel-analog-fog .novel-analog-grain {
          opacity: 0.34;
          background-image:
            radial-gradient(ellipse at 20% 45%, rgba(255,255,255,0.34), transparent 34%),
            radial-gradient(ellipse at 80% 55%, rgba(210,220,230,0.28), transparent 38%),
            radial-gradient(ellipse at 48% 72%, rgba(255,255,255,0.22), transparent 36%);
          background-size: 80% 70%, 90% 80%, 75% 65%;
          animation: novel-fog-drift 12s ease-in-out infinite;
        }
        .novel-analog-fog .novel-analog-scanlines { opacity: 0.04; }
        .novel-analog-fog .novel-analog-roll { opacity: 0.03; animation-duration: 9s; }
        .novel-analog-sepia {
          animation: none;
        }
        .novel-analog-sepia .novel-analog-vignette {
          background:
            radial-gradient(circle at 50% 46%, rgba(98,70,35,0.1), rgba(20,12,7,0.5) 100%),
            linear-gradient(180deg, rgba(170,120,55,0.24), rgba(80,42,20,0.2));
          mix-blend-mode: multiply;
        }
        .novel-analog-sepia .novel-analog-grain {
          opacity: 0.24;
          background-image:
            radial-gradient(circle at 12% 18%, rgba(255,235,180,0.44) 0 1px, transparent 1.2px),
            radial-gradient(circle at 72% 44%, rgba(80,45,20,0.44) 0 1px, transparent 1.2px),
            radial-gradient(circle at 42% 76%, rgba(255,210,130,0.24) 0 1px, transparent 1.3px);
          background-size: 13px 17px, 19px 23px, 11px 13px;
        }
        .novel-analog-sepia .novel-analog-scanlines { opacity: 0.08; }
        .novel-analog-sepia .novel-analog-roll { opacity: 0.04; animation-duration: 8s; }
        .novel-analog-red {
          animation: novel-red-pulse 3.8s ease-in-out infinite;
        }
        .novel-analog-red .novel-analog-vignette {
          background:
            radial-gradient(circle at 52% 48%, transparent 32%, rgba(0,0,0,0.62) 100%),
            radial-gradient(circle at 50% 58%, rgba(160,0,0,0.34), transparent 54%),
            linear-gradient(90deg, rgba(255,0,0,0.22), transparent 30%, transparent 70%, rgba(80,0,0,0.22));
        }
        .novel-analog-red .novel-analog-grain { opacity: 0.2; }
        .novel-analog-red .novel-analog-scanlines {
          opacity: 0.16;
          background: repeating-linear-gradient(to bottom, rgba(255,0,0,0.2) 0, rgba(255,0,0,0.2) 1px, transparent 1px, transparent 5px);
        }
        .novel-analog-red .novel-analog-roll { opacity: 0.1; animation-duration: 4.2s; }
        .novel-analog-dream {
          animation: novel-fog-drift 9s ease-in-out infinite;
          filter: saturate(1.35);
        }
        .novel-analog-dream .novel-analog-vignette {
          background:
            radial-gradient(circle at 50% 45%, rgba(255,255,255,0.08), transparent 36%, rgba(0,0,0,0.36) 100%),
            linear-gradient(120deg, rgba(255,60,150,0.13), transparent 38%, rgba(40,120,255,0.15));
        }
        .novel-analog-dream .novel-analog-grain {
          opacity: 0.2;
          background-image:
            radial-gradient(ellipse at 18% 28%, rgba(255,255,255,0.22), transparent 32%),
            radial-gradient(ellipse at 78% 62%, rgba(120,180,255,0.18), transparent 34%),
            radial-gradient(circle at 52% 50%, rgba(255,120,190,0.14), transparent 42%);
          background-size: 70% 60%, 78% 68%, 62% 62%;
          animation: novel-fog-drift 10s ease-in-out infinite reverse;
        }
        .novel-analog-dream .novel-analog-scanlines { opacity: 0.06; }
        .novel-analog-dream .novel-analog-roll { opacity: 0.08; animation-duration: 6s; }
      `}</style>
    </div>
  );
}
