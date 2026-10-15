import { MODULE_ID } from "./data.mjs";
import { listCampaigns } from "./store.mjs";

/** O canvas nativo não aceita Item: a bandeja cria um Tile visual, mantendo o UUID da ficha. */
export async function placePreparedLoot(game, canvas, data) {
  if (!game.user?.isGM)
    throw Error("Somente a Mestra pode posicionar loot preparado.");
  if (!canvas?.scene)
    throw Error("Abra um mapa antes de posicionar recompensas.");
  const link = data.quedacoCampaignLoot;
  const campaign = listCampaigns(game).find(
    (campaign) => campaign.id === link?.campaignId,
  );
  const scene = campaign?.scenes.find((scene) => scene.id === link?.sceneId);
  const item = scene?.loot.find(
    (item) => item.id === link?.lootId && item.uuid === data.uuid,
  );
  if (!item) throw Error("A recompensa não está mais na preparação da cena.");
  if (!Number.isFinite(data.x) || !Number.isFinite(data.y))
    throw Error("Posição do loot inválida.");
  const size = Math.max(32, Number(canvas.grid?.size) || 100);
  return canvas.scene.createEmbeddedDocuments("Tile", [
    {
      texture: { src: item.img || "icons/svg/item-bag.svg" },
      width: size,
      height: size,
      x: Math.round(data.x - size / 2),
      y: Math.round(data.y - size / 2),
      hidden: item.hidden,
      locked: false,
      flags: {
        [MODULE_ID]: {
          loot: { uuid: item.uuid, name: item.name, quantity: item.quantity },
        },
      },
    },
  ]);
}

export function bindLootCanvas(hooks = Hooks) {
  hooks.on("dropCanvasData", (canvas, data) => {
    if (!data?.quedacoCampaignLoot || data.type !== "Item") return;
    if (!game.user?.isGM) return false;
    void placePreparedLoot(game, canvas, data).catch((error) =>
      ui.notifications.error(error.message),
    );
    return false;
  });
}
