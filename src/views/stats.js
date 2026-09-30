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
    h("div", { style: S.hero },
      h("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } },
        h(Icon, { n: "chart", s: 20 }),
        h("span", { style: { fontWeight: 800, fontSize: 15 } }, MONTHS[selMo], " ", selYr),
        h("span", { style: { fontSize: 11, color: "rgba(255,255,255,.88)" } }, "· לקוחות בלבד")),
      h("div", { style: { display: "flex", gap: 22 } },
        h("div", null,
          h("div", { style: { ...S.heroNum, fontSize: 20 } }, ils(cur.income)),
          h("div", { style: S.heroLabel }, "הכנסות")),
        h("div", null,
          h("div", { style: { ...S.heroNum, fontSize: 20 } }, ilsFull(cur.expense)),
          h("div", { style: S.heroLabel }, "הוצאות")),
        h("div", null,
          h("div", { style: { ...S.heroNum, fontSize: 20 } }, ilsFull(cur.profit)),
          h("div", { style: S.heroLabel }, "רווח"),
          profitDelta !== null && h("div", {
            style: {
              display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11,
              marginTop: 5, color: "rgba(255,255,255,.95)",
              background: "rgba(255,255,255,.18)", borderRadius: 999, padding: "2px 8px"
            }
          },
            h(Icon, { n: "chevD", s: 11, style: { transform: profitDelta >= 0 ? "rotate(180deg)" : "none" } }),
            Math.abs(profitDelta), "% מחודש קודם")))),
    h("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6 } },
      h("span", { style: S.chip(C.primarySoft, C.primaryInk) },
        h(Icon, { n: "clock", s: 15 }),
        (isCurMonth ? `קצב עד היום (יום ${paceDay})` : `קצב עד יום ${paceDay}`), ": ", ilsFull(profitMTD),
        paceDelta != null && h("span", { style: { display: "inline-flex", alignItems: "center", gap: 2, marginRight: 6 } },
          h(Icon, { n: "chevD", s: 12, style: { transform: paceDelta >= 0 ? "rotate(180deg)" : "none" } }),
          Math.abs(paceDelta), "%"))),
    h("div", { style: { fontSize: 11, color: C.meta, marginBottom: 14 } },
      profitPrevMTD === 0 && profitMTD === 0
        ? "אין נתונים להשוואה"
        : `חודש שעבר עד יום ${paceDay}: ${ilsFull(profitPrevMTD)}`),
    h("div", { style: S.statBox },
      h("div", { style: S.pRow }, h("span", { style: { color: C.meta, fontSize: 13 } }, "טעינות לקוחות"), h("span", { style: { fontWeight: 700 } },
        cur.count,
        cur.selfCount > 0 ? h("span", { style: { color: C.meta, fontSize: 11, fontWeight: 500, marginRight: 6 } }, "+ ", cur.selfCount, " עצמי") : null
      )),
      h("div", { style: S.pRow }, h("span", { style: { color: C.meta, fontSize: 13 } }, "סה״כ קוט״ש (לקוחות)"), h("span", { style: { fontWeight: 700 } }, cur.kwh)),
      cur.count > 0 && h(React.Fragment, null,
        h("div", { style: S.pRow }, h("span", { style: { color: C.meta, fontSize: 13 } }, "ממוצע קוט״ש לטעינה"), h("span", null, Math.round(cur.kwh / cur.count))),
        h("div", { style: S.pRow }, h("span", { style: { color: C.meta, fontSize: 13 } }, "ממוצע רווח לטעינה"), h("span", { style: { color: C.ok } }, ilsFull(cur.profit / cur.count)))
      )
    ),
    byClient.length > 0 && h("div", { style: S.statBox },
      h("div", { style: { ...S.statTitle, display: "flex", alignItems: "center", gap: 8 } }, h(Icon, { n: "userPlus", s: 18 }), "פירוט לפי לקוח"),
      byClient.map(c => h("div", { key: c.id, style: S.pRow },
        h("span", { style: { fontSize: 13, color: c.isSelf ? C.primary : undefined } },
          c.name, c.isSelf ? " · עצמי" : "", " ",
          h("span", { style: { color: C.meta, fontSize: 11 } }, "(", c.count, ")")
        ),
        h("span", { style: { fontSize: 13 } },
          h("span", { style: { fontWeight: 700, color: c.isSelf ? C.primary : C.primaryStrong } },
            c.isSelf ? `${ilsFull(c.billed)} עלות` : ils(c.billed)
          ),
          !c.isSelf && h("span", { style: { color: C.ok, fontSize: 11, marginRight: 6 } }, "רווח ", ilsFull(c.profit))
        )
      ))
    ),
    h("div", { style: S.statBox },
      h("div", { style: { ...S.statTitle, display: "flex", alignItems: "center", gap: 8 } }, h(Icon, { n: "chart", s: 18 }), "רווח לפי חודש (לקוחות)"),
      graphMonths.map(gm => h("div", {
        key: `${gm.y}-${gm.m}`,
        style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }
      },
        h("span", {
          style: {
            width: 64, fontSize: 11,
            color: gm.y === selYr && gm.m === selMo ? C.primaryStrong : C.meta,
            fontWeight: gm.y === selYr && gm.m === selMo ? 700 : 400
          }
        }, MONTHS[gm.m].slice(0, 4), " ", String(gm.y).slice(2)),
        h("div", { style: { flex: 1, background: "#f3f4f6", borderRadius: 6, height: 18 } },
          h("div", {
            style: {
              width: `${gm.pct}%`,
              background: gm.profit >= 0 ? C.ok : C.err,
              height: "100%", borderRadius: 6,
              minWidth: gm.profit !== 0 ? 4 : 0
            }
          })
        ),
        h("span", { style: { width: 72, fontSize: 11, fontWeight: 700, textAlign: "left", color: C.body } }, ilsFull(gm.profit))
      ))
    ),
    h("div", { style: { ...S.statBox, borderTop: "3px solid " + C.primaryStrong } },
      h("div", { style: { ...S.statTitle, display: "flex", alignItems: "center", gap: 8 } }, h(Icon, { n: "card", s: 18 }), "סך הכל (לקוחות, כל הזמנים)"),
      h("div", { style: S.pRow }, h("span", { style: { color: C.meta, fontSize: 13 } }, "הכנסות"), h("span", { style: { fontWeight: 700, color: C.primaryStrong } }, ils(allIncome))),
      h("div", { style: S.pRow }, h("span", { style: { color: C.meta, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 } }, "הוצאות", h(Icon, { n: "plug", s: 13 })), h("span", { style: { fontWeight: 700, color: C.err } }, ilsFull(allExpense))),
      h("div", { style: S.pRow }, h("span", { style: { color: C.meta, fontSize: 13 } }, "רווח כולל"), h("span", { style: { fontWeight: 800, color: C.ok, fontSize: 16 } }, ilsFull(allProfit))),
      h("div", { style: S.pRow }, h("span", { style: { color: C.meta, fontSize: 13 } }, "טעינות לקוחות"), h("span", { style: { fontWeight: 700 } }, bizAll.length))
    )
  );
}

