import { MODULE_ID } from "./data.mjs";
import { listCampaigns, saveCampaigns } from "./store.mjs";
import { fxMasterStatus, playPreset, stopPreset } from "./fxmaster.mjs";
import { campaignFromMarkdown } from "./campaign-document.mjs";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

export class CampaignsApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "quedaco-campanhas",
    classes: ["qc-app"],
    tag: "section",
    window: { title: "QUEDAÇO - Campanhas", resizable: true },
    position: { width: 1180, height: 780 },
  };

  constructor() {
    super();
    this.campaignId = "";
    this.selectedSceneId = "";
    this.busy = false;
  }

  get campaigns() {
    return listCampaigns(game);
  }
  get campaign() {
    return (
      this.campaigns.find((entry) => entry.id === this.campaignId) ??
      this.campaigns[0] ??
      null
    );
  }
  get selectedScene() {
    return (
      this.campaign?.scenes.find(
        (entry) => entry.id === this.selectedSceneId,
      ) ??
      this.campaign?.scenes.find(
        (entry) => entry.id === this.campaign?.currentSceneId,
      ) ??
      this.campaign?.scenes[0] ??
      null
    );
  }

  sceneFolders() {
    return Array.from(game.folders ?? [])
      .filter((folder) => folder.type === "Scene")
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }
  allMaps() {
    return Array.from(game.scenes ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }
  mapsForCampaign() {
    const folderId = this.campaign?.mapFolderId;
    const all = this.allMaps();
    return folderId
      ? [
          ...all.filter((map) => map.folder?.id === folderId),
          ...all.filter((map) => map.folder?.id !== folderId),
        ]
      : all;
  }
  npcCatalog() {
    const api = game.modules.get("quedaco")?.api;
    if (
      api?.family === "quedaco" &&
      api.capabilities?.npcDatabase &&
      typeof api.listNpcs === "function"
    ) {
      try {
        return api.listNpcs().map((entry) => ({ ...entry, source: "QUEDAÇO" }));
      } catch (error) {
        console.warn(
          MODULE_ID,
          "Não foi possível ler os NPCs do QUEDAÇO.",
          error,
        );
      }
    }
    return Array.from(game.actors ?? [])
      .filter((actor) => actor.visible !== false)
      .map((actor) => ({
        uuid: actor.uuid ?? `Actor.${actor.id}`,
        name: actor.name,
        img: actor.img,
        role: "ator",
        source: "Mundo",
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  async _renderHTML() {
    if (!game.user?.isGM)
      return '<p class="qc-empty">O administrador de campanhas é uma ferramenta da Mestra.</p>';
    const campaign = this.campaign;
    if (!campaign)
      return '<p class="qc-empty">Nenhuma campanha disponível.</p>';
    this.campaignId = campaign.id;
    this.selectedSceneId = this.selectedScene?.id ?? campaign.currentSceneId;
    const folders = this.sceneFolders(),
      maps = this.mapsForCampaign(),
      selected = this.selectedScene,
      npcs = this.npcCatalog();
    const mapOption = (map) =>
      `<option value="${esc(map.id)}">${esc(map.name)}${map.folder?.name ? ` · ${esc(map.folder.name)}` : ""}</option>`;
    const mapNames = new Map(this.allMaps().map((map) => [map.id, map]));
    const rows = campaign.scenes
      .map((entry) => {
        const assigned = entry.mapSceneIds
          .map((id) => mapNames.get(id))
          .filter(Boolean);
        const current = entry.id === selected?.id;
        return `<article class="qc-scene-row ${current ? "is-selected" : ""}"><button class="qc-scene-main" data-action="select-scene" data-scene="${esc(entry.id)}"><span class="qc-state is-${esc(entry.status)}"></span><span><small>${esc(entry.kind.toUpperCase())}</small><strong>${esc(entry.title)}</strong><em>${esc(entry.objective)}</em></span></button><div class="qc-scene-maps">${assigned.length ? assigned.map((map) => `<span class="qc-map-chip"><button data-action="open-map" data-map="${esc(map.id)}">${esc(map.name)}</button><button data-action="remove-map" data-scene="${esc(entry.id)}" data-map="${esc(map.id)}" aria-label="Remover mapa">×</button></span>`).join("") : "<small>sem mapa</small>"}<select name="map-${esc(entry.id)}"><option value="">Associar mapa…</option>${maps.map(mapOption).join("")}</select><button data-action="add-map" data-scene="${esc(entry.id)}">+</button></div></article>`;
      })
      .join("");
    const roster = selected?.roster ?? [];
    const rosterRows =
      roster
        .map(
          (row) =>
            `<li draggable="true" data-actor-uuid="${esc(row.actorUuid)}"><img src="${esc(row.img || "icons/svg/mystery-man.svg")}" alt=""><span><strong>${esc(row.name || row.actorUuid)}</strong><small>${esc(row.role)} · ${row.hidden ? "oculto" : "visível"}</small></span><button data-action="roster-quantity" data-actor="${esc(row.actorUuid)}" data-change="-1">−</button><b>${row.quantity}</b><button data-action="roster-quantity" data-actor="${esc(row.actorUuid)}" data-change="1">+</button><button data-action="remove-roster" data-actor="${esc(row.actorUuid)}" aria-label="Remover">×</button></li>`,
        )
        .join("") || '<li class="qc-empty">Nenhum NPC ou token preparado.</li>';
    const folderOptions = `<option value="">Todos os mapas do mundo</option>${folders.map((folder) => `<option value="${esc(folder.id)}" ${folder.id === campaign.mapFolderId ? "selected" : ""}>${esc(folder.name)}</option>`).join("")}`;
    const npcOptions = npcs
      .map(
        (npc) =>
          `<option value="${esc(npc.uuid)}">${esc(npc.name)} · ${esc(npc.role || npc.source)}</option>`,
      )
      .join("");
    const mapCards =
      selected?.mapSceneIds
        .map((id) => mapNames.get(id))
        .filter(Boolean)
        .map(
          (map) =>
            `<button class="qc-open-map" data-action="open-map" data-map="${esc(map.id)}"><img src="${esc(map.thumb || map.background?.src || "icons/svg/mystery-man.svg")}" alt=""><span>Abrir mapa<br><strong>${esc(map.name)}</strong></span></button>`,
        )
        .join("") ||
      '<p class="qc-empty">Associe um mapa a esta cena para abri-lo daqui.</p>';
    const campaignCards = this.campaigns
      .map(
        (entry) =>
          `<button class="qc-campaign-card ${entry.id === campaign.id ? "is-selected" : ""}" data-action="select-campaign-card" data-campaign="${esc(entry.id)}"><small>${esc(entry.status.toUpperCase())} · rascunho ${entry.working?.revision || 1}</small><strong>${esc(entry.title)}</strong><span>${esc(entry.date?.year || "Data não definida")}</span><em>${entry.scenes.length} cenas · ${entry.regions.length} regiões</em></button>`,
      )
      .join("");
    const profiles =
      campaign.npcProfiles
        .map(
          (profile) =>
            `<article class="qc-npc-profile" data-profile-id="${esc(profile.id)}"><img src="${esc(profile.actorImg || "icons/svg/mystery-man.svg")}" alt=""><div><strong>${esc(profile.name)}</strong><small>${esc(profile.campaignRole)}</small><p>${esc(profile.behavior)}</p><label>Ficha/token substituto<select data-action="replace-npc" data-profile="${esc(profile.id)}"><option value="">Não atribuído</option>${npcs.map((npc) => `<option value="${esc(npc.uuid)}" ${npc.uuid === profile.actorUuid ? "selected" : ""}>${esc(npc.name)}</option>`).join("")}</select></label><em>${profile.actorUuid ? `Usando: ${esc(profile.actorName || profile.actorUuid)}` : "Arraste uma ficha do Foundry aqui ou escolha uma na lista."}</em></div></article>`,
        )
        .join("") ||
      '<p class="qc-empty">Nenhum perfil de NPC nesta campanha.</p>';
    const fxStatus = fxMasterStatus();
    const fxPanel = selected
      ? `<section class="qc-fx"><h3>FXMaster</h3><p>${fxStatus.available ? "FXMaster detectado. O efeito só é aplicado quando você mandar." : "FXMaster não está instalado ou não expõe API neste mundo."}</p><label>Preset da cena<input data-action="edit-fx-preset" value="${esc(selected.fx.preset)}" placeholder="Nome do preset"></label><div><button data-action="play-fx" data-scene="${esc(selected.id)}" ${fxStatus.canPlay ? "" : "disabled"}>Aplicar preset</button><button data-action="stop-fx" data-scene="${esc(selected.id)}" ${fxStatus.canStop ? "" : "disabled"}>Parar preset</button></div></section>`
      : "";
    const campaignInfo = `<details class="qc-campaign-info"><summary>Material, original e contexto da campanha</summary><label>Título da cópia de trabalho<input data-action="edit-title" value="${esc(campaign.title)}"></label><div class="qc-inline-fields"><label>Era<input data-action="edit-era" value="${esc(campaign.date.era)}"></label><label>Ano<input data-action="edit-year" value="${esc(campaign.date.year)}"></label></div><label>Regiões (separadas por vírgula)<input data-action="edit-regions" value="${esc(campaign.regions.join(", "))}"></label><label>Cópia de trabalho · r${campaign.working.revision}<textarea name="working-material">${esc(campaign.working.material)}</textarea></label><button data-action="save-material">Salvar cópia de trabalho</button><details><summary>Original preservado · r${campaign.original.revision}</summary><pre>${esc(campaign.original.material)}</pre></details></details><section class="qc-npc-profiles"><h2>NPCs da campanha</h2><p>Trocar a ficha não altera a função, o comportamento ou a informação narrativa do NPC.</p>${profiles}</section>${fxPanel}`;
    const sceneEditor = selected
      ? `<section class="qc-scene-editor"><h2>${esc(selected.title)}</h2><p class="qc-private"><i class="fa-solid fa-lock"></i> Preparação e anotações privadas da Mestra</p>${[
          ["title", "Título da cena"],
          ["kind", "Tipo de cena"],
          ["purpose", "Função narrativa"],
          ["objective", "Objetivo"],
          ["information", "Pistas e revelações"],
          ["success", "Sucesso / saída"],
          ["failure", "Falha / consequências"],
          ["notes", "Minhas anotações privadas"],
        ]
          .map(
            ([key, label]) =>
              `<label>${label}<textarea data-scene-field="${key}" rows="${key === "notes" ? 5 : 2}">${esc(selected[key])}</textarea></label>`,
          )
          .join(
            "",
          )}<fieldset><legend>Funções dos NPCs nesta cena</legend>${campaign.npcProfiles.map((profile) => `<label class="qc-checkbox"><input type="checkbox" data-scene-npc="${esc(profile.id)}" ${selected.npcProfileIds.includes(profile.id) ? "checked" : ""}>${esc(profile.name)} · ${esc(profile.campaignRole)}<button type="button" data-action="prepare-profile" data-profile="${esc(profile.id)}">Preparar token</button></label>`).join("")}</fieldset><button data-action="save-scene" data-scene="${esc(selected.id)}">Salvar preparação e notas</button>${selected.details ? `<details><summary>Referência original desta cena</summary><pre>${esc(selected.details)}</pre></details>` : ""}</section>`
      : "";
    return `<div class="qc-shell"><header><div><small>ADMINISTRADOR DE CAMPANHA</small><h1>QUEDAÇO - Campanhas</h1></div><label>Campanha<select data-action="select-campaign">${this.campaigns.map((entry) => `<option value="${esc(entry.id)}" ${entry.id === campaign.id ? "selected" : ""}>${esc(entry.title)}</option>`).join("")}</select></label></header><section class="qc-library"><label>Adicionar campanha (.md ou .txt)<input type="file" accept=".md,.txt,text/plain,text/markdown" data-action="import-campaign"></label><div class="qc-campaign-grid">${campaignCards}</div></section><section class="qc-toolbar"><label>Pasta dos mapas no Foundry<select data-action="select-folder">${folderOptions}</select></label><span>${campaign.mapFolderId ? "A lista prioriza os mapas desta pasta." : "Nenhuma pasta selecionada; todos os mapas estão disponíveis."}</span></section><main><section class="qc-scenes"><header><h2>Cenas</h2><button data-action="new-scene">Adicionar cena</button><small>${campaign.scenes.length} cenas</small></header>${rows}</section><aside class="qc-detail">${sceneEditor}${campaignInfo}${selected ? `<section><header><small>${esc(selected.kind.toUpperCase())} · ${esc(selected.status)}</small><h2>${esc(selected.title)}</h2><p>${esc(selected.objective)}</p><button data-action="set-current" data-scene="${esc(selected.id)}">Marcar como cena atual</button></header><section><h3>Mapas associados</h3><div class="qc-map-cards">${mapCards}</div></section><section><h3>Preparação de tokens</h3><p>Adicione NPCs ou Atores à bandeja e abra o mapa. Cada linha pode ser arrastada para o canvas do Foundry para posicionar um token.</p><div class="qc-roster-add"><select name="roster-npc"><option value="">Escolher NPC ou Ator…</option>${npcOptions}</select><button data-action="add-roster" data-scene="${esc(selected.id)}">Adicionar</button></div><ul class="qc-roster">${rosterRows}</ul></section></section>` : '<p class="qc-empty">Escolha uma cena.</p>'}</aside></main></div>`;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
  }
  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!root) return;
    this.listeners?.abort();
    this.listeners = new AbortController();
    const { signal } = this.listeners;
    root.addEventListener("click", (event) => void this.click(event), {
      signal,
    });
    root.addEventListener("change", (event) => void this.change(event), {
      signal,
    });
    root.addEventListener(
      "dragstart",
      (event) => {
        const row = event.target.closest?.("[data-actor-uuid]");
        if (!row || !event.dataTransfer) return;
        event.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ type: "Actor", uuid: row.dataset.actorUuid }),
        );
        event.dataTransfer.effectAllowed = "copy";
      },
      { signal },
    );
    root.addEventListener(
      "dragover",
      (event) => {
        if (event.target.closest?.("[data-profile-id]")) event.preventDefault();
      },
      { signal },
    );
    root.addEventListener("drop", (event) => void this.dropNpcProfile(event), {
      signal,
    });
  }

  async dropNpcProfile(event) {
    const target = event.target.closest?.("[data-profile-id]");
    if (!target) return;
    event.preventDefault();
    let data;
    try {
      data = JSON.parse(event.dataTransfer?.getData("text/plain") || "{}");
    } catch {
      return;
    }
    if (!["Actor", "Token"].includes(data.type) || !data.uuid) return;
    let actor;
    try {
      actor = await fromUuid(data.uuid);
    } catch {
      actor = null;
    }
    if (data.type === "Token") actor = actor?.actor;
    if (actor?.documentName !== "Actor")
      return ui.notifications.warn(
        "Arraste uma ficha de Ator ou um token válido.",
      );
    return this.mutate((campaign) => {
      const profile = campaign.npcProfiles.find(
        (entry) => entry.id === target.dataset.profileId,
      );
      if (profile) {
        profile.actorUuid = actor.uuid;
        profile.actorName = actor.name;
        profile.actorImg = actor.img || "";
      }
    });
  }

  async mutate(callback) {
    if (this.busy) return;
    this.busy = true;
    try {
      const all = this.campaigns;
      const target = all.find((entry) => entry.id === this.campaignId);
      if (!target) throw Error("Campanha não encontrada.");
      await callback(target);
      await saveCampaigns(game, all);
      await this.render(true);
    } catch (error) {
      console.error(MODULE_ID, error);
      ui.notifications.error(
        error.message || "Não foi possível salvar a campanha.",
      );
    } finally {
      this.busy = false;
    }
  }

  async click(event) {
    const button = event.target.closest?.("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "new-scene")
      return this.mutate((campaign) => {
        const id = `scene-${Date.now()}`;
        campaign.scenes.push({
          id,
          title: `Cena ${campaign.scenes.length + 1}`,
          kind: "narrativa",
          objective: "",
          mapSceneIds: [],
          roster: [],
        });
        this.selectedSceneId = id;
      });
    if (action === "save-scene") {
      const fields = Object.fromEntries(
        Array.from(this.element.querySelectorAll("[data-scene-field]")).map(
          (input) => [input.dataset.sceneField, input.value],
        ),
      );
      const npcProfileIds = Array.from(
        this.element.querySelectorAll("[data-scene-npc]:checked"),
      ).map((input) => input.dataset.sceneNpc);
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === button.dataset.scene,
        );
        if (scene) Object.assign(scene, fields, { npcProfileIds });
      });
    }
    if (action === "save-material") {
      const material = this.element.querySelector(
        '[name="working-material"]',
      )?.value;
      return this.mutate((campaign) => {
        campaign.working.material = material ?? campaign.working.material;
        campaign.working.revision += 1;
      });
    }
    if (action === "prepare-profile") {
      const profile = this.campaign?.npcProfiles.find(
        (entry) => entry.id === button.dataset.profile,
      );
      if (!profile?.actorUuid)
        return ui.notifications.warn("Vincule uma ficha a este NPC primeiro.");
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === this.selectedSceneId,
        );
        if (!scene) return;
        const row = scene.roster.find(
          (entry) => entry.profileId === profile.id,
        );
        const replacement = {
          profileId: profile.id,
          actorUuid: profile.actorUuid,
          name: profile.name,
          img: profile.actorImg,
          role: profile.campaignRole,
          quantity: row?.quantity || 1,
          hidden: false,
        };
        if (row) Object.assign(row, replacement);
        else scene.roster.push(replacement);
      });
    }
    if (action === "select-campaign-card") {
      this.campaignId = button.dataset.campaign;
      this.selectedSceneId = "";
      return this.render(true);
    }
    if (action === "select-scene") {
      this.selectedSceneId = button.dataset.scene;
      return this.render(true);
    }
    if (action === "open-map") {
      const map = game.scenes?.get(button.dataset.map);
      if (!map) return ui.notifications.warn("Mapa não encontrado no Foundry.");
      return map.view();
    }
    if (action === "play-fx" || action === "stop-fx") {
      const scene = this.campaign?.scenes.find(
          (entry) => entry.id === button.dataset.scene,
        ),
        map = scene?.mapSceneIds
          .map((id) => game.scenes?.get(id))
          .find(Boolean);
      if (!scene || !map)
        return ui.notifications.warn(
          "Associe um mapa a esta cena antes de controlar efeitos.",
        );
      try {
        if (action === "play-fx") await playPreset(scene.fx.preset, map);
        else await stopPreset(scene.fx.preset, map);
        ui.notifications.info(
          action === "play-fx" ? "Preset aplicado." : "Preset interrompido.",
        );
      } catch (error) {
        console.error(MODULE_ID, error);
        ui.notifications.error(
          error.message || "Não foi possível controlar o FXMaster.",
        );
      }
      return;
    }
    if (action === "add-map") {
      const select = this.element.querySelector(
        `[name="map-${CSS.escape(button.dataset.scene)}"]`,
      );
      const mapId = select?.value;
      if (!mapId) return ui.notifications.warn("Escolha um mapa.");
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === button.dataset.scene,
        );
        if (scene && !scene.mapSceneIds.includes(mapId))
          scene.mapSceneIds.push(mapId);
      });
    }
    if (action === "remove-map")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === button.dataset.scene,
        );
        if (scene)
          scene.mapSceneIds = scene.mapSceneIds.filter(
            (id) => id !== button.dataset.map,
          );
      });
    if (action === "set-current")
      return this.mutate((campaign) => {
        campaign.currentSceneId = button.dataset.scene;
        for (const scene of campaign.scenes)
          scene.status =
            scene.id === button.dataset.scene
              ? "current"
              : scene.status === "current"
                ? "pending"
                : scene.status;
      });
    if (action === "add-roster") {
      const uuid = this.element.querySelector('[name="roster-npc"]')?.value;
      const npc = this.npcCatalog().find((entry) => entry.uuid === uuid);
      if (!npc) return ui.notifications.warn("Escolha um NPC ou Ator.");
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === button.dataset.scene,
        );
        if (!scene) return;
        const existing = scene.roster.find((row) => row.actorUuid === npc.uuid);
        if (existing) existing.quantity = Math.min(99, existing.quantity + 1);
        else
          scene.roster.push({
            actorUuid: npc.uuid,
            name: npc.name,
            img: npc.img,
            role: npc.role || "token",
            quantity: 1,
            hidden: false,
          });
      });
    }
    if (action === "roster-quantity")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === this.selectedSceneId,
        );
        const row = scene?.roster.find(
          (entry) => entry.actorUuid === button.dataset.actor,
        );
        if (row)
          row.quantity = Math.max(
            1,
            Math.min(99, row.quantity + Number(button.dataset.change || 0)),
          );
      });
    if (action === "remove-roster")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === this.selectedSceneId,
        );
        if (scene)
          scene.roster = scene.roster.filter(
            (row) => row.actorUuid !== button.dataset.actor,
          );
      });
  }

  async change(event) {
    const target = event.target,
      action = target.dataset.action;
    if (action === "import-campaign") {
      const file = target.files?.[0];
      if (!file) return;
      try {
        const campaign = campaignFromMarkdown(
          await file.text(),
          file.name.replace(/\.[^.]+$/, ""),
        );
        campaign.mapFolderId = this.campaign?.mapFolderId || "";
        await saveCampaigns(game, [campaign]);
        this.campaignId = campaign.id;
        this.selectedSceneId = "";
        await this.render(true);
      } catch (error) {
        ui.notifications.error(error.message || "Falha ao importar campanha.");
      }
      return;
    }
    if (action === "select-campaign") {
      this.campaignId = target.value;
      this.selectedSceneId = "";
      return this.render(true);
    }
    if (action === "select-folder")
      return this.mutate((campaign) => {
        campaign.mapFolderId = target.value;
      });
    if (action === "replace-npc") {
      const npc = this.npcCatalog().find(
        (entry) => entry.uuid === target.value,
      );
      return this.mutate((campaign) => {
        const profile = campaign.npcProfiles.find(
          (entry) => entry.id === target.dataset.profile,
        );
        if (profile) {
          profile.actorUuid = npc?.uuid || "";
          profile.actorName = npc?.name || "";
          profile.actorImg = npc?.img || "";
        }
      });
    }
    if (action === "edit-title")
      return this.mutate((campaign) => {
        campaign.title = target.value.trim() || "Campanha sem nome";
      });
    if (action === "edit-era")
      return this.mutate((campaign) => {
        campaign.date.era = target.value;
      });
    if (action === "edit-year")
      return this.mutate((campaign) => {
        campaign.date.year = target.value;
      });
    if (action === "edit-regions")
      return this.mutate((campaign) => {
        campaign.regions = [
          ...new Set(
            target.value
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        ];
      });
    if (action === "edit-fx-preset")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === this.selectedSceneId,
        );
        if (scene) scene.fx.preset = target.value;
      });
  }
}
