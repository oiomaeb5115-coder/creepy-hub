"use client";

import { useEffect, useRef, type FormHTMLAttributes, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  action: string;
  method?: FormHTMLAttributes<HTMLFormElement>["method"];
};

export default function HotkeySearchForm({ children, className, action, method = "get" }: Props) {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === "k" || e.key === "K";
      if (isK && (e.metaKey || e.ctrlKey)) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        const input = ref.current?.querySelector<HTMLInputElement>(
          'input[type="text"], input[type="search"], input:not([type])'
        );
        input?.focus();
        input?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form ref={ref} className={className} action={action} method={method}>
      {children}
    </form>
  );
}
