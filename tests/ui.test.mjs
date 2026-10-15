import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { chromium } from "playwright";

test("Foundry CSS: pasta visual, narração, recursos automáticos, missão privada e FX por mapa", async () => {
  const root = resolve(import.meta.dirname, "..");
  const foundryPublic =
    "C:/Program Files/Foundry Virtual Tabletop/resources/app/public";
  const server = createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname.startsWith("/modules/quedaco-campanhas/"))
        pathname = pathname.slice("/modules/quedaco-campanhas".length);
      let file =
        pathname === "/foundry.css"
          ? resolve(foundryPublic, "css/foundry2.css")
          : resolve(root, "." + pathname);
      if (
        !file.startsWith(root + sep) &&
        !file.startsWith(resolve(foundryPublic) + sep)
      )
        throw Error("Path");
      let data;
      try {
        data = await readFile(file);
      } catch {
        file = resolve(foundryPublic, "." + pathname);
        if (!file.startsWith(resolve(foundryPublic) + sep)) throw Error("Path");
        data = await readFile(file);
      }
      res.setHeader(
        "Content-Type",
        file.endsWith(".mjs")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".svg")
              ? "image/svg+xml"
              : "text/html",
      );
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1180, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `http://127.0.0.1:${server.address().port}/tests/ui-fixture.html`,
    );
    await page.waitForFunction(() => window.fixtureReady && !app.busy);
    const wait = () => page.waitForFunction(() => !app.busy);
    const tab = async (name) => {
      await page
        .locator(`[data-action="detail-tab"][data-tab="${name}"]`)
        .click();
      await wait();
    };
    // Primeira tela: seleção de campanhas empilhadas, com data e descrição curta.
    assert.equal(
      await page.locator(".qc-picker h1").innerText(),
      "Selecionar campanha",
    );
    assert.equal(await page.locator(".qc-campaign-row").count(), 1);
    const pickerRow = await page.locator(".qc-campaign-row").innerText();
    assert.ok(pickerRow.includes("Uma viagem estranha"));
    assert.ok(pickerRow.includes("Era das Estações · 105 A.F."));
    assert.ok(pickerRow.includes("memória"));
    await page.locator('[data-action="open-campaign"]').click();
    await wait();
    await page.waitForFunction(
      () => document.querySelector(".qc-cover")?.naturalWidth > 0,
    );
    assert.equal(
      await page.locator(".qc-header h1").innerText(),
      "Uma viagem estranha",
    );
    // Sem cena escolhida o painel mostra a campanha inteira e o texto dela.
    assert.equal(await page.locator('[data-scene-field="title"]').count(), 0);
    assert.ok(
      (await page.locator(".qc-detail").innerText()).includes(
        "Texto da campanha",
      ),
    );
    assert.ok((await page.locator(".qc-material h3").count()) > 0);
    assert.ok((await page.locator(".qc-overview-card").count()) >= 3);
    await page.screenshot({
      path: resolve(root, "dist", "preview-overview-0.4.0.png"),
    });
    assert.equal(
      await page.locator(".qc-material").evaluate((el) => el.innerText.includes("schema:")),
      false,
    );
    assert.match(
      await page.locator(".qc-scene-library").innerText(),
      /Sem mapa · 8/,
    );
    await page
      .locator(
        '.qc-library-scene [data-action="select-scene"][data-scene="c01-memoria-sem-reflexo"]',
      )
      .click();
    await wait();
    assert.ok(
      (await page.locator(".qc-scene-header small").innerText()).includes(
        "CENA 01 · USO DA MESTRA",
      ),
    );
    assert.equal(await page.locator('input[type="checkbox"]').count(), 0);
    assert.equal(
      await page
        .locator('[data-scene-field="kind"]')
        .evaluate((el) => el.tagName),
      "SELECT",
    );
    assert.ok(
      (await page.locator('[data-scene-field="title"]').boundingBox()).height <=
        40,
    );
    assert.equal(
      await page.locator('[data-scene-field="entryPoint"]').count(),
      0,
    );
    assert.ok(
      await page
        .locator('[data-scene-field="narration"]')
        .evaluate(
          (el) =>
            parseFloat(getComputedStyle(el).fontSize) >= 16 &&
            el.clientHeight >= 200,
        ),
    );
    const main = await page.locator(".qc-main").boundingBox(),
      board = await page.locator(".qc-board").boundingBox();
    assert.ok(board.y + board.height <= main.y + 1);

    await page.locator('[data-action="select-folder"]').selectOption("noatora");
    await wait();
    assert.ok(
      (await page.locator(".qc-breadcrumb").innerText()).includes(
        "Mapas Teste › Noa Torá",
      ),
    );
    assert.equal(await page.locator(".qc-map-tile").count(), 2);
    assert.equal(await page.locator(".qc-folder-node").count(), 1);
    assert.equal(
      await page.locator('.qc-map-tile:has-text("02")').isVisible(),
      false,
    );
    await page.locator(".qc-folder-node > summary").click();
    assert.equal(
      await page.locator('.qc-map-tile:has-text("02")').isVisible(),
      true,
    );
    assert.equal(
      await page
        .locator(".qc-map-tile")
        .filter({ hasText: "Arcane exterior" })
        .count(),
      0,
    );
    await page.waitForFunction(
      () => document.querySelector(".qc-map-tile img")?.naturalWidth > 0,
    );
    await page
      .locator('[data-action="assign-map"][data-map="entrance"]')
      .click();
    await wait();
    assert.equal(await page.locator(".qc-assigned-maps img").count(), 1);
    await page.locator(".qc-folder-node > summary").click();
    await page.locator('[data-action="assign-map"][data-map="lower"]').click();
    await wait();
    assert.deepEqual(
      await page.evaluate(() => app.selectedScene.mapSceneIds),
      ["lower"],
    );
    await page.locator(".qc-folder-node > summary").click();
    await page.locator('[data-action="assign-map"][data-map="lower"]').click();
    await wait();
    assert.deepEqual(await page.evaluate(() => app.selectedScene.mapSceneIds), []);
    await page.locator('[data-action="assign-map"][data-map="entrance"]').click();
    await wait();
    await page.locator('.qc-assigned-maps [data-action="open-map"]').click();
    await wait();
    assert.equal(await page.evaluate(() => openedMap), "entrance");

    await page
      .locator('[data-scene-field="narration"]')
      .fill(
        "Dois lobos guardam uma passagem. Uma poção de cura repousa sobre uma bancada.\n\nO ar da galeria está quente e a água ecoa sob o piso. As marcas de ferramentas desaparecem dentro da penumbra.",
      );
    await page
      .locator('[data-scene-field="notes"]')
      .fill("SEGREDO PRIVADO DA MESTRA");
    await page.locator('[data-action="toggle-profile"]').first().click();
    await wait();
    assert.equal(
      await page
        .locator('[data-action="toggle-profile"]')
        .first()
        .getAttribute("aria-pressed"),
      "true",
    );
    await page
      .getByRole("button", { name: "Salvar preparação e notas", exact: true })
      .click();
    await wait();
    await tab("recursos");
    assert.equal(
      await page
        .locator(
          '.qc-resource-panel [data-actor-uuid="Compendium.skyfall.monsters.Actor.lobo"]',
        )
        .count(),
      1,
    );
    assert.equal(
      await page
        .locator(
          '.qc-resource-panel [data-actor-uuid="Compendium.skyfall.monsters.Actor.lobo"] b',
        )
        .innerText(),
      "2",
    );
    assert.equal(
      await page
        .locator(
          '.qc-loot [data-item-uuid="Compendium.skyfall.equipment.Item.potion"]',
        )
        .count(),
      1,
    );
    assert.equal(await page.locator('[data-action="add-room"]').count(), 0);
    await tab("missao");
    assert.equal(await page.locator(".qc-quest-card img").count(), 1);
    await page.locator(".qc-quest-card").click();
    await wait();
    assert.equal(await page.evaluate(() => window.questSaves || 0), 0);
    await page.locator('[data-action="link-quest-task"]').selectOption("t1");
    await wait();
    await page
      .getByRole("button", {
        name: "Concluir cena e atualizar missão",
        exact: true,
      })
      .click();
    await wait();
    assert.equal(await page.evaluate(() => quest.tasks[0].completed), true);
    assert.equal(
      await page.evaluate(() => quest.playernotes),
      "Vamos procurar nas galerias.",
    );
    assert.ok(
      !(await page.evaluate(() => quest.description)).includes("SEGREDO"),
    );
    assert.equal(await page.locator('input[type="checkbox"]').count(), 0);

    await tab("roteiro");
    await page.locator('[name="fx-preset"]').fill("fog");
    await page
      .getByRole("button", { name: "Aplicar e guardar", exact: true })
      .click();
    await wait();
    assert.equal(await page.evaluate(() => fxPlays.length), 1);
    await page.locator('.qc-assigned-maps [data-action="open-map"]').click();
    await wait();
    assert.equal(await page.evaluate(() => fxPlays.length), 1);
    await page.locator('[data-action="fx-particles"]').click();
    await wait();
    assert.deepEqual(await page.evaluate(() => fxEditor), {
      kind: "particles",
      mapId: "entrance",
    });
    await page.evaluate(() => {
      delete window.FXMASTER;
    });
    await page.evaluate(() => app.render());
    await page.locator('[data-action="fx-filters"]').click();
    await wait();
    assert.deepEqual(await page.evaluate(() => fxEditor), {
      kind: "filters",
      mapId: "entrance",
    });

    await page
      .locator('[data-action="new-map-scene"][data-map="entrance"]')
      .click();
    await wait();
    assert.equal(
      await page.evaluate(() => app.campaign.scenes[1].title),
      "Nova cena deste mapa",
    );
    await page
      .locator('[data-scene-field="presentation"]')
      .selectOption("image");
    await wait();
    assert.equal(
      await page.locator('[data-scene-field="presentation"]').inputValue(),
      "image",
    );
    await page.locator('[data-action="pick-image"]').click();
    await wait();
    await page.locator('.qc-scene-media [data-action="open-image"]').click();
    await wait();
    assert.equal(await page.evaluate(() => window.sharedImage || null), null);
    await page.locator('.qc-scene-media [data-action="share-image"]').click();
    await wait();
    assert.ok(
      await page.evaluate(() => sharedImage.src.includes("viagem-estranha")),
    );
    assert.equal(await page.locator(".qc-fx").count(), 0);

    await page.evaluate(async () => {
      await app.mutate((campaign) => {
        campaign.scenes[0].mapSceneIds = ["entrance"];
        campaign.scenes[0].presentation = "map";
        campaign.scenes[2].mapSceneIds = ["entrance"];
        campaign.scenes[2].presentation = "map";
      });
    });
    const sceneOrder = await page
      .locator('.qc-board-map[data-map-drop="entrance"] .qc-board-scenes b')
      .allTextContents();
    assert.deepEqual(sceneOrder.slice(0, 3), ["01", "02", "03"]);

    // Arrastar uma cena da biblioteca para um mapa do quadro, e de volta.
    const loose = '.qc-library-scene[data-drag-scene="c04-rota-esquecida"]';
    await page
      .locator(loose)
      .dragTo(page.locator('.qc-board-map[data-map-drop="lower"]'));
    await wait();
    assert.deepEqual(
      await page.evaluate(
        () =>
          app.campaign.scenes.find((row) => row.id === "c04-rota-esquecida")
            .mapSceneIds,
      ),
      ["lower"],
    );
    assert.ok(
      (
        await page
          .locator('.qc-board-map[data-map-drop="lower"] .qc-board-scenes')
          .innerText()
      ).includes("A rota esquecida"),
    );
    await page
      .locator('.qc-board-map[data-map-drop="lower"] [data-drag-scene="c04-rota-esquecida"]')
      .dragTo(page.locator(".qc-scene-library > header"));
    await wait();
    assert.deepEqual(
      await page.evaluate(
        () =>
          app.campaign.scenes.find((row) => row.id === "c04-rota-esquecida")
            .mapSceneIds,
      ),
      [],
    );

    await page.locator('.qc-board [data-action="select-scene"]').first().click();
    await wait();
    assert.ok(await page.locator(".qc-board").isVisible());
    assert.ok((await page.locator(".qc-board-map").count()) >= 2);
    // Nada do quadro pode vazar do próprio cartão (problema da 0.3).
    assert.ok(
      await page.evaluate(() =>
        [...document.querySelectorAll(".qc-board-map")].every((card) => {
          const box = card.getBoundingClientRect();
          return [...card.querySelectorAll("button, img, strong")].every(
            (child) => {
              const inner = child.getBoundingClientRect();
              return (
                inner.left >= box.left - 1 &&
                inner.right <= box.right + 1 &&
                inner.bottom <= box.bottom + 1
              );
            },
          );
        }),
      ),
    );
    assert.ok(
      await page
        .locator(".qc-shell")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    await page.locator(".qc-detail").evaluate((el) => (el.scrollTop = 0));
    for (const width of [1180, 900]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(
        await page
          .locator(".qc-detail")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      );
      assert.ok(
        await page
          .locator(".qc-scenes")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      );
    }
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.screenshot({
      path: resolve(root, "dist", "preview-0.4.0.png"),
      fullPage: true,
    });

    await page.evaluate(async () => {
      await app.mutate((campaign) => {
        campaign.resourceProfiles.push({
          id: "threat:guardian",
          kind: "threat",
          name: "Sentinela deformada",
          description: "Protege o receptáculo.",
          uuid: "",
        });
        campaign.scenes[0].resourceRefs = [
          { id: "threat:guardian", quantity: 2 },
        ];
      });
    });
    await tab("recursos");
    assert.ok(
      (
        await page
          .locator('[data-resource-profile="threat:guardian"]')
          .innerText()
      ).includes("Ficha pendente"),
    );
    const replacement = await page.evaluate(
      () =>
        app.catalog.entries.find((row) => row.name === "Guardião substituto")
          .uuid,
    );
    await page
      .locator(
        '[data-action="bind-resource-profile"][data-profile="threat:guardian"]',
      )
      .selectOption(replacement);
    await wait();
    assert.equal(
      await page.evaluate(
        () =>
          app.selectedScene.roster.find(
            (row) => row.name === "Sentinela deformada",
          )?.quantity,
      ),
      2,
    );
    assert.ok(
      (
        await page
          .locator('[data-resource-profile="threat:guardian"]')
          .innerText()
      ).includes("Protege o receptáculo."),
    );
    await page.evaluate(() => {
      app.galleryOpen = true;
      return app.render();
    });
    await page.locator('[data-action="review-map"]').last().click();
    await wait();
    await page.locator('[name="point-type"]').selectOption("puzzle");
    await page
      .locator(".qc-review-canvas img")
      .click({ position: { x: 45, y: 60 } });
    await wait();
    assert.equal(await page.locator(".qc-area-marker").count(), 1);
    await page.locator('[data-area-field="title"]').fill("Selo dos ecos");
    await page
      .locator('[data-area-field="visualDescription"]')
      .fill("Um círculo de pedra, três runas e marcas de ressonância.");
    await page
      .locator('[data-area-field="environment"]')
      .selectOption("shrine");
    await page.locator('[data-action="suggest-area"]').click();
    await wait();
    assert.ok(
      (
        await page.locator('[data-suggestion-field="challenge"]').inputValue()
      ).includes("regra"),
    );
    await page
      .locator('[data-suggestion-field="secret"]')
      .fill("A terceira runa aponta para a garra ausente.");
    await page.locator('[data-action="accept-area"]').click();
    await wait();
    assert.ok((await page.locator(".qc-learning-status").innerText()).includes("1 aceita"));

    await page.locator('[name="draw-mode"]').selectOption("rect");
    await wait();
    await page.locator(".qc-review-canvas").scrollIntoViewIfNeeded();
    const scrollBefore = await page
      .locator(".qc-detail")
      .evaluate((element) => element.scrollTop);
    const canvas = await page.locator(".qc-review-canvas").boundingBox();
    await page.mouse.move(canvas.x + 120, canvas.y + 80);
    await page.mouse.down();
    await page.mouse.move(canvas.x + 260, canvas.y + 180);
    assert.equal(
      await page.locator(".qc-pending-rect").getAttribute("hidden"),
      null,
    );
    assert.ok(
      Number(await page.locator(".qc-pending-rect").getAttribute("width")) > 0,
    );
    await page.mouse.up();
    await wait();
    assert.equal(
      await page.locator(".qc-detail").evaluate((element) => element.scrollTop),
      scrollBefore,
    );
    assert.equal(await page.locator(".qc-area-marker").count(), 2);
    assert.equal(await page.locator(".qc-review-canvas .qc-area-shape").count(), 1);
    await page.locator(".qc-area-card").nth(1).locator('[data-area-field="type"]').selectOption("puzzle");
    await page.locator(".qc-area-card").nth(1).locator('[data-area-field="environment"]').selectOption("shrine");
    await page.locator(".qc-area-card").nth(1).locator('[data-area-field="visualDescription"]').fill("Runas semelhantes cercam uma porta menor.");
    await page.locator(".qc-area-card").nth(1).locator('[data-action="suggest-area"]').click();
    await wait();
    assert.ok(
      (await page.locator(".qc-area-card").nth(1).innerText()).includes(
        "exemplo semelhante aceito anteriormente",
      ),
    );

    await page.locator('[name="draw-mode"]').selectOption("polygon");
    await wait();
    const image = page.locator(".qc-review-canvas img");
    await image.click({ position: { x: 300, y: 100 } });
    await image.click({ position: { x: 380, y: 130 } });
    await image.click({ position: { x: 340, y: 220 } });
    assert.ok((await page.locator(".qc-draw-toolbar small").innerText()).includes("3 vértices"));
    await page.locator('[data-action="finish-polygon"]').click();
    await wait();
    assert.equal(await page.locator(".qc-area-marker").count(), 3);
    assert.equal(await page.locator(".qc-review-canvas .qc-area-shape").count(), 2);
    await page.screenshot({
      path: resolve(root, "dist", "preview-map-review-0.4.0.png"),
      fullPage: true,
    });
    await page.locator(".qc-area-card").first().locator('[data-action="area-scene"]').click();
    await wait();
    assert.equal(
      await page.locator('[data-scene-field="title"]').inputValue(),
      "Selo dos ecos",
    );
    assert.equal(
      await page.locator('[data-scene-field="kind"]').inputValue(),
      "desafio",
    );
    assert.ok(
      await page.evaluate(() =>
        Object.values(app.campaign.mapReviews).some((review) =>
          review.points.some((point) => point.sceneId === app.selectedSceneId),
        ),
      ),
    );
    await page.screenshot({
      path: resolve(root, "dist", "preview-planner-0.4.0.png"),
      fullPage: true,
    });

    // Voltar à visão da campanha, à seleção e criar uma campanha nova.
    await page.locator('[data-action="close-scene"]').first().click();
    await wait();
    assert.equal(await page.locator('[data-scene-field="title"]').count(), 0);
    assert.ok(
      (await page.locator(".qc-detail").innerText()).includes(
        "VISÃO DA MESTRA",
      ),
    );
    await page.locator('[data-action="close-campaign"]').click();
    await wait();
    await page.locator(".qc-new-campaign > summary").click();
    await page.locator('[name="new-title"]').fill("Areia e sangue");
    await page.locator('[name="new-year"]').fill("110 A.F.");
    await page
      .locator('[name="new-description"]')
      .fill("Uma travessia pelo deserto.");
    await page.getByRole("button", { name: "Criar campanha", exact: true }).click();
    await wait();
    assert.equal(
      await page.locator(".qc-header h1").innerText(),
      "Areia e sangue",
    );
    assert.equal(await page.locator(".qc-board").count(), 1);
    await page.locator('[data-action="close-campaign"]').click();
    await wait();
    assert.equal(await page.locator(".qc-campaign-row").count(), 2);
    assert.ok(
      (await page.locator(".qc-campaign-list").innerText()).includes(
        "Uma travessia pelo deserto.",
      ),
    );
    await page.screenshot({
      path: resolve(root, "dist", "preview-picker-0.4.0.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => notifications), []);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
