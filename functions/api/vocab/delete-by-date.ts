import type { AppPagesFunction } from "../../types";
import { error, json } from "../../utils/http";

export const onRequestPost: AppPagesFunction = async (context) => {
  let body: unknown;

  try {
    body = await context.request.json();
  } catch {
    return error("Invalid JSON body");
  }

  const startAt =
    typeof (body as { start_at?: unknown })?.start_at === "string"
      ? (body as { start_at: string }).start_at
      : "";
  const endAt =
    typeof (body as { end_at?: unknown })?.end_at === "string"
      ? (body as { end_at: string }).end_at
      : "";

  if (!startAt || !endAt) {
    return error("start_at and end_at are required");
  }

  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return error("Invalid date range");
  }

  const result = await context.env.DB.prepare(
    `DELETE FROM vocab_items WHERE created_at >= ? AND created_at < ?`
  )
    .bind(start.toISOString(), end.toISOString())
    .run();

  return json({
    deleted: Number(result.meta.changes ?? 0)
  });
};
