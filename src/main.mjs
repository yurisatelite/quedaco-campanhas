import { MODULE_ID } from "./data.mjs";
import { CampaignsApp } from "./app.mjs";
import {
  listCampaigns,
  registerCampaignSettings,
  initializeCampaignStorage,
} from "./store.mjs";

let app;

export async function openCampaignManager() {
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
    app.render(false);
    return app.bringToFront();
  }
  app = new CampaignsApp();
  return app.render(true);
}

Hooks.once("init", () => registerCampaignSettings(game));
Hooks.once("ready", () => {
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
    }),
    open: openCampaignManager,
    getStatus: () => ({
      ready: true,
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
  if (Array.isArray(controls)) {
    const group =
      controls.find((entry) => entry.name === "tokens") ?? controls[0];
    group?.tools?.push(tool);
  } else {
    const group = controls.tokens ?? Object.values(controls)[0];
    if (group?.tools) group.tools[MODULE_ID] = tool;
  }
});
