"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/auth";
import { uploadImage } from "@/lib/uploadImage";

type PostCommentsLabels = {
  comment?: string;
  commentSubtitle?: string;
  commentWritePlaceholder?: string;
  commentLoginRequired?: string;
  commentPosting?: string;
  commentSubmit?: string;
  commentLoading?: string;
  noComments?: string;
  reply?: string;
  replyPlaceholder?: string;
  cancel?: string;
  replyPosting?: string;
  replySubmit?: string;
};

type PostCommentsProps = {
  postId: number;
  locale?: string;
  labels?: PostCommentsLabels;
};

type ProfileRow = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CommentRow = {
  id: number;
  post_id: number;
  user_id: string;
  parent_id: number | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  author: ProfileRow[] | ProfileRow | null;
};

type SessionUser = {
  id: string;
  email?: string | null;
};

type ImageSlotState = {
  file: File | null;
  preview: string | null;
};

const emptyImageSlots = (): ImageSlotState[] => [
  { file: null, preview: null },
  { file: null, preview: null },
  { file: null, preview: null },
];

export default function PostComments({ postId, locale = "ja", labels }: PostCommentsProps) {
  const t = {
    comment: labels?.comment ?? "コメント",
    commentSubtitle: labels?.commentSubtitle ?? "投稿について感想や考察を書けます。",
    commentWritePlaceholder: labels?.commentWritePlaceholder ?? "コメントを書く...",
    commentLoginRequired: labels?.commentLoginRequired ?? "コメントするにはログインが必要です",
    commentPosting: labels?.commentPosting ?? "投稿中...",
    commentSubmit: labels?.commentSubmit ?? "コメントする",
    commentLoading: labels?.commentLoading ?? "コメントを読み込み中...",
    noComments: labels?.noComments ?? "まだコメントはありません。",
    reply: labels?.reply ?? "返信",
    replyPlaceholder: labels?.replyPlaceholder ?? "返信を書く...",
    cancel: labels?.cancel ?? "キャンセル",
    replyPosting: labels?.replyPosting ?? "返信中...",
    replySubmit: labels?.replySubmit ?? "返信する",
  };
  const isEn = locale === "en";
  const dateLocale = isEn ? "en-US" : "ja-JP";
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [content, setContent] = useState("");
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  // コメント用画像
  const [commentImages, setCommentImages] = useState<ImageSlotState[]>(emptyImageSlots());

  // 返信用
  const [replyOpenId, setReplyOpenId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);
  const [replyImages, setReplyImages] = useState<ImageSlotState[]>(emptyImageSlots());

  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reportingId, setReportingId] = useState<number | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menu on outside click
  useEffect(() => {
    if (menuOpenId === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpenId]);

  const loadComments = async () => {
    setLoading(true);

    // image_url カラムがまだ追加されていない場合に備え、フォールバック
    let { data, error } = await supabase
      .from("post_comments")
      .select(
        `
        id,
        post_id,
        user_id,
        parent_id,
        content,
        is_deleted,
        created_at,
        updated_at,
        image_url,
        image_url_2,
        image_url_3,
        author:profiles (
          username,
          display_name,
          avatar_url
        )
      `
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      // image カラムが存在しない場合、カラムなしで再取得
      const fallback = await supabase
        .from("post_comments")
        .select(
          `
          id,
          post_id,
          user_id,
          parent_id,
          content,
          is_deleted,
          created_at,
          updated_at,
          author:profiles (
            username,
            display_name,
            avatar_url
          )
        `
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (fallback.error) {
        console.error("comment load error:", fallback.error);
        setComments([]);
        setLoading(false);
        return;
      }
      data = fallback.data as typeof data;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setComments(
      ((data ?? []) as any[]).map((c) => ({
        ...c,
        image_url: c.image_url ?? null,
        image_url_2: c.image_url_2 ?? null,
        image_url_3: c.image_url_3 ?? null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email,
        });
      } else {
        setCurrentUser(null);
      }

      await loadComments();
    };

    init();
  }, [postId]);

  const rootComments = useMemo(
    () => comments.filter((comment) => comment.parent_id === null && !comment.is_deleted),
    [comments]
  );

  const getReplies = (commentId: number) =>
    comments.filter((comment) => comment.parent_id === commentId && !comment.is_deleted);

  const getAuthor = (author: CommentRow["author"]) => {
    if (!author) return null;
    if (Array.isArray(author)) return author[0] ?? null;
    return author;
  };

  const uploadCommentImages = async (
    slots: ImageSlotState[],
    userId: string
  ): Promise<{ image_url: string | null; image_url_2: string | null; image_url_3: string | null }> => {
    const [url1, url2, url3] = await Promise.all([
      uploadImage(slots[0].file, userId, `comment-${Date.now()}-1`),
      uploadImage(slots[1].file, userId, `comment-${Date.now()}-2`),
      uploadImage(slots[2].file, userId, `comment-${Date.now()}-3`),
    ]);
    return { image_url: url1, image_url_2: url2, image_url_3: url3 };
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      alert(t.commentLoginRequired);
      return;
    }

    if (!content.trim()) {
      alert(t.commentWritePlaceholder);
      return;
    }

    setPosting(true);

    try {
      const images = await uploadCommentImages(commentImages, currentUser.id).catch((err) => {
        alert(isEn ? `Image upload failed: ${err.message}` : `画像アップロードに失敗しました: ${err.message}`);
        throw err;
      });

      const { error } = await supabase.from("post_comments").insert([
        {
          post_id: postId,
          user_id: currentUser.id,
          parent_id: null,
          content: content.trim(),
          ...images,
        },
      ]);

      if (error) {
        alert(`${t.commentSubmit}: ${error.message}`);
        return;
      }

      setContent("");
      setCommentImages(emptyImageSlots());
      await loadComments();
    } catch {
      // already alerted
    } finally {
      setPosting(false);
    }
  };

  const handleReplyPost = async (parentId: number) => {
    if (!currentUser) {
      alert(t.commentLoginRequired);
      return;
    }

    if (!replyContent.trim()) {
      alert(t.replyPlaceholder);
      return;
    }

    setReplyPosting(true);

    try {
      const images = await uploadCommentImages(replyImages, currentUser.id).catch((err) => {
        alert(isEn ? `Image upload failed: ${err.message}` : `画像アップロードに失敗しました: ${err.message}`);
        throw err;
      });

      const { error } = await supabase.from("post_comments").insert([
        {
          post_id: postId,
          user_id: currentUser.id,
          parent_id: parentId,
          content: replyContent.trim(),
          ...images,
        },
      ]);

      if (error) {
        alert(`${t.replySubmit}: ${error.message}`);
        return;
      }

      setReplyContent("");
      setReplyImages(emptyImageSlots());
      setReplyOpenId(null);
      await loadComments();
    } catch {
      // already alerted
    } finally {
      setReplyPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm(isEn ? "Delete this comment?" : "このコメントを削除しますか？")) return;
    setDeletingId(commentId);
    setMenuOpenId(null);
    try {
      const { error } = await supabase
        .from("post_comments")
        .update({ is_deleted: true })
        .eq("id", commentId)
        .eq("user_id", currentUser!.id);

      if (error) {
        alert(isEn ? "Failed to delete" : "削除に失敗しました");
        return;
      }
      await loadComments();
    } finally {
      setDeletingId(null);
    }
  };

  const handleReportComment = async (commentId: number) => {
    if (!currentUser) {
      alert(isEn ? "Login required to report" : "報告にはログインが必要です");
      return;
    }
    setReportingId(commentId);
    setMenuOpenId(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        alert(isEn ? "Login required to report" : "報告にはログインが必要です");
        return;
      }
      const res = await fetch(`/api/comment/${commentId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (res.status === 409) {
        setReportedIds((prev) => new Set(prev).add(commentId));
        return;
      }
      if (!res.ok) {
        alert(isEn ? "Failed to report" : "報告に失敗しました");
        return;
      }
      setReportedIds((prev) => new Set(prev).add(commentId));
    } finally {
      setReportingId(null);
    }
  };

  const renderMenu = (commentId: number, commentUserId: string) => {
    const isOwn = currentUser?.id === commentUserId;
    const isReported = reportedIds.has(commentId);
    const isDeleting = deletingId === commentId;
    const isReporting = reportingId === commentId;

    return (
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setMenuOpenId((prev) => (prev === commentId ? null : commentId))}
          style={menuTriggerStyle}
          aria-label="menu"
        >
          ⋮
        </button>

        {menuOpenId === commentId && (
          <div ref={menuRef} style={menuDropdownStyle}>
            {isOwn ? (
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteComment(commentId)}
                style={menuItemDangerStyle}
              >
                {isDeleting
                  ? (isEn ? "Deleting..." : "削除中...")
                  : (isEn ? "Delete" : "削除")}
              </button>
            ) : (
              <button
                type="button"
                disabled={isReporting || isReported}
                onClick={() => handleReportComment(commentId)}
                style={menuItemStyle}
              >
                {isReported
                  ? (isEn ? "Reported" : "報告済み")
                  : isReporting
                    ? (isEn ? "Reporting..." : "送信中...")
                    : (isEn ? "Report" : "報告する")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // 画像表示
  const renderCommentImages = (comment: CommentRow) => {
    const urls = [comment.image_url, comment.image_url_2, comment.image_url_3].filter(Boolean) as string[];
    if (urls.length === 0) return null;
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {urls.map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(161,102,108,0.2)" }}
          />
        ))}
      </div>
    );
  };

  // 画像スロットUI
  const renderImageSlots = (slots: ImageSlotState[], setSlots: React.Dispatch<React.SetStateAction<ImageSlotState[]>>) => {
    const slotLabels = isEn ? ["Image 1", "Image 2", "Image 3"] : ["画像1", "画像2", "画像3"];
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {slots.map((slot, idx) => (
          <div key={idx} style={imageSlotStyle}>
            {(slot.file || slot.preview) ? (
              <div style={{ position: "relative" }}>
                <img
                  src={slot.file ? URL.createObjectURL(slot.file) : slot.preview!}
                  alt={slotLabels[idx]}
                  style={imagePreviewStyle}
                />
                <button
                  type="button"
                  style={imageRemoveBtn}
                  onClick={() => {
                    setSlots((prev) => {
                      const next = [...prev];
                      next[idx] = { file: null, preview: null };
                      return next;
                    });
                  }}
                  title={isEn ? "Remove image" : "画像を削除"}
                >
                  &times;
                </button>
              </div>
            ) : (
              <label style={imageAddLabel}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
                <span style={{ fontSize: 10 }}>{slotLabels[idx]}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f) {
                      setSlots((prev) => {
                        const next = [...prev];
                        next[idx] = { file: f, preview: URL.createObjectURL(f) };
                        return next;
                      });
                    }
                  }}
                />
              </label>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 返信フォーム
  const renderReplyForm = (parentId: number) => {
    if (replyOpenId !== parentId) return null;
    return (
      <div style={{ marginTop: 14 }}>
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder={currentUser ? t.replyPlaceholder : t.commentLoginRequired}
          disabled={!currentUser || replyPosting}
          style={textareaStyle}
        />

        {renderImageSlots(replyImages, setReplyImages)}

        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              setReplyOpenId(null);
              setReplyContent("");
              setReplyImages(emptyImageSlots());
            }}
            style={cancelBtnStyle}
          >
            {t.cancel}
          </button>

          <button
            type="button"
            disabled={!currentUser || replyPosting}
            onClick={() => handleReplyPost(parentId)}
            style={{
              ...submitBtnStyle,
              cursor: !currentUser || replyPosting ? "not-allowed" : "pointer",
              opacity: !currentUser || replyPosting ? 0.7 : 1,
            }}
          >
            {replyPosting ? t.replyPosting : t.replySubmit}
          </button>
        </div>
      </div>
    );
  };

  // 返信ボタン
  const renderReplyButton = (commentId: number) => (
    <button
      type="button"
      onClick={() => {
        setReplyOpenId((prev) => (prev === commentId ? null : commentId));
        setReplyContent("");
        setReplyImages(emptyImageSlots());
      }}
      style={replyBtnStyle}
    >
      {t.reply}
    </button>
  );

  // コメント1件の表示（ルート・返信共通）
  const renderComment = (comment: CommentRow, isReply: boolean) => {
    const author = getAuthor(comment.author);
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          <div style={{ color: "#f5f1eb", fontWeight: 700 }}>
            @{author?.username ?? "unknown"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ color: "#8a7870", fontSize: isReply ? "12px" : "13px", whiteSpace: "nowrap" }}>
              {new Date(comment.created_at).toLocaleString(dateLocale)}
            </div>
            {currentUser && renderMenu(comment.id, comment.user_id)}
          </div>
        </div>

        <p style={{ margin: 0, color: "#e0d8d0", lineHeight: 1.9 }}>
          {comment.content}
        </p>

        {renderCommentImages(comment)}
      </>
    );
  };

  return (
    <section
      style={{
        marginTop: "28px",
        borderTop: "1px solid rgba(161, 102, 108, 0.24)",
        paddingTop: "24px",
      }}
    >
      <div style={{ marginBottom: "18px" }}>
        <h3 style={{ margin: 0, fontSize: "24px", color: "#f5f1eb" }}>
          {t.comment}
        </h3>
        <p style={{ margin: "10px 0 0", color: "#c0b5a8", lineHeight: 1.8 }}>
          {t.commentSubtitle}
        </p>
      </div>

      {loading ? (
        <p style={{ color: "#9a8880" }}>{t.commentLoading}</p>
      ) : rootComments.length === 0 ? (
        <p style={{ color: "#9a8880" }}>{t.noComments}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {rootComments.map((comment) => {
            const replies = getReplies(comment.id);

            return (
              <article
                key={comment.id}
                style={{
                  border: "1px solid rgba(161, 102, 108, 0.24)",
                  background: "#140a0c",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                {renderComment(comment, false)}

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {renderReplyButton(comment.id)}
                </div>

                {renderReplyForm(comment.id)}

                {replies.length > 0 && (
                  <div
                    style={{
                      marginTop: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {replies.map((reply) => {
                      const nestedReplies = getReplies(reply.id);
                      return (
                        <div key={reply.id}>
                          <div
                            style={{
                              borderRadius: "10px",
                              background: "rgba(18, 5, 8, 0.96)",
                              padding: "12px 14px",
                            }}
                          >
                            {renderComment(reply, true)}

                            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                              {renderReplyButton(reply.id)}
                            </div>

                            {renderReplyForm(reply.id)}
                          </div>

                          {/* ネストされた返信（返信への返信） */}
                          {nestedReplies.length > 0 && (
                            <div
                              style={{
                                marginTop: 8,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              {nestedReplies.map((nested) => (
                                <div
                                  key={nested.id}
                                  style={{
                                    borderRadius: "8px",
                                    background: "rgba(22, 8, 12, 0.96)",
                                    padding: "10px 12px",
                                  }}
                                >
                                  {renderComment(nested, true)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* 新規コメントフォーム */}
      <form onSubmit={handlePost} style={{ marginTop: "24px" }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={currentUser ? t.commentWritePlaceholder : t.commentLoginRequired}
          disabled={!currentUser || posting}
          style={{
            ...textareaStyle,
            minHeight: "120px",
            fontSize: "16px",
          }}
        />

        {renderImageSlots(commentImages, setCommentImages)}

        <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={!currentUser || posting}
            style={{
              width: "100%",
              minHeight: "48px",
              padding: "0 24px",
              borderRadius: "0",
              border: "1px solid rgba(200, 100, 110, 0.5)",
              borderTop: "2px solid rgba(220, 120, 130, 0.6)",
              background:
                "linear-gradient(to bottom, rgba(140, 40, 50, 0.96), rgba(80, 18, 26, 0.98))",
              color: "#f5f1eb",
              fontWeight: 700,
              fontSize: "14px",
              letterSpacing: "0.12em",
              cursor: !currentUser || posting ? "not-allowed" : "pointer",
              opacity: !currentUser || posting ? 0.6 : 1,
            }}
          >
            {posting ? t.commentPosting : t.commentSubmit}
          </button>
        </div>
      </form>
    </section>
  );
}

// ── Shared Styles ──────────────────────────────
const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "90px",
  padding: "12px 14px",
  boxSizing: "border-box",
  borderRadius: "10px",
  border: "1px solid rgba(165, 99, 104, 0.28)",
  background: "rgba(10, 3, 5, 0.96)",
  color: "#e0d8d0",
  fontSize: "15px",
  outline: "none",
  resize: "vertical",
};

const replyBtnStyle: React.CSSProperties = {
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "8px",
  border: "1px solid rgba(177, 110, 115, 0.28)",
  background: "rgba(50, 15, 20, 0.72)",
  color: "#c0b5a8",
  cursor: "pointer",
};

const cancelBtnStyle: React.CSSProperties = {
  minHeight: "38px",
  padding: "0 14px",
  borderRadius: "8px",
  border: "1px solid rgba(177, 110, 115, 0.28)",
  background: "rgba(50, 15, 20, 0.72)",
  color: "#c0b5a8",
  cursor: "pointer",
};

const submitBtnStyle: React.CSSProperties = {
  minHeight: "38px",
  padding: "0 14px",
  borderRadius: "8px",
  border: "1px solid rgba(200, 100, 110, 0.34)",
  background: "linear-gradient(to bottom, rgba(140, 40, 50, 0.96), rgba(100, 25, 35, 0.96))",
  color: "#f5f1eb",
  fontWeight: 700,
};

const menuTriggerStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#8a7870",
  fontSize: "18px",
  cursor: "pointer",
  padding: "2px 6px",
  borderRadius: "4px",
  lineHeight: 1,
  transition: "background 0.15s, color 0.15s",
};

const menuDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  right: 0,
  zIndex: 50,
  marginTop: "4px",
  minWidth: "120px",
  background: "#1a0c0e",
  border: "1px solid rgba(161, 102, 108, 0.3)",
  borderRadius: "8px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  overflow: "hidden",
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 16px",
  background: "none",
  border: "none",
  color: "#c8b8b0",
  fontSize: "13px",
  textAlign: "left",
  cursor: "pointer",
  transition: "background 0.15s",
};

const menuItemDangerStyle: React.CSSProperties = {
  ...menuItemStyle,
  color: "#e05c6a",
};

// 画像スロット用スタイル
const imageSlotStyle: React.CSSProperties = { width: 80, height: 80, borderRadius: 6, overflow: "hidden", flexShrink: 0 };
const imagePreviewStyle: React.CSSProperties = { width: 80, height: 80, objectFit: "cover", display: "block", borderRadius: 6 };
const imageRemoveBtn: React.CSSProperties = { position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, lineHeight: "18px", textAlign: "center", padding: 0 };
const imageAddLabel: React.CSSProperties = { width: 80, height: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, background: "rgba(20,8,10,0.8)", border: "1px dashed rgba(180,100,110,0.4)", borderRadius: 6, color: "#a09080", cursor: "pointer", fontSize: 11 };
