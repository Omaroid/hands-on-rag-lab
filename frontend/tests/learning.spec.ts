import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
test("workshop explains actual indexing and retrieval, quiz and responsive accessibility", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.route("https://huggingface.co/**", async (route) => {
    const file = route
      .request()
      .url()
      .split("/resolve/")[1]
      ?.split("/")
      .slice(1)
      .join("/");
    await route.fulfill({
      status: 307,
      headers: {
        location: new URL("/_test-model/" + file, page.url()).href,
        "access-control-allow-origin": "*",
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /L’atelier des preuves/ }).click();
  await expect(page.locator(".lab-stats")).toContainText("0");
  await page.locator(".lab-track button").nth(1).click();
  await expect(page.locator(".lab-object")).toContainText(
    "préparation du tokenizer",
  );
  await page.locator(".lab-quiz summary").click();
  await page
    .getByRole("button", { name: "Il rédige déjà la réponse", exact: true })
    .click();
  await expect(page.locator(".lab-feedback")).toContainText(
    "E5 ne rédige rien",
  );
  await page
    .getByRole("button", {
      name: "Il prépare la recherche de sens",
      exact: true,
    })
    .click();
  await expect(page.locator(".lab-feedback")).toContainText("Exact");
  await page
    .locator("#pdf-files")
    .setInputFiles(path.resolve("tests/fixtures/guide.pdf"));
  await page.getByRole("button", { name: "Lire et indexer les PDF" }).click();
  await expect(page.getByRole("status")).toContainText("Index prêt", {
    timeout: 90000,
  });
  const counts = await page.locator(".lab-stats strong").allTextContents();
  expect(counts[0]).toBe("1");
  expect(Number(counts[1])).toBeGreaterThan(0);
  expect(counts[1]).toBe(counts[2]);
  expect(counts[3]).toBe("0");
  await page.locator(".lab-track button").nth(0).click();
  await expect(page.locator(".lab-object")).toContainText("25 jours");
  await page.locator(".lab-track button").nth(1).click();
  await expect(page.locator(".lab-text-card")).toContainText("tokens E5");
  await page.locator(".lab-track button").nth(2).click();
  await expect(page.locator(".lab-vector rect")).toHaveCount(16);
  await page
    .locator("#pdf-question")
    .fill("Combien de jours de congés payés ?");
  await page.getByRole("button", { name: "Explorer les preuves" }).click();
  await expect(page.locator(".answer-panel")).toBeVisible({ timeout: 30000 });
  await page.locator(".lab-track button").nth(3).click();
  await expect(page.locator(".lab-race")).toContainText("guide.pdf");
  await expect(page.locator(".lab-race")).toContainText("RRF");
  await page.locator(".lab-track button").nth(4).click();
  await expect(page.locator(".lab-basket")).toContainText("1");
  expect(
    (
      await new AxeBuilder({ page })
        .include(".lab-journey")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".lab-track button").nth(2).click();
  await page
    .locator(".lab-journey")
    .screenshot({ path: `../evidence/workshop-${info.project.name}.png` });
  await page
    .getByRole("button", { name: "Supprimer et réinitialiser", exact: true })
    .click();
  expect(await page.locator(".lab-stats strong").allTextContents()).toEqual([
    "0",
    "0",
    "0",
    "0",
  ]);
  await expect(page.locator(".lab-vector")).toHaveCount(0);
});
