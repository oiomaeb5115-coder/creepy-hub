"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SensitiveImage from "./SensitiveImage";
import styles from "./PostImageGallery.module.css";

type SensitiveDict = {
  reveal: string;
  hide: string;
  overlay: string;
  ageGatePrompt: string;
  ageGateConfirm: string;
  ageGateCancel: string;
};

type PostImageGalleryProps = {
  imageUrls: string[];
  title: string;
  isSensitive?: boolean;
  /** 投稿者の user_id。クライアント側で現在ユーザーと比較して isOwner を判定する */
  ownerId?: string | null;
  sensitiveDict?: SensitiveDict;
};

export default function PostImageGallery({
  imageUrls,
  title,
  isSensitive = false,
  ownerId = null,
  sensitiveDict,
}: PostImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  // ライトボックス側の reveal 状態（同じ画像なら同期）
  const [lightboxRevealed, setLightboxRevealed] = useState(false);

  useEffect(() => {
    if (!isSensitive || !ownerId) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user?.id && session.user.id === ownerId) {
        setIsOwner(true);
      }
    });
    return () => { cancelled = true; };
  }, [isSensitive, ownerId]);

  // 表示画像が切り替わったら reveal 状態を解除
  useEffect(() => {
    setLightboxRevealed(false);
  }, [currentIndex]);

  const openModal = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const goPrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? imageUrls.length - 1 : prev - 1
    );
  };

  const goNext = () => {
    setCurrentIndex((prev) =>
      prev === imageUrls.length - 1 ? 0 : prev + 1
    );
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, imageUrls.length]);

  if (imageUrls.length === 0) return null;

  const needsBlur = isSensitive && !isOwner && !!sensitiveDict;

  return (
    <>
      <section className={styles.storyImageSection}>
        <div className={styles.storyDetailImagesScroll}>
          <div className={styles.storyDetailImages}>
            {imageUrls.map((url, index) => (
              <button
                key={index}
                type="button"
                className={`${styles.storyDetailImageCard} ${styles.storyImageTrigger}`}
                onClick={() => openModal(index)}
              >
                {needsBlur ? (
                  <SensitiveImage
                    src={url}
                    alt={`${title} ${index + 1}`}
                    className={styles.storyDetailImage}
                    dict={sensitiveDict!}
                  />
                ) : (
                  <img
                    src={url}
                    alt={`${title} ${index + 1}`}
                    className={styles.storyDetailImage}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isOpen && (
        <div className={styles.storyLightboxOverlay} onClick={closeModal}>
          <div
            className={styles.storyLightboxContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.storyLightboxClose}
              onClick={closeModal}
              aria-label="閉じる"
            >
              ×
            </button>

            {imageUrls.length > 1 && (
              <button
                type="button"
                className={`${styles.storyLightboxNav} ${styles.left}`}
                onClick={goPrev}
                aria-label="前の画像"
              >
                ‹
              </button>
            )}

            <div className={styles.storyLightboxImageWrap}>
              {needsBlur ? (
                <SensitiveImage
                  src={imageUrls[currentIndex]}
                  alt={`${title} ${currentIndex + 1}`}
                  className={styles.storyLightboxImage}
                  dict={sensitiveDict!}
                  revealed={lightboxRevealed}
                  onRevealChange={setLightboxRevealed}
                />
              ) : (
                <img
                  src={imageUrls[currentIndex]}
                  alt={`${title} ${currentIndex + 1}`}
                  className={styles.storyLightboxImage}
                />
              )}
            </div>

            {imageUrls.length > 1 && (
              <button
                type="button"
                className={`${styles.storyLightboxNav} ${styles.right}`}
                onClick={goNext}
                aria-label="次の画像"
              >
                ›
              </button>
            )}

            <div className={styles.storyLightboxFooter}>
              {currentIndex + 1} / {imageUrls.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
