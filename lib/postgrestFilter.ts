/**
 * Escape/remove characters that have special meaning inside Supabase/PostgREST
 * filter DSL strings such as `.or("title.ilike.<value>,content.ilike.<value>")`.
 */
export function sanitizePostgrestFilterValue(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/[()[\]{},.:"'`;]/g, "");
}

export function makePostgrestIlikePattern(raw: string): string {
  return `%${sanitizePostgrestFilterValue(raw)}%`;
}
