import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("theory is bilingual, interactive, accessible and makes no generation calls", async ({
  page,
}, info) => {
  const errors: string[] = [],
    calls: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.method() === "POST") calls.push(r.url());
  });
  await page.goto("/theory");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Comprendre le RAG.",
  );
  await expect(page).toHaveTitle(/Théorie/);
  await expect(
    page.getByRole("link", { name: "Théorie", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const navRows = await page
    .locator(".pdf-topnav a")
    .evaluateAll((links) =>
      links.map((link) => Math.round(link.getBoundingClientRect().y)),
    );
  expect(new Set(navRows).size).toBe(1);
  await expect(page.getByRole("tab")).toHaveCount(3);
  await page.getByRole("tab", { name: /Préparer/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Retrouver/ })).toHaveAttribute(
    "data-state",
    "active",
  );
  await expect(page.locator(".demo-evidence")).toContainText("25 jours");
  await page.getByRole("button", { name: "La formation", exact: true }).click();
  await expect(page.locator(".demo-evidence")).toContainText("500 euros");
  await page.getByRole("tab", { name: /Répondre/ }).click();
  await expect(page.locator(".demo-answer")).toContainText("500 euros");
  await page
    .getByRole("button", { name: "Information absente", exact: true })
    .click();
  await expect(page.locator(".demo-answer")).toContainText("ne permettent pas");
  await page.getByRole("tab", { name: /Retrouver/ }).click();
  await expect(page.locator(".demo-empty")).toContainText(
    "contexte reste vide",
  );
  await page.getByRole("button", { name: /Génération & références/ }).click();
  await expect(page.locator(".technology-stack")).toContainText(
    "openai/gpt-oss-20b",
  );
  await page.getByRole("tabpanel").evaluate(async (e) => {
    await Promise.all(e.getAnimations().map((a) => a.finished));
  });
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Les congés", exact: true }).click();
  await page.getByRole("tab", { name: /Préparer/ }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `../evidence/refined-theory-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Understanding RAG.",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("link", { name: "Theory", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Training", exact: true }).click();
  await page.getByRole("tab", { name: /Answer/ }).click();
  await expect(page.locator(".demo-answer")).toContainText("500 euros");
  await page.getByRole("tabpanel").evaluate(async (e) => {
    await Promise.all(e.getAnimations().map((a) => a.finished));
  });
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("link", { name: "Documents", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your documents",
  );
  await page.getByRole("button", { name: "FR", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `../evidence/refined-home-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("link", { name: "Théorie", exact: true }).click();
  expect(
    await page
      .locator(".theory-view")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
});
