import {
  clone,
  MODULE_ID,
  NOATORA_CAMPAIGN,
  normalizeCampaign,
  normalizeCampaigns,
} from "./data.mjs";
import { enrichScenes } from "./campaign-document.mjs";
import { prepareNoatora } from "./noatora-preparation.mjs";

// Dados narrativos ficam em páginas privadas, nunca nas flags de Scene/Actor ou na API pública.
export const CAMPAIGNS_SETTING = "campaigns";
const documents = (game) =>
  Array.from(game.journal ?? []).filter(
    (doc) => doc.getFlag(MODULE_ID, "campaignStorage") === true,
  );
const pageFor = (doc) =>
  Array.from(doc.pages ?? []).find(
    (page) => page.getFlag(MODULE_ID, "campaignData") === true,
  );
const read = (doc) => {
  try {
    const data = JSON.parse(pageFor(doc)?.text?.markdown || "null");
    return data?.id ? normalizeCampaign(data) : null;
  } catch {
    return null;
  }
};
let storageReady;

export function registerCampaignSettings(game) {
  // Registro legado somente para migração das versões de desenvolvimento.
  game.settings.register(MODULE_ID, CAMPAIGNS_SETTING, {
    scope: "world",
    config: false,
    type: Array,
    default: [],
  });
}

export function listCampaigns(game) {
  if (!game.user?.isGM) return [];
  return documents(game).map(read).filter(Boolean);
}

export async function initializeCampaignStorage(game) {
  if (!game.user?.isGM) return;
  if (storageReady) return storageReady;
  storageReady = (async () => {
    const existing = listCampaigns(game);
    const legacy = normalizeCampaigns(
      game.settings.get(MODULE_ID, CAMPAIGNS_SETTING),
    );
    if (legacy.length) {
      await saveCampaigns(game, [
        ...existing,
        ...legacy.filter((row) => !existing.some((item) => item.id === row.id)),
      ]);
      await game.settings.set(MODULE_ID, CAMPAIGNS_SETTING, []);
    } else if (!existing.length) {
      const response = await fetch(
        `modules/${MODULE_ID}/campanhas/noatora-a-garra-ausente.md`,
      );
      if (!response.ok)
        throw Error("Não foi possível carregar a campanha de Noátorá.");
      const material = await response.text();
      const campaign = prepareNoatora(
        enrichScenes(clone(NOATORA_CAMPAIGN), material),
      );
      campaign.original.material = material;
      campaign.working.material = material;
      campaign.scenes[7].npcProfileIds = ["jormu"];
      campaign.scenes[9].npcProfileIds = ["jormu"];
      await saveCampaigns(game, [campaign]);
    }
  })().catch((error) => {
    storageReady = null;
    throw error;
  });
  return storageReady;
}

export async function saveCampaigns(game, campaigns) {
  if (!game.user?.isGM) throw Error("Somente a Mestra pode alterar campanhas.");
  for (const campaign of normalizeCampaigns(campaigns)) {
    const document = documents(game).find(
      (doc) => read(doc)?.id === campaign.id,
    );
    const previous = document && read(document);
    if (previous) campaign.original = clone(previous.original);
    const data = {
      name: "Dados privados da campanha",
      type: "text",
      ownership: { default: 0 },
      flags: { [MODULE_ID]: { campaignData: true } },
      text: { format: 2, markdown: JSON.stringify(campaign) },
    };
    if (document) {
      const page = pageFor(document);
      if (!page) throw Error("Página privada da campanha ausente.");
      await document.update({
        name: campaign.title,
        ownership: { default: 0 },
      });
      await document.updateEmbeddedDocuments("JournalEntryPage", [
        { _id: page.id, ...data },
      ]);
    } else {
      await JournalEntry.create({
        name: campaign.title,
        ownership: { default: 0 },
        flags: { [MODULE_ID]: { campaignStorage: true } },
        pages: [data],
      });
    }
  }
}
