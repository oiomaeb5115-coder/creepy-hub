"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type PostCommentsLabels = {
  comment?: string;
  commentSubtitle?: string;
  commentWritePlaceholder?: string;
  commentLoginRequired?: string;
  commentPosting?: string;
  commentSubmit?: string;
  commentLoading?: string;
  noComments?: string;
  deletedComment?: string;
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
  author: ProfileRow[] | ProfileRow | null;
};

type SessionUser = {
  id: string;
  email?: string | null;
};

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
    deletedComment: labels?.deletedComment ?? "削除されたコメントです。",
    reply: labels?.reply ?? "返信",
    replyPlaceholder: labels?.replyPlaceholder ?? "返信を書く...",
    cancel: labels?.cancel ?? "キャンセル",
    replyPosting: labels?.replyPosting ?? "返信中...",
    replySubmit: labels?.replySubmit ?? "返信する",
  };
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [content, setContent] = useState("");
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  const [replyOpenId, setReplyOpenId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);

  const loadComments = async () => {
    setLoading(true);

    const { data, error } = await supabase
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
      .order("created_at", { ascending: true });

    if (error) {
      console.error("comment load error:", error);
      setComments([]);
      setLoading(false);
      return;
    }

    setComments((data ?? []) as CommentRow[]);
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
    () => comments.filter((comment) => comment.parent_id === null),
    [comments]
  );

  const getReplies = (commentId: number) =>
    comments.filter((comment) => comment.parent_id === commentId);

  const getAuthor = (author: CommentRow["author"]) => {
    if (!author) return null;
    if (Array.isArray(author)) return author[0] ?? null;
    return author;
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
      const { error } = await supabase.from("post_comments").insert([
        {
          post_id: postId,
          user_id: currentUser.id,
          parent_id: null,
          content: content.trim(),
        },
      ]);

      if (error) {
        alert(`${t.commentSubmit}: ${error.message}`);
        return;
      }

      setContent("");
      await loadComments();
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
      const { error } = await supabase.from("post_comments").insert([
        {
          post_id: postId,
          user_id: currentUser.id,
          parent_id: parentId,
          content: replyContent.trim(),
        },
      ]);

      if (error) {
        alert(`${t.replySubmit}: ${error.message}`);
        return;
      }

      setReplyContent("");
      setReplyOpenId(null);
      await loadComments();
    } finally {
      setReplyPosting(false);
    }
  };

  return (
    <section
      style={{
        marginTop: "28px",
        borderTop: "1px solid rgba(94, 118, 155, 0.18)",
        paddingTop: "24px",
      }}
    >
      <div style={{ marginBottom: "18px" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "24px",
            color: "#f1f5fc",
          }}
        >
          {t.comment}
        </h3>
        <p
          style={{
            margin: "10px 0 0",
            color: "#9eb0c8",
            lineHeight: 1.8,
          }}
        >
          {t.commentSubtitle}
        </p>
      </div>

      <form onSubmit={handlePost} style={{ marginBottom: "24px" }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            currentUser
              ? t.commentWritePlaceholder
              : t.commentLoginRequired
          }
          disabled={!currentUser || posting}
          style={{
            width: "100%",
            minHeight: "120px",
            padding: "14px 16px",
            boxSizing: "border-box",
            borderRadius: "10px",
            border: "1px solid rgba(99, 124, 165, 0.28)",
            background: "rgba(3, 10, 19, 0.96)",
            color: "#eef4ff",
            fontSize: "16px",
            outline: "none",
            resize: "vertical",
          }}
        />

        <div
          style={{
            marginTop: "12px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="submit"
            disabled={!currentUser || posting}
            style={{
              minHeight: "44px",
              padding: "0 18px",
              borderRadius: "10px",
              border: "1px solid rgba(143, 174, 223, 0.34)",
              background:
                "linear-gradient(to bottom, rgba(84, 116, 163, 0.96), rgba(57, 82, 121, 0.96))",
              color: "#eef4ff",
              fontWeight: 700,
              cursor: !currentUser || posting ? "not-allowed" : "pointer",
              opacity: !currentUser || posting ? 0.7 : 1,
            }}
          >
            {posting ? t.commentPosting : t.commentSubmit}
          </button>
        </div>
      </form>

      {loading ? (
        <p style={{ color: "#aebcd1" }}>{t.commentLoading}</p>
      ) : rootComments.length === 0 ? (
        <p style={{ color: "#aebcd1" }}>{t.noComments}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {rootComments.map((comment) => {
            const author = getAuthor(comment.author);
            const replies = getReplies(comment.id);

            return (
              <article
                key={comment.id}
                style={{
                  border: "1px solid rgba(104, 128, 165, 0.24)",
                  background: "rgba(7, 14, 25, 0.94)",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ color: "#cfe0ff", fontWeight: 700 }}>
                    @{author?.username ?? "unknown"}
                  </div>
                  <div style={{ color: "#8ea4c2", fontSize: "13px" }}>
                    {new Date(comment.created_at).toLocaleString(dateLocale)}
                  </div>
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#d8e0ed",
                    lineHeight: 1.9,
                  }}
                >
                  {comment.is_deleted ? t.deletedComment : comment.content}
                </p>

                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setReplyOpenId((prev) => (prev === comment.id ? null : comment.id))
                    }
                    style={{
                      minHeight: "34px",
                      padding: "0 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(104, 128, 165, 0.24)",
                      background: "rgba(11, 19, 32, 0.9)",
                      color: "#cfe0ff",
                      cursor: "pointer",
                    }}
                  >
                    {t.reply}
                  </button>
                </div>

                {replyOpenId === comment.id && (
                  <div style={{ marginTop: "14px" }}>
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={
                        currentUser
                          ? t.replyPlaceholder
                          : t.commentLoginRequired
                      }
                      disabled={!currentUser || replyPosting}
                      style={{
                        width: "100%",
                        minHeight: "90px",
                        padding: "12px 14px",
                        boxSizing: "border-box",
                        borderRadius: "10px",
                        border: "1px solid rgba(99, 124, 165, 0.28)",
                        background: "rgba(3, 10, 19, 0.96)",
                        color: "#eef4ff",
                        fontSize: "15px",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />

                    <div
                      style={{
                        marginTop: "10px",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "10px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setReplyOpenId(null);
                          setReplyContent("");
                        }}
                        style={{
                          minHeight: "38px",
                          padding: "0 14px",
                          borderRadius: "8px",
                          border: "1px solid rgba(104, 128, 165, 0.24)",
                          background: "rgba(11, 19, 32, 0.9)",
                          color: "#cfe0ff",
                          cursor: "pointer",
                        }}
                      >
                        {t.cancel}
                      </button>

                      <button
                        type="button"
                        disabled={!currentUser || replyPosting}
                        onClick={() => handleReplyPost(comment.id)}
                        style={{
                          minHeight: "38px",
                          padding: "0 14px",
                          borderRadius: "8px",
                          border: "1px solid rgba(143, 174, 223, 0.34)",
                          background:
                            "linear-gradient(to bottom, rgba(84, 116, 163, 0.96), rgba(57, 82, 121, 0.96))",
                          color: "#eef4ff",
                          fontWeight: 700,
                          cursor: !currentUser || replyPosting ? "not-allowed" : "pointer",
                          opacity: !currentUser || replyPosting ? 0.7 : 1,
                        }}
                      >
                        {replyPosting ? t.replyPosting : t.replySubmit}
                      </button>
                    </div>
                  </div>
                )}

                {replies.length > 0 && (
                  <div
                    style={{
                      marginTop: "16px",
                      paddingLeft: "16px",
                      borderLeft: "2px solid rgba(104, 128, 165, 0.24)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {replies.map((reply) => {
                      const replyAuthor = getAuthor(reply.author);

                      return (
                        <div
                          key={reply.id}
                          style={{
                            borderRadius: "10px",
                            background: "rgba(11, 19, 32, 0.9)",
                            padding: "12px 14px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "12px",
                              marginBottom: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ color: "#cfe0ff", fontWeight: 700 }}>
                              @{replyAuthor?.username ?? "unknown"}
                            </div>
                            <div style={{ color: "#8ea4c2", fontSize: "12px" }}>
                              {new Date(reply.created_at).toLocaleString(dateLocale)}
                            </div>
                          </div>

                          <p
                            style={{
                              margin: 0,
                              color: "#d8e0ed",
                              lineHeight: 1.8,
                            }}
                          >
                            {reply.is_deleted
                              ? t.deletedComment
                              : reply.content}
                          </p>
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
    </section>
  );
}