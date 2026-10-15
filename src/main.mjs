import { MODULE_ID } from "./data.mjs";
import { CampaignsApp } from "./app.mjs";
import { bindLootCanvas } from "./loot-canvas.mjs";
import { bindQuestRefresh, questAPI } from "./quests.mjs";
import { applyStoredSceneFx } from "./fxmaster.mjs";
import {
  listCampaigns,
  registerCampaignSettings,
  initializeCampaignStorage,
} from "./store.mjs";

let app;

export async function openCampaignManager(options = {}) {
  if (!game.user?.isGM)
    return ui.notifications.info(
      "O QUEDAÇO - Campanhas é uma ferramenta da Mestra.",
    );
  try {
    await initializeCampaignStorage(game);
  } catch (error) {
    console.error(MODULE_ID, error);
    return ui.notifications.error(error.message);
  }
  if (app?.rendered) {
    if (options.mapId) app.reviewMapId = options.mapId;
    if (options.planner) app.detailTab = "mapa";
    app.render(false);
    return app.bringToFront();
  }
  app = new CampaignsApp();
  if (options.mapId) app.reviewMapId = options.mapId;
  if (options.planner) app.detailTab = "mapa";
  return app.render(true);
}

Hooks.once("init", () => registerCampaignSettings(game));
bindLootCanvas();
Hooks.on("canvasReady", (canvas) => {
  if (game.user?.isGM && app?.rendered && !app.openingMap)
    void (async () => {
      await app.followMap(canvas.scene?.id);
      const scene = app.selectedScene;
      if (scene?.mapSceneIds.includes(canvas.scene?.id))
        await applyStoredSceneFx(scene, canvas.scene);
    })().catch((error) => ui.notifications.warn(error.message));
});
for (const event of [
  "createActor",
  "updateActor",
  "deleteActor",
  "createItem",
  "updateItem",
  "deleteItem",
])
  Hooks.on(event, () => {
    if (app) {
      app.catalog.loading = null;
      app.resourcesInitialized = false;
    }
  });
Hooks.once("ready", () => {
  bindQuestRefresh(game, () => {
    const editing =
      app?.element?.contains(document.activeElement) &&
      document.activeElement?.matches("input,textarea,select");
    if (app?.rendered && !app.busy && !editing) void app.render(true);
  });
  const module = game.modules.get(MODULE_ID);
  if (!module) return;
  const descriptor = Object.freeze({
    family: "quedaco",
    contractVersion: 1,
    id: MODULE_ID,
    title: module.title,
    version: module.version,
    capabilities: Object.freeze({
      campaignManager: true,
      campaignScenes: true,
      mapAssignments: true,
      tokenPreparation: true,
      fxMasterPlans: true,
      fxMasterPresetControl: true,
      privateSceneNotes: true,
      campaignImport: true,
      mapTimeline: true,
      mapPlanning: true,
      declaredResources: true,
      roomAreaDrawing: true,
      localCampaignLearning: true,
      lootPreparation: true,
      questProgress: true,
      imageNarration: true,
      automaticResourceLinks: true,
      visualMapLibrary: true,
    }),
    open: openCampaignManager,
    openPlanner: (mapId = canvas.scene?.id) =>
      openCampaignManager({ mapId, planner: true }),
    getStatus: () => ({
      ready: true,
      questIntegration: Boolean(questAPI(game)),
      npcCatalog:
        game.modules.get("quedaco")?.api?.capabilities?.npcDatabase === true,
    }),
    listCampaigns: () =>
      game.user?.isGM
        ? listCampaigns(game).map((campaign) => ({
            id: campaign.id,
            title: campaign.title,
            status: campaign.status,
            currentSceneId: campaign.currentSceneId,
          }))
        : [],
  });
  module.api = descriptor;
  Hooks.callAll("quedaco:register", descriptor);
});

Hooks.on("renderSceneDirectory", (application, element) => {
  if (!game.user?.isGM) return;
  const root = element instanceof HTMLElement ? element : element?.[0];
  const header = root?.querySelector(".header-actions");
  if (!header || header.querySelector("[data-quedaco-campanhas]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.quedacoCampanhas = "true";
  button.innerHTML = '<i class="fa-solid fa-scroll"></i> Campanhas';
  button.addEventListener("click", () => void openCampaignManager());
  header.append(button);
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user?.isGM) return;
  const tool = {
    name: MODULE_ID,
    title: "QUEDAÇO - Campanhas",
    icon: "fa-solid fa-scroll",
    button: true,
    order: 98,
    onClick: openCampaignManager,
  };
  const planner = {
    name: `${MODULE_ID}-planner`,
    title: "Planejar salas do mapa atual",
    icon: "fa-solid fa-draw-polygon",
    button: true,
    order: 99,
    onClick: () =>
      openCampaignManager({ mapId: canvas.scene?.id, planner: true }),
  };
  if (Array.isArray(controls)) {
    const group =
      controls.find((entry) => entry.name === "tokens") ?? controls[0];
    group?.tools?.push(tool, planner);
  } else {
    const group = controls.tokens ?? Object.values(controls)[0];
    if (group?.tools) {
      group.tools[MODULE_ID] = tool;
      group.tools[planner.name] = planner;
    }
  }
});
