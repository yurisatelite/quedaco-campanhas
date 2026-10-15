import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { chromium } from "playwright";

test("interface salva notas, troca NPC, prepara token, associa mapa e preserva o original", async () => {
  const root = resolve(import.meta.dirname, "..");
  const server = createServer(async (req, res) => {
    try {
      const file = resolve(
        root,
        "." + new URL(req.url, "http://localhost").pathname,
      );
      if (!file.startsWith(root + sep)) throw Error("Path");
      res.setHeader(
        "Content-Type",
        file.endsWith(".mjs")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : "text/html",
      );
      res.end(await readFile(file));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `http://127.0.0.1:${server.address().port}/tests/ui-fixture.html`,
    );
    await page.waitForFunction(() => window.fixtureReady);
    assert.equal(await page.locator(".qc-campaign-card").count(), 1);
    await page
      .locator('[data-scene-field="notes"]')
      .fill("Segredo da Mestra: a garra foi roubada.");
    await page
      .getByRole("button", { name: "Salvar preparação e notas", exact: true })
      .click();
    await page.waitForFunction(() =>
      JSON.parse(
        game.journal[0].pages[0].text.markdown,
      ).scenes[0].notes.includes("Segredo"),
    );
    await page.locator('[data-action="select-scene"]').nth(1).click();
    assert.equal(
      await page.locator('[data-scene-field="notes"]').inputValue(),
      "",
    );
    await page.locator('[data-action="select-scene"]').first().click();
    assert.ok(
      (await page.locator('[data-scene-field="notes"]').inputValue()).includes(
        "Segredo",
      ),
    );
    await page
      .locator('[data-action="replace-npc"]')
      .first()
      .selectOption("Actor.replacement");
    await page.waitForFunction(
      () =>
        JSON.parse(game.journal[0].pages[0].text.markdown).npcProfiles[0]
          .actorUuid === "Actor.replacement",
    );
    assert.ok(
      (await page.locator(".qc-npc-profile").first().innerText()).includes(
        "ressonância",
      ),
    );
    await page.locator('[data-action="prepare-profile"]').first().click();
    await page
      .locator('.qc-roster [data-actor-uuid="Actor.replacement"]')
      .waitFor();
    await page
      .locator('[name="map-c01-memoria-sem-reflexo"]')
      .selectOption("entrance");
    await page.locator('[data-action="add-map"]').first().click();
    await page.locator(".qc-open-map").click();
    assert.equal(await page.evaluate(() => window.openedMap), "entrance");
    await page.locator(".qc-campaign-info>summary").click();
    await page
      .locator('[name="working-material"]')
      .fill("Minha campanha adaptada");
    await page
      .getByRole("button", { name: "Salvar cópia de trabalho", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        JSON.parse(game.journal[0].pages[0].text.markdown).working.material ===
        "Minha campanha adaptada",
    );
    assert.ok(
      await page.evaluate(() =>
        JSON.parse(
          game.journal[0].pages[0].text.markdown,
        ).original.material.includes("Noátorá"),
      ),
    );
    await page.screenshot({
      path: resolve(root, "dist", "preview.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => notifications), []);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
