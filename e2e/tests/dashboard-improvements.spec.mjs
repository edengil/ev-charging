import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

const CLIENT_B = { id: "c-e2e-b", name: "בדיקה לוי", phone: "0507654321", notes: "e2e" };
const CLIENT_C = { id: "c-e2e-c", name: "בדיקה שדה", phone: "0501112223", notes: "e2e" };

const sess = (id, clientId, billed) => ({
  id,
  clientId,
  date: new Date().toISOString(),
  kwhRaw: 10,
  kwhInflated: 12.1,
  amountBilled: billed,
  costToOwner: 20,
  profit: billed - 20,
  rateUsed: 1.2,
  source: "manual",
  notes: ""
});

test.describe("dashboard-improvements", () => {
  test("צ׳יפי סינון לקוחות + כרטיס גביית החודש", async ({ page }) => {
    // A: חויב 200, לא שילם → חוב. B: חויב 100, שילם 100 → מוסדר. C: שילם 50 בלי חיוב → זכות.
    const sessions = [sess("s-a", CLIENT_A.id, 200), sess("s-b", CLIENT_B.id, 100)];
    const payments = [
      { id: "p-b", clientId: CLIENT_B.id, amount: 100, date: new Date().toISOString() },
      { id: "p-c", clientId: CLIENT_C.id, amount: 50, date: new Date().toISOString() }
    ];
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_B, CLIENT_C, CLIENT_SELF],
      sessions,
      payments
    });

    // כרטיס גבייה: חויב 300, נגבה 150 → 50%
    const card = page.getByTestId("collection-card");
    await expect(card).toBeVisible();
    await expect(card).toContainText("150");
    await expect(card).toContainText("300");
    await expect(card).toContainText("50% שולם");
    const barWidth = await page.getByTestId("collection-bar").evaluate(el => el.style.width);
    expect(barWidth).toBe("50%");

    // צ׳יפים עם ספירות
    await expect(page.getByTestId("clients-filter-debt")).toContainText("(1)");
    await expect(page.getByTestId("clients-filter-settled")).toContainText("(1)");
    await expect(page.getByTestId("clients-filter-credit")).toContainText("(1)");

    // סינון לחייבים — רק A נשאר
    await page.getByTestId("clients-filter-debt").click();
    await expect(page.getByTestId(`client-card-${CLIENT_A.id}`)).toBeVisible();
    await expect(page.getByTestId(`client-card-${CLIENT_B.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`client-card-${CLIENT_C.id}`)).toHaveCount(0);

    // סינון לזכות — רק C
    await page.getByTestId("clients-filter-credit").click();
    await expect(page.getByTestId(`client-card-${CLIENT_C.id}`)).toBeVisible();
    await expect(page.getByTestId(`client-card-${CLIENT_A.id}`)).toHaveCount(0);

    // חזרה להכל — שלושתם
    await page.getByTestId("clients-filter-all").click();
    await expect(page.getByTestId(`client-card-${CLIENT_A.id}`)).toBeVisible();
    await expect(page.getByTestId(`client-card-${CLIENT_B.id}`)).toBeVisible();
    await expect(page.getByTestId(`client-card-${CLIENT_C.id}`)).toBeVisible();
  });
});
