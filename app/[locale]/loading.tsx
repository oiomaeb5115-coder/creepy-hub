import styles from "./loading.module.css";

function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.cardMeta} />
      <div className={styles.cardTitle} />
      <div className={styles.cardBody} />
      <div className={styles.cardBodyShort} />
      <div className={styles.cardFooter} />
    </div>
  );
}

export default function Loading() {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.headerArea}>
          <div className={styles.titleBone} />
          <div className={styles.subtitleBone} />
        </div>
        <div className={styles.cardList}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
