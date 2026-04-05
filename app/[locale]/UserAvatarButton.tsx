"use client";

import styles from "./user-avatar-button.module.css";

type Props = {
  avatarUrl: string | null;
  badgeCount: number;
  onClick: () => void;
};

export default function UserAvatarButton({ avatarUrl, badgeCount, onClick }: Props) {
  return (
    <div className={styles.badgeWrap}>
      <button
        className={styles.avatarButton}
        onClick={onClick}
        type="button"
        aria-label="Open menu"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className={styles.avatarImage} />
        ) : (
          <div className={styles.avatarPlaceholder}>👤</div>
        )}
      </button>
      {badgeCount > 0 && (
        <span className={styles.badge}>
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </div>
  );
}
