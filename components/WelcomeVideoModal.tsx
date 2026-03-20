"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

function WelcomeVideoModalInner({ videoSrc }: { videoSrc: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setVisible(true);
    }
  }, [searchParams]);

  const handleEnded = () => {
    setVisible(false);
    router.replace(pathname, { scroll: false });
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0, 0, 0, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <video
        src={videoSrc}
        autoPlay
        playsInline
        onEnded={handleEnded}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

export default function WelcomeVideoModal({ videoSrc }: { videoSrc: string }) {
  return (
    <Suspense fallback={null}>
      <WelcomeVideoModalInner videoSrc={videoSrc} />
    </Suspense>
  );
}
