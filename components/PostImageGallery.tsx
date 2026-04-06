"use client";

import { useEffect, useState } from "react";
import styles from "./PostImageGallery.module.css";

type PostImageGalleryProps = {
  imageUrls: string[];
  title: string;
};

export default function PostImageGallery({
  imageUrls,
  title,
}: PostImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

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
                <img
                  src={url}
                  alt={`${title} ${index + 1}`}
                  className={styles.storyDetailImage}
                />
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
              <img
                src={imageUrls[currentIndex]}
                alt={`${title} ${currentIndex + 1}`}
                className={styles.storyLightboxImage}
              />
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