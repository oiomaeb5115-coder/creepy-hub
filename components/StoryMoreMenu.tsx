"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import ReportButton from "./ReportButton";
import BlockButton from "./BlockButton";
import styles from "./StoryMoreMenu.module.css";

type Props = {
  storyId: string;
  storyUserId: string;
};

export default function StoryMoreMenu({ storyId, storyUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 現在のユーザーID取得
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  const isOwner = currentUserId === storyUserId;

  // Click-outside で閉じる
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleDelete = async () => {
    if (!confirm("このストリームを削除しますか？")) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/story/${storyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("削除に失敗しました");
      }
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        className={styles.moreBtn}
        onClick={() => setOpen((prev) => !prev)}
        type="button"
        aria-label="More options"
      >
        <span className={styles.dotIcon}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {isOwner && (
            <>
              <button
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
                type="button"
              >
                {deleting ? "削除中..." : "削除"}
              </button>
              <div className={styles.divider} />
            </>
          )}
          <ReportButton reportUrl={`/api/story/${storyId}/report`} />
          <div className={styles.divider} />
          <BlockButton targetUserId={storyUserId} />
        </div>
      )}
    </div>
  );
}
