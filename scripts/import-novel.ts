/**
 * ノベルエピソード汎用インポーター
 *
 * 使い方:
 *   npx tsx --env-file=.env.local scripts/import-novel.ts scripts/episodes/<name>.json
 *
 * JSONフォーマット (scripts/episodes/<name>.json):
 *   {
 *     "title_ja": "meltbook",
 *     "title_en": "meltbook",
 *     "description_ja": "...",
 *     "description_en": "...",
 *     "is_published": true,
 *     "sort_order": 10,
 *     "cover_image": "/abs/or/relative/path.png" (optional),
 *     "default_speaker_ja": "映子",
 *     "default_speaker_en": "Eiko",
 *     "default_bg": "/images/novel/bg/スマホ用 背景-1.png",
 *     "default_char": "/images/novel/char/eiko_talk_1.png",
 *     "default_char_pos": "center",
 *     "scenes": [
 *       {
 *         "text_ja": "...",
 *         "text_en": "...",           // optional
 *         "audio_path": "/abs/path/to/001.wav",
 *         "bg": "...",                // optional override
 *         "char": "...",              // optional override
 *         "char_pos": "center",       // optional
 *         "speaker_ja": "...",        // optional override
 *         "speaker_en": "...",
 *         "transition_effect": "fade" // fade | cut | slide (default fade)
 *       }
 *     ]
 *   }
 *
 * パス解決:
 *   - 絶対パス (/Users/... or http://...) はそのまま
 *   - bg / char / cover_image が /images/... で始まるものは public/ 配下として扱う
 *   - audio_path は絶対パスを推奨（相対の場合は creepy.hub/ 直下基準）
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, statSync } from "node:fs";
import { basename, extname, resolve, isAbsolute } from "node:path";

type SceneConfig = {
  text_ja: string;
  text_en?: string;
  audio_path: string;
  bg?: string;          // single bg (back-compat)
  bgs?: string[];       // multiple bgs (stacked in order, first = back)
  char?: string;
  char_pos?: "left" | "center" | "right";
  speaker_ja?: string;
  speaker_en?: string;
  transition_effect?: "fade" | "cut" | "slide";
  media?: string;       // centered contain image (displayed above bg/char layers)
};

type EpisodeConfig = {
  title_ja: string;
  title_en?: string;
  description_ja?: string;
  description_en?: string;
  is_published?: boolean;
  sort_order?: number;
  cover_image?: string;
  default_speaker_ja?: string;
  default_speaker_en?: string;
  default_bg?: string;
  default_bgs?: string[]; // fallback for all scenes
  default_char?: string;
  default_char_pos?: "left" | "center" | "right";
  scenes: SceneConfig[];
};

const BUCKET = "novel-media";
const PROJECT_ROOT = resolve(__dirname, "..");

function resolveAudioPath(p: string): string {
  return isAbsolute(p) ? p : resolve(PROJECT_ROOT, p);
}

function normalizeImagePath(p: string | undefined): string | undefined {
  if (!p) return undefined;
  // /images/... は public からのパスと見なしてそのまま保存（ブラウザで public/image/... として配信される）
  if (p.startsWith("/") && !existsSync(p)) return p;
  // http(s) もそのまま
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  // ローカル絶対 or 相対 → そのまま返す（アップロード対応は必要に応じて実装）
  return p;
}

function getWavDurationMs(filePath: string): number | null {
  try {
    const buf = readFileSync(filePath);
    if (buf.length < 44) return null;
    const riff = buf.toString("ascii", 0, 4);
    const wave = buf.toString("ascii", 8, 12);
    if (riff !== "RIFF" || wave !== "WAVE") return null;

    // fmt chunk の位置を探す
    let offset = 12;
    let sampleRate = 0;
    let numChannels = 0;
    let bitsPerSample = 0;
    let dataSize = 0;
    while (offset < buf.length - 8) {
      const chunkId = buf.toString("ascii", offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);
      if (chunkId === "fmt ") {
        numChannels = buf.readUInt16LE(offset + 10);
        sampleRate = buf.readUInt32LE(offset + 12);
        bitsPerSample = buf.readUInt16LE(offset + 22);
      } else if (chunkId === "data") {
        dataSize = chunkSize;
        break;
      }
      offset += 8 + chunkSize;
    }
    if (!sampleRate || !numChannels || !bitsPerSample || !dataSize) return null;
    const seconds = dataSize / (sampleRate * numChannels * (bitsPerSample / 8));
    return Math.round(seconds * 1000);
  } catch {
    return null;
  }
}

async function uploadAudio(
  supa: any,
  localPath: string,
): Promise<string> {
  if (!existsSync(localPath)) {
    throw new Error(`Audio file not found: ${localPath}`);
  }
  const buf = readFileSync(localPath);
  const ext = extname(localPath).replace(".", "").toLowerCase() || "wav";
  const name = `audio/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const contentType =
    ext === "mp3" ? "audio/mpeg" : ext === "wav" ? "audio/wav" : "application/octet-stream";

  const { error } = await supa.storage
    .from(BUCKET)
    .upload(name, buf, { cacheControl: "3600", upsert: false, contentType });
  if (error) throw new Error(`Upload failed for ${basename(localPath)}: ${error.message}`);

  const { data } = supa.storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("Usage: npx tsx --env-file=.env.local scripts/import-novel.ts <config.json>");
    process.exit(1);
  }
  const absConfig = isAbsolute(configPath) ? configPath : resolve(PROJECT_ROOT, configPath);
  if (!existsSync(absConfig)) {
    console.error(`Config not found: ${absConfig}`);
    process.exit(1);
  }

  const config: EpisodeConfig = JSON.parse(readFileSync(absConfig, "utf8"));
  if (!config.title_ja) throw new Error("config.title_ja is required");
  if (!Array.isArray(config.scenes) || config.scenes.length === 0) {
    throw new Error("config.scenes must be non-empty array");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in env");
  }
  const supa = createClient(url, serviceRole);

  // Ensure bucket exists
  const { data: buckets } = await supa.storage.listBuckets();
  const hasBucket = (buckets ?? []).some((b) => b.name === BUCKET);
  if (!hasBucket) {
    console.log(`🪣 Creating bucket "${BUCKET}" (public)...`);
    const { error: bucketErr } = await supa.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 20 * 1024 * 1024,
    });
    if (bucketErr) throw new Error(`Bucket create failed: ${bucketErr.message}`);
    console.log(`  ✓ created`);
  }

  // Pre-check audio files
  console.log(`📂 Audio pre-check (${config.scenes.length} files)...`);
  for (const s of config.scenes) {
    const p = resolveAudioPath(s.audio_path);
    if (!existsSync(p)) throw new Error(`Missing audio: ${p}`);
    const size = statSync(p).size;
    console.log(`  ✓ ${basename(p)} (${(size / 1024).toFixed(1)} KB)`);
  }

  // Upload audio files
  console.log(`\n⬆️  Uploading audio to Supabase Storage (${BUCKET})...`);
  const audioUrls: string[] = [];
  const audioDurations: (number | null)[] = [];
  for (const s of config.scenes) {
    const local = resolveAudioPath(s.audio_path);
    const url = await uploadAudio(supa, local);
    const dur = getWavDurationMs(local);
    audioUrls.push(url);
    audioDurations.push(dur);
    console.log(`  ✓ ${basename(local)} → ${url.slice(0, 72)}... (${dur ?? "?"} ms)`);
  }

  // Insert episode
  console.log(`\n📝 Creating episode...`);
  const { data: episodeRow, error: epErr } = await supa
    .from("novel_episodes")
    .insert({
      title_ja: config.title_ja,
      title_en: config.title_en ?? null,
      description_ja: config.description_ja ?? null,
      description_en: config.description_en ?? null,
      cover_image_url: normalizeImagePath(config.cover_image) ?? null,
      is_published: config.is_published ?? false,
      sort_order: config.sort_order ?? 0,
    })
    .select("id")
    .single();
  if (epErr) throw new Error(`Episode insert failed: ${epErr.message}`);
  const episodeId = (episodeRow as any).id as string;
  console.log(`  ✓ episode_id = ${episodeId}`);

  // Insert scenes
  console.log(`\n🎬 Inserting scenes...`);
  const rows = config.scenes.map((s, i) => {
    // bgs (array) has priority over single bg. Fallback to default_bgs then default_bg.
    const bgList = s.bgs ?? (s.bg ? [s.bg] : undefined) ?? config.default_bgs ?? (config.default_bg ? [config.default_bg] : []);
    const char = normalizeImagePath(s.char ?? config.default_char);
    const layers: any[] = [];
    for (const b of bgList) {
      const n = normalizeImagePath(b);
      if (n) layers.push({ type: "bg", image_url: n });
    }
    if (char) {
      layers.push({
        type: "char",
        image_url: char,
        position: s.char_pos ?? config.default_char_pos ?? "center",
      });
    }
    const media = normalizeImagePath(s.media);
    if (media) {
      layers.push({ type: "media", image_url: media });
    }
    return {
      episode_id: episodeId,
      scene_order: i,
      layers,
      text_ja: s.text_ja,
      text_en: s.text_en ?? null,
      speaker_name_ja: s.speaker_ja ?? config.default_speaker_ja ?? null,
      speaker_name_en: s.speaker_en ?? config.default_speaker_en ?? null,
      audio_url: audioUrls[i],
      audio_duration_ms: audioDurations[i],
      transition_effect: s.transition_effect ?? "fade",
    };
  });

  const { error: scenesErr } = await supa.from("novel_scenes").insert(rows);
  if (scenesErr) throw new Error(`Scenes insert failed: ${scenesErr.message}`);
  console.log(`  ✓ ${rows.length} scenes inserted`);

  console.log(`\n✅ Done. Episode ID: ${episodeId}`);
  console.log(`   View: /ja/novel/${episodeId}`);
  console.log(`   Admin: /ja/admin/novel (edit or toggle publish)`);
}

main().catch((e) => {
  console.error("\n❌", e.message ?? e);
  process.exit(1);
});
