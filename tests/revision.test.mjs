import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCampaign, DEFAULT_COVER } from "../src/data.mjs";
import {
  ResourceCatalog,
  applyResourceMatches,
  detectResources,
} from "../src/resource-catalog.mjs";
import { mapsInFolder, folderPath } from "../src/map-library.mjs";
import {
  campaignFromMarkdown,
  enrichScenes,
} from "../src/campaign-document.mjs";
import { mapSequence } from "../src/preparation.mjs";

test("pasta inclui descendentes sem trazer mapas externos e mostra caminho completo", () => {
  const folders = [
    { id: "root", name: "Mapas" },
    { id: "city", name: "Cidade", folder: "root" },
    { id: "mine", name: "Mina", folder: "city" },
    { id: "other", name: "Outra pasta" },
  ];
  const maps = [
    { id: "a", folder: folders[1] },
    { id: "b", folder: folders[2] },
    { id: "c", folder: folders[3] },
  ];
  assert.deepEqual(
    mapsInFolder(maps, folders, "city").map((map) => map.id),
    ["a", "b"],
  );
  assert.deepEqual(mapsInFolder(maps, folders, ""), []);
  assert.equal(folderPath(folders[2], folders), "Mapas › Cidade › Mina");
});

test("migração preserva notas, mapas e original com nome sem spoiler e capa", () => {
  const campaign = normalizeCampaign({
    id: "old",
    title: "Noátorá: A Garra Ausente",
    original: { material: "Original com spoilers" },
    scenes: [
      {
        id: "c1",
        kind: "Interação social",
        notes: "Segredo",
        mapSceneIds: ["map"],
        rooms: [{ id: "room", name: "Sala marcada" }],
      },
    ],
  });
  assert.equal(campaign.title, "Uma viagem estranha");
  assert.equal(campaign.cover, DEFAULT_COVER);
  assert.equal(campaign.original.material, "Original com spoilers");
  assert.equal(campaign.scenes[0].kind, "social");
  assert.equal(campaign.scenes[0].notes, "Segredo");
  assert.equal(campaign.scenes[0].rooms[0].name, "Sala marcada");
  assert.deepEqual(campaign.scenes[0].mapSceneIds, ["map"]);
});

test("catálogo usa API de NPCs, atores e itens de compêndios e suporta um pack indisponível", async () => {
  const game = {
    actors: [],
    items: [],
    modules: new Map([
      [
        "quedaco",
        {
          api: {
            family: "quedaco",
            listNpcs: () => [{ uuid: "Actor.jormu", name: "Jormü" }],
          },
        },
      ],
    ]),
    packs: [
      {
        documentName: "Actor",
        collection: "skyfall.monsters",
        visible: true,
        metadata: { system: "skyfall" },
        getIndex: async () => [{ _id: "wolf", name: "Lobo", type: "monster" }],
      },
      {
        documentName: "Item",
        collection: "skyfall.items",
        visible: true,
        metadata: { system: "skyfall" },
        getIndex: async () => [
          { _id: "potion", name: "Poção de cura", type: "consumable" },
          { _id: "class", name: "Guerreiro", type: "class" },
        ],
      },
      {
        documentName: "Actor",
        collection: "unavailable",
        visible: true,
        getIndex: async () => {
          throw Error("Indisponível");
        },
      },
    ],
  };
  const catalog = await new ResourceCatalog(game).load();
  assert.equal(catalog.entries.length, 3);
  assert.equal(catalog.failures.length, 1);
  const campaign = normalizeCampaign({
    id: "c",
    npcProfiles: [
      { id: "jormu", name: "Jormü", behavior: "Informação narrativa" },
    ],
    scenes: [{ id: "s", narration: "Dois lobos guardam uma poção de cura." }],
  });
  assert.equal(applyResourceMatches(campaign, catalog.entries), 2);
  assert.equal(campaign.scenes[0].roster[0].quantity, 2);
  assert.equal(campaign.scenes[0].loot[0].quantity, 1);
  assert.equal(campaign.npcProfiles[0].actorUuid, "Actor.jormu");
  assert.equal(campaign.npcProfiles[0].behavior, "Informação narrativa");
  applyResourceMatches(campaign, catalog.entries);
  assert.equal(campaign.scenes[0].roster.length, 1);
  campaign.scenes[0].roster[0].source = "manual";
  campaign.scenes[0].roster[0].quantity = 7;
  campaign.scenes[0].excludedResources.push(campaign.scenes[0].loot[0].uuid);
  applyResourceMatches(campaign, catalog.entries);
  assert.equal(campaign.scenes[0].roster[0].quantity, 7);
  assert.equal(campaign.scenes[0].loot.length, 0);
  assert.equal(
    detectResources({ narration: "Não há lobos nesta sala." }, catalog.entries)
      .length,
    0,
  );
});

test("imagem narrativa permanece entre cenas no mesmo mapa e edição do texto conserva sua posição", () => {
  const material =
    "# A viagem\n\n### C01 - Entrada\n\n| Tipo | Exploração |\n\n#### Narração\n\nUm salão enorme.\n\nA água ecoa.\n\n### C02 - Descida\n\n| Tipo | Desafio |\n";
  const campaign = campaignFromMarkdown(material);
  campaign.scenes.forEach((scene) => {
    scene.mapSceneIds = ["same-map"];
    scene.presentation = "map";
  });
  campaign.scenes.splice(1, 0, {
    id: "interlude",
    title: "Uma lembrança",
    presentation: "image",
    image: "memory.webp",
    kind: "narrativa",
    notes: "Minha nota",
    mapSceneIds: [],
    roster: [],
    loot: [],
  });
  const merged = enrichScenes(campaign, material);
  assert.deepEqual(
    merged.scenes.map((scene) => scene.id),
    ["c01", "interlude", "c02"],
  );
  assert.ok(merged.scenes[0].narration.includes("A água ecoa."));
  assert.deepEqual(
    mapSequence(merged).map((group) => group.mapId),
    ["same-map", "", "same-map"],
  );
  assert.equal(merged.scenes[1].notes, "Minha nota");
});
test("declarações do texto vinculam ameaças existentes e conservam nomes de fichas substitutas", () => {
  const material =
    "# Exemplo\n\n## Ameaças\n### Sentinela deformada\nProtege o receptáculo.\n\n## Itens e loot\n### Poção de cura\nRecompensa.\n\n## Cenas\n### C01 - Câmara\n| Campo | Valor |\n| Ameaças | 2 Sentinela deformada |\n| Loot | Poção de cura |\n";
  let campaign = campaignFromMarkdown(material);
  assert.equal(campaign.resourceProfiles.length, 2);
  assert.equal(campaign.scenes[0].resourceRefs[0].quantity, 2);
  applyResourceMatches(campaign, [
    { uuid: "Item.potion", documentName: "Item", name: "Poção de cura" },
  ]);
  assert.equal(campaign.scenes[0].loot.length, 1);
  assert.equal(campaign.scenes[0].roster.length, 0);
  campaign.resourceProfiles.find((row) => row.kind === "threat").uuid =
    "Actor.substitute";
  campaign.resourceProfiles.find((row) => row.kind === "threat").bindingName =
    "Lobo";
  applyResourceMatches(campaign, []);
  assert.equal(campaign.scenes[0].roster[0].name, "Sentinela deformada");
  assert.equal(campaign.scenes[0].roster[0].quantity, 2);
  campaign = enrichScenes(campaign, material);
  assert.equal(
    campaign.resourceProfiles.find((row) => row.kind === "threat").uuid,
    "Actor.substitute",
  );
  assert.equal(
    campaign.resourceProfiles.find((row) => row.kind === "threat").description,
    "Protege o receptáculo.",
  );
});
test("planejamento visual conserva os pontos privados e suas cenas", () => {
  const campaign = normalizeCampaign({
    mapReviews: {
      map: {
        notes: "Segredo",
        points: [
          {
            id: "p",
            type: "puzzle",
            x: 35,
            y: 60,
            title: "Selo",
            description: "Solução privada",
            sceneId: "c1",
          },
        ],
      },
    },
  });
  assert.equal(campaign.mapReviews.map.points[0].sceneId, "c1");
  assert.equal(campaign.mapReviews.map.points[0].x, 35);
  assert.equal(campaign.mapReviews.map.notes, "Segredo");
});
