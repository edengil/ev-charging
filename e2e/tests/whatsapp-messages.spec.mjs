import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

function textFromWaUrl(url) {
  const u = new URL(url);
  return u.searchParams.get("text") || "";
}

test.describe("whatsapp-messages", () => {
  test("תבניות הודעה לפי חוב / זכות / מסולק", async ({ page }) => {
    await openApp(page);
    const msgs = await page.evaluate(() => {
      const { waChargeMessage, waLink } = window.__EV_WA__;
      return {
        settled: waChargeMessage(42, 0),
        debt: waChargeMessage(40, 120),
        credit: waChargeMessage(35, -80),
        self: waChargeMessage(20, 0, { isSelf: true }),
        link: waLink("0501234567", "היי מה קורה?\nיצא לך 42")
      };
    });
    expect(msgs.settled).toBe("היי מה קורה?\nיצא לך 42");
    expect(msgs.debt).toBe("היי מה קורה?\nיצא בטעינה 40\nאנחנו על 120");
    expect(msgs.credit).toBe("היי מה קורה?\nיצא לך 35\nיש לך אצלי 80");
    expect(msgs.self).toBe("היי מה קורה?\nיצא לך 20");
    expect(msgs.link).toContain("api.whatsapp.com/send");
    expect(msgs.link).toContain("phone=972501234567");
    expect(textFromWaUrl(msgs.link)).toContain("יצא לך 42");
  });

  test("לחיצה פותחת טיוטה, וואטסאפ נפתח רק בלחיצה שנייה", async ({ page }) => {
    const sessions = [
      {
        id: "s-wa-1",
        clientId: CLIENT_A.id,
        date: new Date().toISOString(),
        kwhRaw: 10,
        kwhInflated: 12.1,
        amountBilled: 55,
        costToOwner: 20,
        profit: 35,
        rateUsed: 1.2,
        source: "manual",
        notes: ""
      }
    ];
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      sessions,
      payments: []
    });
    await page.getByTestId(`client-card-${CLIENT_A.id}`).click();

    let opened = null;
    await page.exposeFunction("__evCaptureWa", url => {
      opened = url;
    });
    await page.evaluate(() => {
      const orig = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.href && /whatsapp|wa\.me/i.test(this.href)) {
          window.__evCaptureWa(this.href);
          return;
        }
        return orig.call(this);
      };
    });

    await page.getByTestId("wa-session-s-wa-1").click();
    await expect(page.getByTestId("wa-draft")).toBeVisible();
    const draft = await page.getByTestId("wa-draft-text").inputValue();
    expect(draft).toContain("יצא בטעינה 55");
    expect(draft).toContain("אנחנו על 55");
    expect(opened).toBeNull();

    await page.getByTestId("wa-draft-open").click();
    await expect.poll(() => opened).toBeTruthy();
    const text = textFromWaUrl(opened);
    expect(text).toContain("יצא בטעינה 55");
    expect(text).toContain("אנחנו על 55");
  });
});
