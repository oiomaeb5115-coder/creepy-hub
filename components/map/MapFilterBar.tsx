"use client";

import { useState } from "react";
import { BLOOD_SCORCHED, CATEGORY_LABEL, type SpotCategory } from "@/lib/mapPalettes";

export type SourceKind = "all" | "spots" | "posts";
export type PeriodKind = "all" | "7" | "30";

export interface MapFilterState {
  categories: Set<SpotCategory>;
  source: SourceKind;
  period: PeriodKind;
}

export const DEFAULT_FILTER: MapFilterState = {
  categories: new Set<SpotCategory>(["haunted", "horror", "sightseeing", "legend"]),
  source: "all",
  period: "all",
};

interface Props {
  value: MapFilterState;
  onChange: (next: MapFilterState) => void;
}

const ALL_CATS: SpotCategory[] = ["haunted", "horror", "sightseeing", "legend"];

/**
 * 地図画面上部に出すフィルタバー。
 * - カテゴリ（心霊/恐怖/観光/伝承）の ON/OFF チップ
 * - ソース切替（すべて / キュレのみ / 投稿のみ）
 * - 期間（すべて / 7日 / 30日）— 投稿のみ適用
 */
export default function MapFilterBar({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const toggleCat = (c: SpotCategory) => {
    const next = new Set(value.categories);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    onChange({ ...value, categories: next });
  };

  return (
    <div style={wrap}>
      <div style={row}>
        {ALL_CATS.map((c) => {
          const active = value.categories.has(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleCat(c)}
              style={{
                ...chip,
                background: active ? BLOOD_SCORCHED[c] : "rgba(0,0,0,0.55)",
                borderColor: active ? BLOOD_SCORCHED[c] : "rgba(255,255,255,0.25)",
                color: active ? "#fff" : "rgba(255,255,255,0.65)",
              }}
            >
              {CATEGORY_LABEL[c]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ ...chip, background: "rgba(0,0,0,0.55)", borderColor: "rgba(255,255,255,0.25)" }}
          aria-label="詳細フィルタ"
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>
      {expanded && (
        <div style={{ ...row, marginTop: 6 }}>
          <SegControl<SourceKind>
            value={value.source}
            onChange={(v) => onChange({ ...value, source: v })}
            options={[
              { v: "all", label: "すべて" },
              { v: "spots", label: "スポット" },
              { v: "posts", label: "投稿" },
            ]}
          />
          <SegControl<PeriodKind>
            value={value.period}
            onChange={(v) => onChange({ ...value, period: v })}
            options={[
              { v: "all", label: "全期間" },
              { v: "30", label: "30日" },
              { v: "7", label: "7日" },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function SegControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div style={seg}>
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            style={{
              ...segBtn,
              background: active ? "rgba(139,26,20,0.9)" : "transparent",
              color: active ? "#fff" : "rgba(255,255,255,0.7)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  left: 80,
  zIndex: 20,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  pointerEvents: "none",
  fontFamily: '"装甲明朝","Soukou Mincho",serif',
};
const row: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  pointerEvents: "auto",
  justifyContent: "flex-end",
};
const chip: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid",
  fontSize: 13,
  cursor: "pointer",
  userSelect: "none",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
};
const seg: React.CSSProperties = {
  display: "inline-flex",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(0,0,0,0.55)",
  overflow: "hidden",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
};
const segBtn: React.CSSProperties = {
  border: "none",
  padding: "6px 12px",
  fontSize: 12,
  cursor: "pointer",
};
