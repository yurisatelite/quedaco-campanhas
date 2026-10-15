import test from "node:test";
import assert from "node:assert/strict";
import {
  CAMPAIGN_SCHEMA,
  NOATORA_CAMPAIGN,
  clone,
  normalizeCampaign,
  normalizeCampaigns,
} from "../src/data.mjs";

test("a campanha de Noatorá possui cenas únicas e preparáveis", () => {
  const campaign = clone(NOATORA_CAMPAIGN);
  assert.equal(campaign.schema, CAMPAIGN_SCHEMA);
  assert.equal(campaign.scenes.length, 12);
  assert.equal(new Set(campaign.scenes.map((scene) => scene.id)).size, 12);
  assert.ok(
    campaign.scenes.every(
      (scene) =>
        Array.isArray(scene.mapSceneIds) && Array.isArray(scene.roster),
    ),
  );
});

test("normalização remove mapas repetidos e limita quantidade de tokens", () => {
  const campaign = normalizeCampaign({
    id: "teste",
    title: "Teste",
    scenes: [
      {
        id: "c1",
        mapSceneIds: ["a", "a", ""],
        roster: [{ actorUuid: "Actor.a", quantity: 120 }],
      },
    ],
  });
  assert.deepEqual(campaign.scenes[0].mapSceneIds, ["a"]);
  assert.equal(campaign.scenes[0].roster[0].quantity, 99);
  assert.equal(normalizeCampaigns(null).length, 0);
});
