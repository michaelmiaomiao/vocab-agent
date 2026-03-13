import type { AppPagesFunction } from "../../../types";
import { error, json } from "../../../utils/http";
import { enrichAndApplyItem } from "../../../utils/aiPipeline";

export const onRequestPost: AppPagesFunction = async (context) => {
  const id = Number(context.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return error("Invalid id");
  }
  const updated = await enrichAndApplyItem(context.env, id);
  if (!updated) return error("Item not found", 404);
  return json(updated);
};
