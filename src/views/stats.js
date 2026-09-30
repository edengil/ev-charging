/**
 * src/views/stats.js — דוח חודשי כללי.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── StatsView: דוח חודשי כללי ──────────────────────────────────────────────
function StatsView({
  sessions,
  clients
}) {
  const now = new Date();
  const [selMo, setSelMo] = useState(now.getMonth());
  const [selYr, setSelYr] = useState(now.getFullYear());
  const selfIds = useMemo(() => selfClientIds(clients), [clients]);

  const monthKeys = useMemo(() => {
    const ks = new Set(sessions.map(s => {
      const d = new Date(s.date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }));
    ks.add(`${now.getFullYear()}-${now.getMonth()}`);
    return [...ks].map(k => {
      const [y, m] = k.split("-").map(Number);
      return { y, m };
    }).sort((a, b) => b.y !== a.y ? b.y - a.y : b.m - a.m);
  }, [sessions]);

  const calcMonth = (y, m) => {
    const ssAll = sessions.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const ssBiz = ssAll.filter(s => isNeighborSession(s, selfIds));
    const income = ssBiz.reduce((a, s) => a + s.amountBilled, 0);
    const expense = ssBiz.reduce((a, s) => a + s.costToOwner, 0);
    const profit = ssBiz.reduce((a, s) => a + s.profit, 0);
    const kwh = ssBiz.reduce((a, s) => a + s.kwhInflated, 0);
    return {
      income,
      expense,
      profit,
      kwh,
      count: ssBiz.length,
      selfCount: ssAll.length - ssBiz.length,
      sessions: ssAll
    };
  };

  const cur = calcMonth(selYr, selMo);
  const prevDate = new Date(selYr, selMo - 1, 1);
  const prev = calcMonth(prevDate.getFullYear(), prevDate.getMonth());
  const isCurMonth = selYr === now.getFullYear() && selMo === now.getMonth();
  const paceDay = isCurMonth ? now.getDate() : new Date(selYr, selMo + 1, 0).getDate();
  const profitMTD = profitMonthToDay(sessions, clients, selYr, selMo, paceDay);
  const prevPaceDate = new Date(selYr, selMo - 1, 1);
  const profitPrevMTD = profitMonthToDay(sessions, clients, prevPaceDate.getFullYear(), prevPaceDate.getMonth(), paceDay);

  const bizAll = sessions.filter(s => isNeighborSession(s, selfIds));
  const allIncome = bizAll.reduce((a, s) => a + s.amountBilled, 0);
  const allExpense = bizAll.reduce((a, s) => a + s.costToOwner, 0);
  const allProfit = bizAll.reduce((a, s) => a + s.profit, 0);

  const graphMonths = useMemo(() => {
    const ms = [...monthKeys].sort((a, b) => a.y !== b.y ? a.y - b.y : a.m - b.m).slice(-8);
    const data = ms.map(({ y, m }) => ({ y, m, ...calcMonth(y, m) }));
    const maxP = Math.max(...data.map(d => Math.abs(d.profit)), 1);
    return data.map(d => ({ ...d, pct: Math.round(Math.abs(d.profit) / maxP * 100) }));
  }, [sessions, monthKeys, selfIds]);

  const delta = (a, b) => {
    if (b === 0) return a === 0 ? null : 100;
    return Math.round((a - b) / Math.abs(b) * 100);
  };
  const profitDelta = delta(cur.profit, prev.profit);
  const paceDelta = delta(profitMTD, profitPrevMTD);

  const byClient = useMemo(() => {
    const map = {};
    cur.sessions.forEach(s => {
      if (!map[s.clientId]) map[s.clientId] = { billed: 0, profit: 0, count: 0 };
      map[s.clientId].billed += s.amountBilled;
      map[s.clientId].profit += s.profit;
      map[s.clientId].count += 1;
    });
    return Object.entries(map).map(([id, v]) => {
      const cl = clients.find(c => c.id === id);
      return { id, name: (cl && cl.name) || "?", isSelf: selfIds.has(id), ...v };
    }).sort((a, b) => {
      if (a.isSelf !== b.isSelf) return a.isSelf ? 1 : -1;
      return b.billed - a.billed;
    });
  }, [cur.sessions, clients, selfIds]);

  const h = React.createElement;
  return h("main", { style: S.main },
    h("div", { style: { marginBottom: 14 } },
      h("select", {
        style: { ...S.inp, fontSize: 14, fontWeight: 700 },
        value: `${selYr}-${selMo}`,
        onChange: e => {
          const [y, m] = e.target.value.split("-").map(Number);
          setSelYr(y);
          setSelMo(m);
        }
      }, monthKeys.map(({ y, m }) => h("option", { key: `${y}-${m}`, value: `${y}-${m}` }, MONTHS[m], " ", y)))
    ),
    h("div", { style: S.statBox },
      h("div", { style: S.statTitle }, "📊 ", MONTHS[selMo], " ", selYr, h("span", {
        style: { fontWeight: 500, fontSize: 11, color: "#9ca3af", marginRight: 8 }
      }, "· לקוחות בלבד")),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "הכנסות"), h("span", { style: { fontWeight: 700, color: "#6366f1" } }, ils(cur.income))),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "הוצאות (עלות חשמל) 🔒"), h("span", { style: { fontWeight: 700, color: "#ef4444" } }, ilsFull(cur.expense))),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "רווח"), h("span", { style: { fontWeight: 800, color: "#10b981", fontSize: 16 } },
        ilsFull(cur.profit),
        profitDelta !== null && h("span", { style: { fontSize: 11, marginRight: 6, color: profitDelta >= 0 ? "#10b981" : "#ef4444" } },
          profitDelta >= 0 ? "▲" : "▼", " ", Math.abs(profitDelta), "% מחודש קודם (מלא)")
      )),
      h("div", { style: { ...S.pRow, background: "#f0fdf4", margin: "6px -4px", padding: "8px 10px", borderRadius: 10, alignItems: "flex-start" } },
        h("span", { style: { color: "#065f46", fontSize: 13, fontWeight: 600, lineHeight: 1.35 } },
          isCurMonth ? `קצב עד היום (יום ${paceDay})` : `קצב עד יום ${paceDay}`),
        h("span", { style: { fontWeight: 800, color: "#059669", fontSize: 14, textAlign: "left", lineHeight: 1.35 } },
          ilsFull(profitMTD),
          h("div", { style: { fontSize: 11, fontWeight: 600, color: paceDelta == null ? "#6b7280" : paceDelta >= 0 ? "#10b981" : "#ef4444" } },
            profitPrevMTD === 0 && profitMTD === 0
              ? "אין נתונים להשוואה"
              : `חודש שעבר עד יום ${paceDay}: ${ilsFull(profitPrevMTD)}${paceDelta != null ? ` · ${paceDelta >= 0 ? "▲" : "▼"}${Math.abs(paceDelta)}%` : ""}`
          )
        )
      ),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "טעינות לקוחות"), h("span", { style: { fontWeight: 700 } },
        cur.count,
        cur.selfCount > 0 ? h("span", { style: { color: "#9ca3af", fontSize: 11, fontWeight: 500, marginRight: 6 } }, "+ ", cur.selfCount, " עצמי") : null
      )),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "סה״כ קוט\"ש (לקוחות)"), h("span", { style: { fontWeight: 700 } }, cur.kwh)),
      cur.count > 0 && h(React.Fragment, null,
        h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "ממוצע קוט\"ש לטעינה"), h("span", null, Math.round(cur.kwh / cur.count))),
        h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "ממוצע רווח לטעינה"), h("span", { style: { color: "#10b981" } }, ilsFull(cur.profit / cur.count)))
      )
    ),
    byClient.length > 0 && h("div", { style: S.statBox },
      h("div", { style: S.statTitle }, "👥 פירוט לפי לקוח"),
      byClient.map(c => h("div", { key: c.id, style: S.pRow },
        h("span", { style: { fontSize: 13, color: c.isSelf ? "#0ea5c6" : undefined } },
          c.name, c.isSelf ? " · עצמי" : "", " ",
          h("span", { style: { color: "#9ca3af", fontSize: 11 } }, "(", c.count, ")")
        ),
        h("span", { style: { fontSize: 13 } },
          h("span", { style: { fontWeight: 700, color: c.isSelf ? "#0ea5c6" : "#6366f1" } },
            c.isSelf ? `${ilsFull(c.billed)} עלות` : ils(c.billed)
          ),
          !c.isSelf && h("span", { style: { color: "#10b981", fontSize: 11, marginRight: 6 } }, "רווח ", ilsFull(c.profit))
        )
      ))
    ),
    h("div", { style: S.statBox },
      h("div", { style: S.statTitle }, "📈 רווח לפי חודש (לקוחות)"),
      graphMonths.map(gm => h("div", {
        key: `${gm.y}-${gm.m}`,
        style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }
      },
        h("span", {
          style: {
            width: 64, fontSize: 11,
            color: gm.y === selYr && gm.m === selMo ? "#6366f1" : "#6b7280",
            fontWeight: gm.y === selYr && gm.m === selMo ? 700 : 400
          }
        }, MONTHS[gm.m].slice(0, 4), " ", String(gm.y).slice(2)),
        h("div", { style: { flex: 1, background: "#f3f4f6", borderRadius: 6, height: 18 } },
          h("div", {
            style: {
              width: `${gm.pct}%`,
              background: gm.profit >= 0 ? "#10b981" : "#ef4444",
              height: "100%", borderRadius: 6,
              minWidth: gm.profit !== 0 ? 4 : 0
            }
          })
        ),
        h("span", { style: { width: 72, fontSize: 11, fontWeight: 700, textAlign: "left", color: "#374151" } }, ilsFull(gm.profit))
      ))
    ),
    h("div", { style: { ...S.statBox, borderTop: "3px solid #6366f1" } },
      h("div", { style: S.statTitle }, "🏆 סך הכל (לקוחות, כל הזמנים)"),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "הכנסות"), h("span", { style: { fontWeight: 700, color: "#6366f1" } }, ils(allIncome))),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "הוצאות 🔒"), h("span", { style: { fontWeight: 700, color: "#ef4444" } }, ilsFull(allExpense))),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "רווח כולל"), h("span", { style: { fontWeight: 800, color: "#10b981", fontSize: 16 } }, ilsFull(allProfit))),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "טעינות לקוחות"), h("span", { style: { fontWeight: 700 } }, bizAll.length))
    )
  );
}

