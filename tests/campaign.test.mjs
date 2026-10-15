import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { campaignFromMarkdown } from "../src/campaign-document.mjs";
import { normalizeCampaign } from "../src/data.mjs";
import { listCampaigns, saveCampaigns } from "../src/store.mjs";

test("a campanha completa importa 12 cenas, funções, pistas e NPCs sem perder o original", async () => {
  const material = await readFile(
    new URL("../campanhas/noatora-a-garra-ausente.md", import.meta.url),
    "utf8",
  );
  const campaign = campaignFromMarkdown(material);
  assert.equal(campaign.scenes.length, 12);
  assert.equal(campaign.npcProfiles.length, 3);
  assert.equal(campaign.original.material, material);
  assert.ok(campaign.scenes[8].information.includes("removida"));
  assert.ok(campaign.scenes[4].failure.includes("recursos"));
  campaign.scenes[8].notes = "Minha pista secreta";
  campaign.npcProfiles[0].actorUuid = "Actor.substituto";
  const normalized = normalizeCampaign(campaign);
  assert.equal(normalized.scenes[8].notes, "Minha pista secreta");
  assert.ok(normalized.npcProfiles[0].behavior.includes("ovo"));
  assert.equal(normalized.npcProfiles[0].actorUuid, "Actor.substituto");
});

test("notas persistem em páginas privadas e jogadores não consultam nem gravam campanhas", async () => {
  const game = { user: { isGM: true }, journal: [] };
  const previous = globalThis.JournalEntry;
  globalThis.JournalEntry = {
    create: async (data) => {
      assert.deepEqual(data.ownership, { default: 0 });
      assert.deepEqual(data.pages[0].ownership, { default: 0 });
      const doc = {
        ...data,
        getFlag: (scope, key) => data.flags[scope]?.[key],
        pages: data.pages.map((page, index) => ({
          ...page,
          id: `page-${index}`,
          getFlag: (scope, key) => page.flags[scope]?.[key],
        })),
        update: async () => {},
        updateEmbeddedDocuments: async (type, updates) => {
          for (const update of updates)
            Object.assign(
              doc.pages.find((page) => page.id === update._id),
              update,
            );
        },
      };
      game.journal.push(doc);
      return doc;
    },
  };
  try {
    const campaign = campaignFromMarkdown(
      "# Aventura\n\n### C01 - Segredo\n\n| Objetivo | Investigar |\n",
    );
    campaign.scenes[0].notes = "Só a Mestra sabe";
    await saveCampaigns(game, [campaign]);
    const loaded = listCampaigns(game)[0];
    assert.equal(loaded.scenes[0].notes, "Só a Mestra sabe");
    loaded.original.material = "tentativa de apagar original";
    loaded.working.material = "adaptação";
    await saveCampaigns(game, [loaded]);
    assert.equal(
      listCampaigns(game)[0].original.material,
      campaign.original.material,
    );
    assert.equal(listCampaigns(game)[0].working.material, "adaptação");
    game.user.isGM = false;
    assert.deepEqual(listCampaigns(game), []);
    await assert.rejects(() => saveCampaigns(game, [campaign]), /Mestra/);
  } finally {
    globalThis.JournalEntry = previous;
  }
});
