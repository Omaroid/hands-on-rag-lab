import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  bm25Breakdown,
  terms,
  retrieve,
  type Passage,
} from "../src/pdf-retrieval";
import path from "node:path";
test("published architecture route, interactive maths, accessible responsive layout and navigation", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/architecture");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Chaque calcul",
  );
  await expect(page.locator(".arch-node")).toHaveCount(8);
  for (let i = 0; i < 8; i++) {
    await page.locator(".arch-node").nth(i).click();
    await expect(page.locator(".arch-node").nth(i)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(".arch-step-detail")).toBeVisible();
  }
  await page.getByRole("slider", { name: "Rang vectoriel" }).fill("21");
  await page.getByRole("checkbox", { name: "Aucun résultat lexical" }).check();
  await expect(page.locator(".arch-total strong")).toHaveText("0.000000");
  await page.getByRole("button", { name: "Cosinus", exact: true }).click();
  await expect(page.locator(".arch-total strong")).toHaveText("0.800000");
  await page.getByRole("button", { name: "BM25", exact: true }).click();
  await expect(page.locator(".arch-term-table tbody tr")).toHaveCount(2);
  await page.locator(".arch-technical summary").click();
  await expect(page.locator(".arch-technical")).toContainText("Aucun plafond");
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Fusion RRF", exact: true }).click();
  await page.getByRole("slider", { name: "Rang vectoriel" }).fill("1");
  await page
    .getByRole("checkbox", { name: "Aucun résultat lexical" })
    .uncheck();
  await page.locator(".arch-node").first().click();
  await page.screenshot({
    path: `../evidence/architecture-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Every calculation",
  );
  await page.getByRole("link", { name: "Documents", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your documents",
  );
  await page.goBack();
  await expect(page).toHaveURL(/architecture/);
  expect(errors).toEqual([]);
});
test("math uses filtered corpus and preserves numerical retrieval scores", () => {
  const docs = ["congés payés congés", "congés maladie", "frais repas"].map(
      terms,
    ),
    query = ["conges", "payes"];
  const b = bm25Breakdown(docs, query, 0);
  const expected =
    (Math.log(1 + (3 - 2 + 0.5) / (2 + 0.5)) * 2 * 2.2) /
      (2 + 1.2 * (0.25 + (0.75 * 3) / (7 / 3))) +
    (Math.log(1 + (3 - 1 + 0.5) / (1 + 0.5)) * 2.2) /
      (1 + 1.2 * (0.25 + (0.75 * 3) / (7 / 3)));
  expect(b.score).toBeCloseTo(expected, 12);
  const passages: Passage[] = docs.map((d, i) => ({
    id: String(i),
    file: i === 2 ? "b.pdf" : "a.pdf",
    page: 1,
    text: d.join(" "),
    ocr: false,
    tokens: 20,
    vector: [1, 0],
  }));
  const r = retrieve(passages, "congés payés", [1, 0], "a.pdf");
  expect(r.hits).toHaveLength(2);
  expect(r.queryVector).toEqual([1, 0]);
  expect(r.hits.find((h) => h.chunk.id === "0")?.bm25).toBeCloseTo(
    bm25Breakdown(docs.slice(0, 2), query, 0).score,
    12,
  );
  expect(r.hits[0].rrf).toBeCloseTo(2 / 61, 12);
});
test("real PDF and encoder search remains available across architecture navigation", async ({
  page,
}) => {
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
  await page
    .locator("#pdf-files")
    .setInputFiles(path.resolve("tests/fixtures/guide.pdf"));
  await page.getByRole("button", { name: "Lire et indexer les PDF" }).click();
  await expect(page.getByRole("status")).toContainText("Index prêt", {
    timeout: 90000,
  });
  await page
    .locator("#pdf-question")
    .fill("Combien de jours de congés payés par an ?");
  await page.getByRole("button", { name: "Explorer les preuves" }).click();
  await expect(page.locator(".answer-panel")).toBeVisible({ timeout: 30000 });
  await page.getByRole("link", { name: "Architecture", exact: true }).click();
  await page
    .getByRole("button", { name: "Votre recherche", exact: true })
    .click();
  await expect(page.locator(".arch-passage-select")).toContainText("guide.pdf");
  await expect(page.locator(".arch-total strong")).not.toHaveText("0.000000");
  await page.getByRole("button", { name: "BM25", exact: true }).click();
  await expect(page.locator(".arch-term-table caption")).toContainText(
    "Combien",
  );
  await page.getByRole("button", { name: "Cosinus", exact: true }).click();
  await expect(page.locator(".arch-vector-display")).toContainText("384");
  await page.getByRole("link", { name: "Documents", exact: true }).click();
  await expect(page.locator("#pdf-question")).toHaveValue(
    "Combien de jours de congés payés par an ?",
  );
  await expect(page.locator(".answer-panel")).toBeVisible();
});
