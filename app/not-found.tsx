import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "1.5rem",
        padding: "4rem 2rem",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: "4rem", fontWeight: "bold", letterSpacing: "0.1em", opacity: 0.3 }}>
        404
      </p>
      <h2 style={{ fontSize: "1.2rem", letterSpacing: "0.15em" }}>
        ページが見つかりません
      </h2>
      <p style={{ opacity: 0.5, fontSize: "0.85rem" }}>
        お探しのページは存在しないか、削除された可能性があります。
      </p>
      <Link
        href="/ja"
        style={{
          padding: "0.6rem 2rem",
          border: "1px solid currentColor",
          textDecoration: "none",
          letterSpacing: "0.05em",
          fontSize: "0.85rem",
        }}
      >
        トップへ戻る
      </Link>
    </main>
  );
}
