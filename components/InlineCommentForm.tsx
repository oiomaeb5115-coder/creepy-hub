"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import CommentIcon from "@/components/icons/CommentIcon";

type Props = {
  postId: number;
  locale?: string;
  initialCount?: number;
  postTitle?: string | null;
  showCommentAction?: boolean;
};

type ProfileRow = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CommentRow = {
  id: number;
  parent_id: number | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  author: ProfileRow[] | ProfileRow | null;
};

type PanelMode = "view" | "write" | null;

const countLabel = (value: number) => value.toLocaleString("en-US");

export default function InlineCommentForm({
  postId,
  locale = "ja",
  initialCount = 0,
  postTitle,
  showCommentAction = false,
}: Props) {
  const isEn = locale === "en";
  const commentLabel = isEn ? "Comment" : "コメントをする";
  const [count, setCount] = useState(initialCount);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [content, setContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const getAuthor = (author: CommentRow["author"]) => {
    if (!author) return null;
    if (Array.isArray(author)) return author[0] ?? null;
    return author;
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    const { data, error } = await supabase
      .from("post_comments")
      .select(
        `
        id,
        parent_id,
        content,
        is_deleted,
        created_at,
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
      .limit(100);

    if (error) {
      console.error("comment load error:", error);
      setComments([]);
      setCommentsLoaded(true);
      setCommentsLoading(false);
      return;
    }

    const nextComments = ((data ?? []) as CommentRow[]).map((comment) => ({
      ...comment,
      image_url: comment.image_url ?? null,
      image_url_2: comment.image_url_2 ?? null,
      image_url_3: comment.image_url_3 ?? null,
    }));
    setComments(nextComments);
    setCount(nextComments.filter((comment) => !comment.is_deleted).length);
    setCommentsLoaded(true);
    setCommentsLoading(false);
  };

  useEffect(() => {
    if (panelMode === null || authChecked) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [panelMode, authChecked]);

  useEffect(() => {
    if (panelMode !== "view" || commentsLoaded) return;
    loadComments();
  }, [panelMode, commentsLoaded]);

  useEffect(() => {
    if (panelMode === "write" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [panelMode]);

  useEffect(() => {
    if (replyingToId !== null && replyTextareaRef.current) {
      replyTextareaRef.current.focus();
    }
  }, [replyingToId]);

  useEffect(() => {
    if (panelMode !== "view") return;
    panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [panelMode, commentsLoading]);

  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation?.();
  };

  const stopBubble = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation?.();
  };

  const openPanel = (e: React.SyntheticEvent, mode: Exclude<PanelMode, null>) => {
    stop(e);
    if (mode === "write") {
      setReplyingToId(null);
      setReplyContent("");
    }
    setPanelMode((current) => (current === mode ? null : mode));
  };

  const submitComment = async (parentId: number | null, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    if (!userId) {
      alert(isEn ? "Login required to comment." : "コメントするにはログインが必要です。");
      return;
    }

    setPosting(true);
    try {
      const { error } = await supabase.from("post_comments").insert([
        {
          post_id: postId,
          user_id: userId,
          parent_id: parentId,
          content: trimmed,
        },
      ]);
      if (error) {
        alert((isEn ? "Failed to post comment: " : "コメント投稿に失敗しました: ") + error.message);
        return;
      }
      if (parentId === null) {
        setContent("");
      } else {
        setReplyContent("");
        setReplyingToId(null);
      }
      await loadComments();
      setPanelMode("view");
    } finally {
      setPosting(false);
    }
  };

  const submit = async () => {
    await submitComment(null, content);
  };

  const submitReply = async (parentId: number) => {
    await submitComment(parentId, replyContent);
  };

  const visibleComments = comments.filter((comment) => !comment.is_deleted);
  const rootComments = visibleComments.filter((comment) => comment.parent_id === null);
  const getReplies = (parentId: number) =>
    visibleComments.filter((comment) => comment.parent_id === parentId);
  const displayCountLabel = isEn
    ? `View ${countLabel(count)} comments`
    : `${count}件のコメントを表示`;
  const showViewButton = count > 0 || !showCommentAction;

  const renderComment = (comment: CommentRow, isReply = false) => {
    const author = getAuthor(comment.author);
    const name = author?.display_name || author?.username || (isEn ? "Anonymous" : "匿名");
    const username = author?.username ? `@${author.username}` : name;
    const replies = getReplies(comment.id);
    const imageUrls = [comment.image_url, comment.image_url_2, comment.image_url_3].filter(Boolean) as string[];

    return (
      <div key={comment.id} className={`inline-comment-item ${isReply ? "inline-comment-reply" : ""}`}>
        <div className="inline-comment-avatarWrap">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="inline-comment-avatar" />
          ) : (
            <span className="inline-comment-avatar inline-comment-avatarFallback" />
          )}
        </div>
        <div className="inline-comment-body">
          <div className="inline-comment-meta">
            <span className="inline-comment-author">{username}</span>
            <span className="inline-comment-date">
              {new Date(comment.created_at).toLocaleDateString(isEn ? "en-US" : "ja-JP")}
            </span>
          </div>
          <p className="inline-comment-text">{comment.content}</p>
          {imageUrls.length > 0 && (
            <div className="inline-comment-images">
              {imageUrls.map((url, index) => (
                <a
                  key={`${comment.id}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={stopBubble}
                  onMouseDown={stopBubble}
                  onPointerDown={stopBubble}
                >
                  <img src={url} alt="" loading="lazy" />
                </a>
              ))}
            </div>
          )}
          <div className="inline-comment-tools">
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                setPanelMode("view");
                setReplyingToId((current) => (current === comment.id ? null : comment.id));
                setReplyContent("");
              }}
            >
              {isEn ? "Reply" : "返信"}
            </button>
          </div>
          {replyingToId === comment.id && (
            <div className="inline-comment-replyForm">
              <p className="inline-comment-target">
                {isEn ? "Replying to " : "返信先: "}
                {username}
              </p>
              <textarea
                ref={replyTextareaRef}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={
                  authChecked && !userId
                    ? (isEn ? "Login required to reply." : "返信するにはログインが必要です。")
                    : (isEn ? "Write a reply..." : "返信を書く...")
                }
                disabled={posting || (authChecked && !userId)}
                rows={2}
                className="inline-comment-textarea"
              />
              <div className="inline-comment-submitRow">
                <button
                  type="button"
                  className="inline-comment-cancel"
                  onClick={(e) => {
                    stop(e);
                    setReplyingToId(null);
                    setReplyContent("");
                  }}
                >
                  {isEn ? "Cancel" : "キャンセル"}
                </button>
                <button
                  type="button"
                  className="inline-comment-submit"
                  onClick={(e) => {
                    stop(e);
                    submitReply(comment.id);
                  }}
                  disabled={posting || !replyContent.trim() || (authChecked && !userId)}
                >
                  {posting
                    ? (isEn ? "Posting..." : "送信中...")
                    : (isEn ? "Reply" : "返信する")}
                </button>
              </div>
            </div>
          )}
          {replies.length > 0 && (
            <div className="inline-comment-replies">
              {replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="inline-comment-shell">
      <div className="inline-comment-actions">
        {showViewButton && (
          <button
            type="button"
            className="stat-icon inline-comment-viewButton"
            onClick={(e) => openPanel(e, count > 0 ? "view" : "write")}
            onMouseDown={stopBubble}
            onPointerDown={stopBubble}
            title={displayCountLabel}
            aria-label={displayCountLabel}
          >
            <CommentIcon />
            <span>{displayCountLabel}</span>
          </button>
        )}
        {showCommentAction && (
          <button
            type="button"
            className="inline-comment-action"
            onClick={(e) => openPanel(e, "write")}
            onMouseDown={stopBubble}
            onPointerDown={stopBubble}
            aria-label={commentLabel}
          >
            {commentLabel}
          </button>
        )}
      </div>

      {panelMode === "view" && count > 0 && (
        <div ref={panelRef} className="inline-comment-panel" onClick={stop} onMouseDown={stopBubble} onPointerDown={stopBubble}>
          {commentsLoading ? (
            <p className="inline-comment-muted">
              {isEn ? "Loading comments..." : "コメントを読み込み中..."}
            </p>
          ) : (
            <>
              <div className="inline-comment-panelHeader">
                <span>{displayCountLabel}</span>
                <button type="button" onClick={(e) => openPanel(e, "view")}>
                  {isEn ? "Hide" : "非表示"}
                </button>
              </div>
              {rootComments.length === 0 ? (
                <p className="inline-comment-muted">
                  {isEn ? "No comments could be shown." : "表示できるコメントがありません。"}
                </p>
              ) : (
                <div className="inline-comment-list">
                  {rootComments.map((comment) => renderComment(comment))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {panelMode === "write" && (
        <div className="inline-comment-writePanel" onClick={stop} onMouseDown={stopBubble} onPointerDown={stopBubble}>
          {postTitle && (
            <p className="inline-comment-target">
              {isEn ? "On: " : "対象: "}
              {postTitle}
            </p>
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              authChecked && !userId
                ? (isEn ? "Login required to comment." : "コメントするにはログインが必要です。")
                : (isEn ? "Write a comment..." : "コメントを書く...")
            }
            disabled={posting || (authChecked && !userId)}
            rows={3}
            className="inline-comment-textarea"
          />
          <div className="inline-comment-submitRow">
            <button type="button" className="inline-comment-cancel" onClick={(e) => openPanel(e, "write")}>
              {isEn ? "Cancel" : "キャンセル"}
            </button>
            <button
              type="button"
              className="inline-comment-submit"
              onClick={submit}
              disabled={posting || !content.trim() || (authChecked && !userId)}
            >
              {posting
                ? (isEn ? "Posting..." : "送信中...")
                : (isEn ? "Post comment" : "コメントを送信")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
