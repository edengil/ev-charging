import { json, optionsResponse, handleWevoRequest } from "../_shared/wevo.js";

export async function onRequestOptions() {
  return optionsResponse();
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const result = await handleWevoRequest(body);
    return json(200, result);
  } catch (e) {
    const status = e.status || 500;
    return json(status, { error: e.message || "שגיאה לא צפויה", detail: e.detail, ok: false });
  }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") return optionsResponse();
  if (context.request.method === "POST") return onRequestPost(context);
  return json(405, { error: "Method not allowed", ok: false });
}
