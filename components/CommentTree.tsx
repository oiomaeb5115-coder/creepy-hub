"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import sanitizeHtml from "sanitize-html";
import { escapeHtml, linkifyUrls } from "@/lib/linkify-urls";

const COMMENT_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["a"],
  allowedSchemes: ["https"],
  allowedAttributes: { a: ["href", "target", "rel", "class"] },
};

type Comment = {
  id: number;
  post_id: number;
  parent_id: number | null;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
  }[];
};

export default function CommentTree({
  comments,
  postId,
  parentId = null,
  depth = 0,
}: {
  comments: Comment[];
  postId: number;
  parentId?: number | null;
  depth?: number;
}) {
  const children = comments.filter((c) => c.parent_id === parentId);

  return (
    <div>
      {children.map((comment) => {
        const username =
          comment.profiles && comment.profiles.length > 0
            ? comment.profiles[0].username
            : "anonymous";

        return (
          <div
            key={comment.id}
            style={{
              marginLeft: depth * 20,
              borderLeft: "2px solid #333",
              paddingLeft: 12,
              marginTop: 12,
            }}
          >
            <div style={{ fontSize: 13, color: "#888" }}>
              {username}
            </div>

            <div
              style={{ margin: "6px 0" }}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(
                  linkifyUrls(escapeHtml(comment.content)),
                  COMMENT_SANITIZE_OPTIONS
                ),
              }}
            />

            <ReplyForm postId={postId} parentId={comment.id} />

            <CommentTree
              comments={comments}
              postId={postId}
              parentId={comment.id}
              depth={depth + 1}
            />
          </div>
        );
      })}
    </div>
  );
}

function ReplyForm({
  postId,
  parentId,
}: {
  postId: number;
  parentId: number | null;
}) {
  const [text, setText] = useState("");

  async function submit() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("ログインしてください");
      return;
    }

    await supabase.from("post_comments").insert({
      post_id: postId,
      parent_id: parentId,
      user_id: user.id,
      content: text,
    });

    location.reload();
  }

  return (
    <div style={{ marginTop: 6 }}>
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          width: "100%",
          background: "#111",
          color: "#fff",
          border: "1px solid #333",
          padding: "6px",
        }}
      />

      <button
        onClick={submit}
        style={{
          marginTop: 4,
          padding: "4px 10px",
        }}
      >
        返信
      </button>
    </div>
  );
}