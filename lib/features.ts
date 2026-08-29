/**
 * Novel is public by default. Set NEXT_PUBLIC_NOVEL_PUBLIC_ACCESS_ENABLED=false
 * only when the experience must be temporarily hidden.
 */
export const NOVEL_PUBLIC_ACCESS_ENABLED =
  process.env.NEXT_PUBLIC_NOVEL_PUBLIC_ACCESS_ENABLED !== "false";

/** Keep the legacy conversation catalogue hidden during the video-player redesign. */
export const NOVEL_CONVERSATION_LIST_ENABLED =
  process.env.NEXT_PUBLIC_NOVEL_CONVERSATION_LIST_ENABLED === "true";
