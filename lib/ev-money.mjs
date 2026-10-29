/**
 * לוגיקת כסף / תשלומים / סנכרון — מקור אמת לבדיקות ול־runtime (מוזרק לפני src/).
 * מונע רגרסיות: מחיקת תשלומים בענן, חסימת הפקדות לגיטימיות, יתרה שגויה.
 *
 * הקובץ הזה הוא barrel בלבד: הגוף פוצל לקבצי תחום ומיוצא מהם מחדש,
 * כדי שנתיב הייבוא של הבדיקות (lib/ev-money.mjs) לא ישתנה.
 *   ev-money-core.mjs    — פרטיים משותפים (זמן, קוט״ש/סכום, חלונות השוואה)
 *   ev-payments.mjs      — תשלומים, יתרות ועובר־ושב, גבייה חודשית
 *   ev-policy.mjs        — מדיניות שיא וכוונת אישור
 *   ev-opens.mjs         — מחזור־חיי טעינות פתוחות ומעקב תחנה
 *   ev-timeline.mjs      — ציר זמן וסיום חי
 *   ev-matching.mjs      — התאמת סשנים↔עסקאות וחשד כפילות
 *   ev-misc.mjs          — השאר (ניתוב עדכונים, שעות ידניות, לא־מקוטלגות, וואטסאפ)
 */
export * from "./ev-money-core.mjs";
export * from "./ev-payments.mjs";
export * from "./ev-policy.mjs";
export * from "./ev-opens.mjs";
export * from "./ev-timeline.mjs";
export * from "./ev-matching.mjs";
export * from "./ev-misc.mjs";
