// טריגר קבוע לשומר מעבר־הפרימיום של אפליקציית הטעינה.
// Worker קטן עם Cron Trigger (כל דקה) שקורא לנקודת ה־tick באפליקציה.
// ההגדרה: ראו README.md בתיקייה זו. הסוד נשמר כ־Secret של ה־Worker (TICK_SECRET)
// וזהה ל־EV_WATCH_TICK_SECRET שמוגדר ב־Pages.

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      fetch("https://eden-ev-charge.pages.dev/api/wevo-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tick", secret: env["TICK_" + "SECRET"] })
      }).then(async (res) => {
        const txt = await res.text().catch(() => "");
        console.log("watch tick:", res.status, txt.slice(0, 200));
      }).catch((e) => {
        console.log("watch tick failed:", e && e.message || String(e));
      })
    );
  },

  // בדיקה ידנית מהדפדפן: פתיחת כתובת ה־Worker מריצה tick אחד ומחזירה את התשובה
  async fetch(req, env) {
    const res = await fetch("https://eden-ev-charge.pages.dev/api/wevo-watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "tick", secret: env["TICK_" + "SECRET"] })
    });
    const txt = await res.text().catch(() => "");
    return new Response(`tick status ${res.status}\n${txt}`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
};
