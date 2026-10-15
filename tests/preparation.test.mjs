import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCampaign } from "../src/data.mjs";
import { mapSequence, renderMapSequence } from "../src/preparation.mjs";
import {
  createSceneTask,
  syncSceneTask,
  publishSceneUpdate,
  questsForGM,
} from "../src/quests.mjs";
import { placePreparedLoot } from "../src/loot-canvas.mjs";

test("roteiro agrupa quatro de doze cenas no primeiro mapa e mantém a ordem", () => {
  const campaign = normalizeCampaign({
    id: "adventure",
    scenes: Array.from({ length: 12 }, (_, index) => ({
      id: `c${index + 1}`,
      mapSceneIds: [index < 4 ? "map-one" : "map-two"],
    })),
  });
  assert.deepEqual(
    mapSequence(campaign).map((group) =>
      group.scenes.map((entry) => entry.index),
    ),
    [
      [0, 1, 2, 3],
      [4, 5, 6, 7, 8, 9, 10, 11],
    ],
  );
  const html = renderMapSequence(
    campaign,
    new Map([
      ["map-one", { id: "map-one", name: "Entrada" }],
      ["map-two", { id: "map-two", name: "Profundezas" }],
    ]),
    "c1",
    (scene) => scene.id,
  );
  assert.ok(html.includes("4 de 12 cenas"));
  assert.ok(html.indexOf("c1") < html.indexOf("c4"));
});

test("missão sincroniza somente tarefas vinculadas sem copiar segredos ou apagar anotações dos jogadores", async () => {
  let saves = 0;
  const quest = {
    id: "q1",
    name: "Expedição",
    description: "Objetivos conhecidos.",
    playernotes: "Nossa teoria sobre a mina",
    tasks: [{ uuidv4: "other", name: "Outro objetivo", completed: false }],
    addTask(data) {
      this.tasks.push({ ...data, uuidv4: "new-task" });
    },
    save: async () => {
      saves++;
      return "q1";
    },
  };
  const game = {
    user: { isGM: true },
    modules: new Map([
      [
        "forien-quest-log",
        {
          active: true,
          public: { QuestAPI: { DB: { getAllQuests: () => [quest] } } },
        },
      ],
    ]),
  };
  const campaign = normalizeCampaign({
    id: "adventure",
    scenes: [
      {
        id: "c1",
        status: "completed",
        notes: "SEGREDO PRIVADO",
        quest: { questId: "q1", publicObjective: "Achar as galerias" },
      },
    ],
  });
  const scene = campaign.scenes[0];
  scene.quest.taskId = await createSceneTask(game, scene);
  await syncSceneTask(game, scene, campaign);
  assert.equal(quest.tasks[1].completed, true);
  assert.equal(quest.tasks[0].completed, false);
  assert.equal(quest.playernotes, "Nossa teoria sobre a mina");
  assert.ok(!JSON.stringify(quest).includes("SEGREDO PRIVADO"));
  scene.quest.publicUpdate = "Encontramos <uma pista>";
  await publishSceneUpdate(game, scene);
  await publishSceneUpdate(game, scene);
  assert.equal(quest.description.match(/Encontramos/g).length, 1);
  assert.ok(quest.description.includes("&lt;uma pista&gt;"));
  assert.equal(saves, 4);
  game.user.isGM = false;
  assert.deepEqual(questsForGM(game), []);
  await assert.rejects(() => syncSceneTask(game, scene), /Mestra/);
});

test("um objetivo compartilhado só conclui depois de todas as cenas vinculadas", async () => {
  const task = { uuidv4: "t1", completed: false };
  const quest = { id: "q1", tasks: [task], save: async () => {} };
  const game = {
    user: { isGM: true },
    modules: new Map([
      [
        "forien-quest-log",
        {
          active: true,
          public: { QuestAPI: { DB: { getAllQuests: () => [quest] } } },
        },
      ],
    ]),
  };
  const campaign = normalizeCampaign({
    id: "c",
    scenes: [
      { id: "s1", status: "completed", quest: { questId: "q1", taskId: "t1" } },
      { id: "s2", quest: { questId: "q1", taskId: "t1" } },
    ],
  });
  await syncSceneTask(game, campaign.scenes[0], campaign);
  assert.equal(task.completed, false);
  campaign.scenes[1].status = "completed";
  await syncSceneTask(game, campaign.scenes[1], campaign);
  assert.equal(task.completed, true);
});

test("arrastar loot cria marcador oculto sem colocar segredos nas flags do mapa", async () => {
  const campaign = normalizeCampaign({
    id: "c",
    scenes: [
      {
        id: "s",
        notes: "SEGREDO PRIVADO",
        loot: [
          {
            id: "l",
            uuid: "Item.crystal",
            name: "Cristal",
            quantity: 2,
            notes: "SEGREDO DO LOOT",
          },
        ],
      },
    ],
  });
  const page = {
    text: { markdown: JSON.stringify(campaign) },
    getFlag: () => true,
  };
  const game = {
    user: { isGM: true },
    journal: [{ getFlag: () => true, pages: [page] }],
  };
  let tile;
  const canvas = {
    grid: { size: 100 },
    scene: {
      createEmbeddedDocuments: async (type, data) => {
        assert.equal(type, "Tile");
        tile = data[0];
        return data;
      },
    },
  };
  const data = {
    type: "Item",
    uuid: "Item.crystal",
    x: 240,
    y: 340,
    quedacoCampaignLoot: { campaignId: "c", sceneId: "s", lootId: "l" },
  };
  await placePreparedLoot(game, canvas, data);
  assert.equal(tile.hidden, true);
  assert.equal(tile.flags["quedaco-campanhas"].loot.quantity, 2);
  assert.ok(!JSON.stringify(tile).includes("SEGREDO"));
  game.user.isGM = false;
  await assert.rejects(() => placePreparedLoot(game, canvas, data), /Mestra/);
});
