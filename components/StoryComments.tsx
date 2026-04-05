"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./StoryComments.module.css";

type Comment = {
  id: number;
  content: string;
  is_deleted: boolean;
  created_at: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Props = {
  storyId: string;
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor(diff / (1000 * 60));
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return "now";
}

export default function StoryComments({ storyId, isOpen, onClose, onCountChange }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 認証チェック
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  // コメント取得
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`/api/story/${storyId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.comments ?? [];
        setComments(list);
        onCountChange?.(list.filter((c: Comment) => !c.is_deleted).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, storyId]);

  // シートが開いたらスクロール最下部
  useEffect(() => {
    if (isOpen && listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollTo(0, listRef.current.scrollHeight);
      }, 100);
    }
  }, [isOpen, comments.length]);

  // Escape で閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("コメントにはログインが必要です");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/story/${storyId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: text.trim() }),
      });

      if (res.ok) {
        setText("");
        // リロード
        const data = await fetch(`/api/story/${storyId}/comments`).then((r) => r.json());
        const list = data.comments ?? [];
        setComments(list);
        onCountChange?.(list.filter((c: Comment) => !c.is_deleted).length);
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm("このコメントを削除しますか？")) return;

    const { error } = await supabase
      .from("story_comments")
      .update({ is_deleted: true })
      .eq("id", commentId)
      .eq("user_id", currentUserId!);

    if (!error) {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, is_deleted: true, content: "" } : c))
      );
      onCountChange?.(comments.filter((c) => !c.is_deleted && c.id !== commentId).length);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={`${styles.sheet} ${styles.sheetOpen}`}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>
            コメント {comments.filter((c) => !c.is_deleted).length > 0 && `(${comments.filter((c) => !c.is_deleted).length})`}
          </span>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {/* コメント一覧 */}
        <div ref={listRef} className={styles.commentList}>
          {loading ? (
            <div className={styles.emptyComment}>読み込み中...</div>
          ) : comments.filter((c) => !c.is_deleted).length === 0 ? (
            <div className={styles.emptyComment}>まだコメントはありません</div>
          ) : (
            comments
              .filter((c) => !c.is_deleted)
              .map((c) => (
                <div key={c.id} className={styles.commentItem}>
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className={styles.commentAvatar} />
                  ) : (
                    <div className={styles.commentAvatarPlaceholder}>
                      {(c.display_name || c.username || "?")[0]}
                    </div>
                  )}
                  <div className={styles.commentBody}>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentName}>
                        {c.display_name || c.username || "Anonymous"}
                      </span>
                      <span className={styles.commentTime}>{timeAgo(c.created_at)}</span>
                    </div>
                    <div className={styles.commentText}>{c.content}</div>
                    {currentUserId === c.user_id && (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(c.id)}
                        type="button"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* 入力欄 */}
        <div className={styles.inputBar}>
          <input
            className={styles.inputField}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={currentUserId ? "コメントを追加..." : "ログインしてコメント"}
            disabled={!currentUserId}
            maxLength={1000}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!text.trim() || sending || !currentUserId}
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
