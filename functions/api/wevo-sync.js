import { json, optionsResponse, handleWevoRequest, requestOrigin } from "../_shared/wevo.js";

export async function onRequestOptions(context) {
  return optionsResponse(requestOrigin(context));
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const result = await handleWevoRequest(body);
    return json(200, result, requestOrigin(context));
  } catch (e) {
    const status = e.status || 500;
    // M23 (ביקורת 30.10): גוף תגובת Wevo הגולמי (e.detail) לא יוצא ללקוח — רק ללוג השרת
    if (e && e.detail) console.error("wevo-sync upstream detail:", e.detail);
    return json(status, { error: e.message || "שגיאה לא צפויה", ok: false }, requestOrigin(context));
  }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") return optionsResponse(requestOrigin(context));
  if (context.request.method === "POST") return onRequestPost(context);
  return json(405, { error: "Method not allowed", ok: false }, requestOrigin(context));
}
