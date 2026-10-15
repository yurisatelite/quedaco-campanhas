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
    await page.evaluate(async () => {
      const item = {
        uuid: "Item.crystal",
        documentName: "Item",
        name: "Cristal de contenção",
        img: "",
      };
      game.items = [item];
      const resolvePrevious = fromUuid;
      window.fromUuid = async (uuid) =>
        uuid === item.uuid ? item : resolvePrevious(uuid);
      window.quest = {
        id: "q1",
        name: "Expedição a Noátorá",
        playernotes: "Vamos procurar nas galerias.",
        tasks: [{ uuidv4: "t1", name: "Explorar a entrada", completed: false }],
        description: "",
        save: async () => {
          window.questSaves = (window.questSaves || 0) + 1;
          return "q1";
        },
      };
      game.modules.set("forien-quest-log", {
        active: true,
        public: {
          QuestAPI: {
            DB: { getAllQuests: () => [quest] },
            open: () => {
              window.openedQuest = true;
            },
          },
        },
      });
      await app.mutate((campaign) => {
        campaign.scenes
          .slice(0, 4)
          .forEach((scene) => (scene.mapSceneIds = ["entrance"]));
      });
    });
    const mapGroup = page.locator('[data-map-group="entrance"]');
    assert.ok((await mapGroup.innerText()).includes("4 de 12 cenas"));
    assert.equal(await mapGroup.locator(".qc-step-number").count(), 4);
    await page
      .getByRole("button", { name: "Adicionar sala", exact: true })
      .click();
    await page
      .locator('[data-room-field="description"]')
      .fill("O salão guarda marcas de calor.");
    await page
      .getByRole("button", { name: "Salvar sala", exact: true })
      .click();
    await page.locator('[name="loot-item"]').selectOption("Item.crystal");
    await page
      .getByRole("button", { name: "Preparar item", exact: true })
      .click();
    await page.locator('.qc-loot [data-item-uuid="Item.crystal"]').waitFor();
    assert.equal(
      await mapGroup.locator(".qc-inline-resources [data-item-uuid]").count(),
      1,
    );
    await page.locator('[data-action="link-quest"]').selectOption("q1");
    await page.locator('[data-action="link-quest-task"]').selectOption("t1");
    await page
      .getByRole("button", {
        name: "Concluir cena e atualizar missão",
        exact: true,
      })
      .click();
    await page.waitForFunction(() => quest.tasks[0].completed === true);
    assert.equal(
      await page.evaluate(() => quest.playernotes),
      "Vamos procurar nas galerias.",
    );
    await page.locator("#app").evaluate((element) => (element.scrollTop = 0));
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
