"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getIsAdmin } from "@/lib/auth";
import { uploadNovelImage, uploadNovelAudio } from "@/lib/uploadNovelMedia";
import BackButton from "@/components/BackButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

type AccessTier = "free" | "premium" | "members_only";
type RequiredMembership = "any" | "youtube" | "apple_iap" | "google_play" | "stripe" | null;

type Episode = {
  id: string;
  title_ja: string;
  title_en: string | null;
  description_ja: string | null;
  description_en: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  access_tier?: AccessTier;
  required_membership?: RequiredMembership;
  premium_unlock_note_ja?: string | null;
  premium_unlock_note_en?: string | null;
  preview_scene_count?: number;
};

type Layer = {
  type: "bg" | "char";
  image_url: string;
  position?: "left" | "center" | "right";
};

type Scene = {
  id: string;
  episode_id: string;
  scene_order: number;
  layers: Layer[];
  text_ja: string;
  text_en: string | null;
  speaker_name_ja: string | null;
  speaker_name_en: string | null;
  audio_url: string | null;
  audio_duration_ms: number | null;
  transition_effect: "fade" | "cut" | "slide";
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function NovelAdminPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;
  const t = dict.novelAdmin;
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    (async () => {
      const isAdmin = await getIsAdmin();
      if (!isAdmin) {
        router.replace(`/${locale}`);
        return;
      }
      setChecking(false);
      loadEpisodes();
    })();
  }, [locale, router]);

  const loadEpisodes = useCallback(async () => {
    const { data } = await supabase
      .from("novel_episodes")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setEpisodes(data);
  }, []);

  const loadScenes = useCallback(async (episodeId: string) => {
    const { data } = await supabase
      .from("novel_scenes")
      .select("*")
      .eq("episode_id", episodeId)
      .order("scene_order", { ascending: true });
    if (data) {
      setScenes(
        data.map((s: Record<string, unknown>) => ({
          ...s,
          layers: Array.isArray(s.layers) ? s.layers : [],
        })) as Scene[]
      );
    }
  }, []);

  const createEpisode = async () => {
    if (!newTitle.trim()) return;
    const { data, error } = await supabase
      .from("novel_episodes")
      .insert({ title_ja: newTitle.trim(), sort_order: episodes.length })
      .select()
      .single();
    if (data && !error) {
      setNewTitle("");
      await loadEpisodes();
      setEditingEpisode(data);
      setScenes([]);
    }
  };

  const updateEpisode = async (updates: Partial<Episode>) => {
    if (!editingEpisode) return;
    setSaveStatus("saving");
    const { error } = await supabase
      .from("novel_episodes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", editingEpisode.id);
    if (error) {
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setEditingEpisode({ ...editingEpisode, ...updates });
      await loadEpisodes();
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const deleteEpisode = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    await supabase.from("novel_episodes").delete().eq("id", id);
    setEditingEpisode(null);
    setScenes([]);
    await loadEpisodes();
  };

  const togglePublish = async (ep: Episode) => {
    await supabase
      .from("novel_episodes")
      .update({ is_published: !ep.is_published, updated_at: new Date().toISOString() })
      .eq("id", ep.id);
    if (editingEpisode?.id === ep.id) {
      setEditingEpisode({ ...editingEpisode, is_published: !ep.is_published });
    }
    await loadEpisodes();
  };

  // --- Scene management ---

  const addScene = async () => {
    if (!editingEpisode) return;
    const nextOrder = scenes.length > 0 ? Math.max(...scenes.map((s) => s.scene_order)) + 1 : 0;
    const { error } = await supabase.from("novel_scenes").insert({
      episode_id: editingEpisode.id,
      scene_order: nextOrder,
      layers: [],
      text_ja: "",
      transition_effect: "fade",
    });
    if (!error) await loadScenes(editingEpisode.id);
  };

  const updateScene = async (sceneId: string, updates: Partial<Scene>) => {
    setSaveStatus("saving");
    const { error } = await supabase
      .from("novel_scenes")
      .update(updates)
      .eq("id", sceneId);
    if (error) {
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, ...updates } : s)));
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const deleteScene = async (sceneId: string) => {
    if (!confirm(t.confirmDelete)) return;
    if (!editingEpisode) return;
    await supabase.from("novel_scenes").delete().eq("id", sceneId);
    await loadScenes(editingEpisode.id);
  };

  const moveScene = async (sceneId: string, direction: "up" | "down") => {
    if (!editingEpisode) return;
    const idx = scenes.findIndex((s) => s.id === sceneId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= scenes.length) return;
    const updates = [
      { id: scenes[idx].id, scene_order: scenes[swapIdx].scene_order },
      { id: scenes[swapIdx].id, scene_order: scenes[idx].scene_order },
    ];
    for (const u of updates) {
      await supabase.from("novel_scenes").update({ scene_order: u.scene_order }).eq("id", u.id);
    }
    await loadScenes(editingEpisode.id);
  };

  // --- Layer management ---

  const updateLayers = async (sceneId: string, newLayers: Layer[]) => {
    await updateScene(sceneId, { layers: newLayers } as Partial<Scene>);
  };

  const addLayer = async (sceneId: string, layers: Layer[], type: "bg" | "char") => {
    // Placeholder — image will be uploaded separately
    // For now, just add an empty entry that gets filled by upload
    // We don't add empty layers; the upload handler adds them
  };

  const handleLayerImageUpload = async (sceneId: string, layers: Layer[], layerIndex: number, file: File) => {
    try {
      const url = await uploadNovelImage(file);
      const newLayers = [...layers];
      newLayers[layerIndex] = { ...newLayers[layerIndex], image_url: url };
      await updateLayers(sceneId, newLayers);
    } catch (e) {
      alert(e instanceof Error ? e.message : "アップロードに失敗しました");
    }
  };

  const addNewLayerWithUpload = async (sceneId: string, layers: Layer[], type: "bg" | "char", file: File) => {
    try {
      const url = await uploadNovelImage(file);
      const newLayer: Layer = { type, image_url: url };
      if (type === "char") newLayer.position = "center";
      const newLayers = [...layers, newLayer];
      await updateLayers(sceneId, newLayers);
    } catch (e) {
      alert(e instanceof Error ? e.message : "アップロードに失敗しました");
    }
  };

  const removeLayer = async (sceneId: string, layers: Layer[], layerIndex: number) => {
    const newLayers = layers.filter((_, i) => i !== layerIndex);
    await updateLayers(sceneId, newLayers);
  };

  const moveLayer = async (sceneId: string, layers: Layer[], layerIndex: number, direction: "up" | "down") => {
    const swapIdx = direction === "up" ? layerIndex - 1 : layerIndex + 1;
    if (swapIdx < 0 || swapIdx >= layers.length) return;
    const newLayers = [...layers];
    [newLayers[layerIndex], newLayers[swapIdx]] = [newLayers[swapIdx], newLayers[layerIndex]];
    await updateLayers(sceneId, newLayers);
  };

  const updateLayerType = async (sceneId: string, layers: Layer[], layerIndex: number, newType: "bg" | "char") => {
    const newLayers = [...layers];
    newLayers[layerIndex] = { ...newLayers[layerIndex], type: newType };
    if (newType === "char" && !newLayers[layerIndex].position) {
      newLayers[layerIndex].position = "center";
    }
    await updateLayers(sceneId, newLayers);
  };

  const updateLayerPosition = async (sceneId: string, layers: Layer[], layerIndex: number, pos: "left" | "center" | "right") => {
    const newLayers = [...layers];
    newLayers[layerIndex] = { ...newLayers[layerIndex], position: pos };
    await updateLayers(sceneId, newLayers);
  };

  const handleCoverUpload = async (file: File) => {
    try {
      const url = await uploadNovelImage(file);
      await updateEpisode({ cover_image_url: url } as Partial<Episode>);
    } catch (e) {
      alert(e instanceof Error ? e.message : "アップロードに失敗しました");
    }
  };

  const handleAudioUpload = async (sceneId: string, file: File) => {
    try {
      const url = await uploadNovelAudio(file);
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      await new Promise<void>((resolve) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => resolve();
      });
      const durationMs = Math.round(audio.duration * 1000) || null;
      URL.revokeObjectURL(audio.src);
      await updateScene(sceneId, { audio_url: url, audio_duration_ms: durationMs });
    } catch (e) {
      alert(e instanceof Error ? e.message : "アップロードに失敗しました");
    }
  };

  if (checking) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  // ========== EPISODE EDIT VIEW ==========
  if (editingEpisode) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px" }}>
        <button
          onClick={() => { setEditingEpisode(null); setScenes([]); }}
          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", marginBottom: 16, fontSize: 14 }}
        >
          &larr; {t.backToList}
        </button>

        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{t.editEpisode}</h1>

        {saveStatus === "saving" && <p style={{ color: "var(--muted)" }}>{t.saving}</p>}
        {saveStatus === "saved" && <p style={{ color: "#22c55e" }}>{t.saved}</p>}

        {/* Episode metadata */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <label>
            {t.episodeTitle}（日本語）
            <input type="text" defaultValue={editingEpisode.title_ja} onBlur={(e) => updateEpisode({ title_ja: e.target.value })} style={inputStyle} />
          </label>
          <label>
            {t.episodeTitle}（English）
            <input type="text" defaultValue={editingEpisode.title_en ?? ""} onBlur={(e) => updateEpisode({ title_en: e.target.value || null })} style={inputStyle} />
          </label>
          <label>
            {t.description}（日本語）
            <textarea defaultValue={editingEpisode.description_ja ?? ""} onBlur={(e) => updateEpisode({ description_ja: e.target.value || null })} style={{ ...inputStyle, minHeight: 60 }} />
          </label>
          <label>
            {t.coverImage}
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} style={{ display: "block", marginTop: 4 }} />
            {editingEpisode.cover_image_url && (
              <img src={editingEpisode.cover_image_url} alt="cover" style={{ width: 120, height: 80, objectFit: "cover", marginTop: 4, borderRadius: 6 }} />
            )}
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => togglePublish(editingEpisode)} style={btnStyle(editingEpisode.is_published ? "#f59e0b" : "#22c55e")}>
              {editingEpisode.is_published ? t.unpublish : t.publish}
            </button>
            <button onClick={() => deleteEpisode(editingEpisode.id)} style={btnStyle("#ef4444")}>
              {t.deleteEpisode}
            </button>
          </div>

          {/* === 課金設定（箱）=== */}
          <div
            style={{
              marginTop: 8,
              padding: 14,
              border: "1px solid rgba(255, 200, 80, 0.35)",
              borderRadius: 8,
              background: "rgba(40, 20, 10, 0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, letterSpacing: 2, color: "rgba(255, 210, 130, 0.9)" }}>
              {locale === "en" ? "Access / Membership" : "課金・メンバーシップ設定"}
            </div>
            <label style={{ fontSize: 12 }}>
              {locale === "en" ? "Access tier" : "公開範囲"}
              <select
                value={editingEpisode.access_tier ?? "free"}
                onChange={(e) => updateEpisode({ access_tier: e.target.value as AccessTier })}
                style={inputStyle}
              >
                <option value="free">{locale === "en" ? "Free (everyone)" : "無料（全員）"}</option>
                <option value="premium">{locale === "en" ? "Premium" : "有料メンバー"}</option>
                <option value="members_only">{locale === "en" ? "Members only (YouTube/IAP)" : "メンバー限定（YouTube/IAP）"}</option>
              </select>
            </label>
            <label style={{ fontSize: 12 }}>
              {locale === "en" ? "Required membership" : "解錠メンバーシップ"}
              <select
                value={editingEpisode.required_membership ?? ""}
                onChange={(e) =>
                  updateEpisode({
                    required_membership: (e.target.value || null) as RequiredMembership,
                  })
                }
                style={inputStyle}
              >
                <option value="">—</option>
                <option value="any">{locale === "en" ? "Any platform" : "いずれか（any）"}</option>
                <option value="youtube">YouTube Membership</option>
                <option value="apple_iap">Apple IAP</option>
                <option value="google_play">Google Play</option>
                <option value="stripe">Stripe</option>
              </select>
            </label>
            <label style={{ fontSize: 12 }}>
              {locale === "en" ? "Preview scene count" : "プレビュー公開シーン数"}
              <input
                type="number"
                min={0}
                defaultValue={editingEpisode.preview_scene_count ?? 0}
                onBlur={(e) => {
                  const v = Math.max(0, Number(e.target.value) || 0);
                  updateEpisode({ preview_scene_count: v });
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              {locale === "en" ? "Unlock note (JA)" : "ロック画面の案内文（日本語）"}
              <textarea
                defaultValue={editingEpisode.premium_unlock_note_ja ?? ""}
                onBlur={(e) => updateEpisode({ premium_unlock_note_ja: e.target.value || null })}
                placeholder={locale === "en" ? "Shown on the locked screen (JA)" : "ロック画面に表示（例: YouTubeメンバー限定です）"}
                style={{ ...inputStyle, minHeight: 50 }}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              {locale === "en" ? "Unlock note (EN)" : "ロック画面の案内文（English）"}
              <textarea
                defaultValue={editingEpisode.premium_unlock_note_en ?? ""}
                onBlur={(e) => updateEpisode({ premium_unlock_note_en: e.target.value || null })}
                placeholder="Shown on the locked screen (EN)"
                style={{ ...inputStyle, minHeight: 50 }}
              />
            </label>
          </div>
        </div>

        {/* Scenes */}
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          {dict.novel.scenes}（{scenes.length}）
        </h2>

        {scenes.length === 0 && <p style={{ color: "var(--muted)" }}>{t.noScenes}</p>}

        {scenes.map((scene, idx) => {
          const layers = scene.layers ?? [];
          return (
            <div
              key={scene.id}
              style={{ border: "1px solid var(--border, #333)", borderRadius: 8, padding: 16, marginBottom: 16, background: "var(--card-bg, #1a1a1a)" }}
            >
              {/* Scene header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <strong>Scene {idx + 1}</strong>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => moveScene(scene.id, "up")} disabled={idx === 0} style={smallBtnStyle}>{t.moveUp}</button>
                  <button onClick={() => moveScene(scene.id, "down")} disabled={idx === scenes.length - 1} style={smallBtnStyle}>{t.moveDown}</button>
                  <button onClick={() => deleteScene(scene.id)} style={{ ...smallBtnStyle, color: "#ef4444" }}>{t.deleteScene}</button>
                </div>
              </div>

              {/* Layers */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Layers（{layers.length}）— 上から順に重なります
                </div>
                {layers.map((layer, li) => (
                  <div
                    key={li}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                      border: "1px solid var(--border, #444)", borderRadius: 6, marginBottom: 6,
                      background: layer.type === "char" ? "rgba(198,40,40,0.08)" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    {/* Thumbnail */}
                    <img
                      src={layer.image_url}
                      alt=""
                      style={{
                        width: 48, height: 64, objectFit: layer.type === "char" ? "contain" : "cover",
                        borderRadius: 4, flexShrink: 0,
                        background: layer.type === "char" ? "rgba(255,255,255,0.06)" : "transparent",
                      }}
                    />

                    {/* Controls */}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select
                          value={layer.type}
                          onChange={(e) => updateLayerType(scene.id, layers, li, e.target.value as "bg" | "char")}
                          style={{ ...inputStyle, width: "auto", marginTop: 0, padding: "2px 6px", fontSize: 12 }}
                        >
                          <option value="bg">背景</option>
                          <option value="char">キャラ</option>
                        </select>
                        {layer.type === "char" && (
                          <select
                            value={layer.position ?? "center"}
                            onChange={(e) => updateLayerPosition(scene.id, layers, li, e.target.value as "left" | "center" | "right")}
                            style={{ ...inputStyle, width: "auto", marginTop: 0, padding: "2px 6px", fontSize: 12 }}
                          >
                            <option value="left">{t.left}</option>
                            <option value="center">{t.center}</option>
                            <option value="right">{t.right}</option>
                          </select>
                        )}
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>z:{li}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => moveLayer(scene.id, layers, li, "up")} disabled={li === 0} style={tinyBtnStyle}>&#9650;</button>
                        <button onClick={() => moveLayer(scene.id, layers, li, "down")} disabled={li === layers.length - 1} style={tinyBtnStyle}>&#9660;</button>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLayerImageUpload(scene.id, layers, li, f); }}
                          style={{ fontSize: 11, width: 120 }}
                        />
                        <button onClick={() => removeLayer(scene.id, layers, li)} style={{ ...tinyBtnStyle, color: "#ef4444" }}>&#10005;</button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add layer buttons */}
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <label style={{ ...smallBtnStyle, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    + 背景レイヤー
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) addNewLayerWithUpload(scene.id, layers, "bg", f); e.target.value = ""; }}
                    />
                  </label>
                  <label style={{ ...smallBtnStyle, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    + キャラレイヤー
                    <input
                      type="file"
                      accept="image/png"
                      style={{ display: "none" }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) addNewLayerWithUpload(scene.id, layers, "char", f); e.target.value = ""; }}
                    />
                  </label>
                </div>
              </div>

              {/* Text & Audio */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label>
                  {t.speakerName}（日本語）
                  <input type="text" defaultValue={scene.speaker_name_ja ?? ""} onBlur={(e) => updateScene(scene.id, { speaker_name_ja: e.target.value || null })} style={inputStyle} />
                </label>
                <label>
                  {t.dialogueText}（日本語）
                  <textarea defaultValue={scene.text_ja} onBlur={(e) => updateScene(scene.id, { text_ja: e.target.value })} style={{ ...inputStyle, minHeight: 80 }} />
                </label>
                <label>
                  {t.dialogueText}（English）
                  <textarea defaultValue={scene.text_en ?? ""} onBlur={(e) => updateScene(scene.id, { text_en: e.target.value || null })} style={{ ...inputStyle, minHeight: 80 }} />
                </label>
                <label>
                  {t.audioFile}
                  <input type="file" accept="audio/mpeg,audio/mp3" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioUpload(scene.id, f); }} style={{ display: "block", marginTop: 4 }} />
                  {scene.audio_url && (
                    <div style={{ marginTop: 4 }}>
                      <button onClick={() => setAudioPreviewUrl(audioPreviewUrl === scene.audio_url ? null : scene.audio_url)} style={smallBtnStyle}>{t.previewAudio}</button>
                      {audioPreviewUrl === scene.audio_url && (
                        <audio src={scene.audio_url} controls autoPlay style={{ display: "block", marginTop: 4, width: "100%" }} />
                      )}
                    </div>
                  )}
                </label>
                <label>
                  Transition
                  <select value={scene.transition_effect} onChange={(e) => updateScene(scene.id, { transition_effect: e.target.value as Scene["transition_effect"] })} style={inputStyle}>
                    <option value="fade">Fade</option>
                    <option value="cut">Cut</option>
                    <option value="slide">Slide</option>
                  </select>
                </label>
              </div>
            </div>
          );
        })}

        <button onClick={addScene} style={btnStyle("#3b82f6")}>+ {t.addScene}</button>
      </div>
    );
  }

  // ========== EPISODE LIST VIEW ==========
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px" }}>
      <BackButton />
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t.title}</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          placeholder={`${t.episodeTitle}（日本語）`}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createEpisode()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={createEpisode} style={btnStyle("#3b82f6")}>{t.createEpisode}</button>
      </div>

      {episodes.length === 0 && (
        <p style={{ color: "var(--muted)", textAlign: "center" }}>{dict.novel.noEpisodes}</p>
      )}

      {episodes.map((ep) => (
        <div
          key={ep.id}
          style={{
            border: "1px solid var(--border, #333)", borderRadius: 8, padding: 16, marginBottom: 12,
            display: "flex", alignItems: "center", gap: 12, background: "var(--card-bg, #1a1a1a)",
          }}
        >
          {ep.cover_image_url && (
            <img src={ep.cover_image_url} alt="" style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ep.title_ja}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {ep.is_published ? "公開中" : "非公開"} | {new Date(ep.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ja-JP")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={() => { setEditingEpisode(ep); loadScenes(ep.id); }} style={smallBtnStyle}>{t.editEpisode}</button>
            <button onClick={() => togglePublish(ep)} style={smallBtnStyle}>{ep.is_published ? t.unpublish : t.publish}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border, #333)",
  background: "var(--input-bg, #111)",
  color: "inherit",
  fontSize: 14,
  marginTop: 4,
};

const btnStyle = (bg: string): React.CSSProperties => ({
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  background: bg,
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  whiteSpace: "nowrap",
});

const smallBtnStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 4,
  border: "1px solid var(--border, #333)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  fontSize: 12,
};

const tinyBtnStyle: React.CSSProperties = {
  padding: "2px 6px",
  borderRadius: 3,
  border: "1px solid var(--border, #444)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  fontSize: 11,
  lineHeight: 1,
};
