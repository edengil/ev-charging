# שומר מעבר־פרימיום — הגדרה חד־פעמית

השומר מאשר אוטומטית המשך טעינה כשהתעריף עובר מרגיל לפרימיום והטעינה נעצרה,
גם כשהאפליקציה סגורה. הלוגיקה רצה ב־`functions/api/wevo-watch.js` (Pages).
הטריגר הוא Worker קטן עם Cron של דקה.

## שלב 1 — משתני סביבה ב־Pages (חובה)

ב־Cloudflare Dashboard ← Workers & Pages ← `eden-ev-charge` ← Settings ← Environment variables ← Production ← Add:

| שם | ערך |
| --- | --- |
| `EV_WATCH_KEY` | (הערך שנמסר מעדן/Muse — base64 של 32 בית) |
| `EV_WATCH_TICK_SECRET` | (הערך שנמסר — מחרוזת אקראית) |

אחרי ההוספה: Deployments ← Retry deployment (או push חדש) כדי שהמשתנים ייתפסו.

## שלב 2 — Worker טריגר

1. Workers & Pages ← Create ← Worker ← שם: `ev-watch-tick` ← Deploy.
2. Edit code ← החלף את כל התוכן בתוכן הקובץ `worker.js` שבתיקייה זו ← Deploy.
3. ב־Worker: Settings ← Variables and Secrets ← Add (Secret): שם `TICK_SECRET`, ערך זהה ל־`EV_WATCH_TICK_SECRET` של שלב 1.
4. ב־Worker: Settings ← Triggers ← Cron Triggers ← Add: `* * * * *`.

בדיקה: פתיחת כתובת ה־Worker בדפדפן מריצה tick ומחזירה סטטוס.

## שימוש

באפליקציה: בחר לקוח ← סמן "המשך אוטומטי בפרימיום" ← "אשר מראש".
הבאנר "🛰️ שומר שרת פעיל" מאשר שהשומר חמוש. השומר פוקע אוטומטית אחרי 24 שעות,
או בלחיצה על "כבה שומר" / "בטל אישור". כיבוי מוחק את הפרטים המוצפנים מהשרת.
