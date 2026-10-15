import { MODULE_ID } from "./data.mjs";
import { listCampaigns, saveCampaigns } from "./store.mjs";
import { fxMasterStatus, playPreset, stopPreset } from "./fxmaster.mjs";
import { campaignFromMarkdown } from "./campaign-document.mjs";
import {
  renderMapSequence,
  renderRooms,
  renderLoot,
  roomOptions,
} from "./preparation.mjs";
import {
  renderQuestPanel,
  questAPI,
  createSceneTask,
  syncSceneTask,
  publishSceneUpdate,
} from "./quests.mjs";

const rosterKey = (row) =>
  JSON.stringify([row.actorUuid, row.roomId || "", row.profileId || ""]);
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
    const worldActors = Array.from(game.actors ?? [])
      .filter((actor) => actor.visible !== false)
      .map((actor) => ({
        uuid: actor.uuid ?? `Actor.${actor.id}`,
        name: actor.name,
        img: actor.img,
        role: actor.type || "ator",
        source: "Mundo",
      }));
    const api = game.modules.get("quedaco")?.api;
    if (
      api?.family === "quedaco" &&
      api.capabilities?.npcDatabase &&
      typeof api.listNpcs === "function"
    ) {
      try {
        const registered = api
          .listNpcs()
          .map((entry) => ({ ...entry, source: "QUEDAÇO" }));
        return [
          ...registered,
          ...worldActors.filter(
            (actor) => !registered.some((npc) => npc.uuid === actor.uuid),
          ),
        ];
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
    const renderScene = (entry, index) => {
      const assigned = entry.mapSceneIds
        .map((id) => mapNames.get(id))
        .filter(Boolean);
      const current = entry.id === selected?.id;
      return `<article class="qc-scene-row ${current ? "is-selected" : ""}"><button class="qc-scene-main" data-action="select-scene" data-scene="${esc(entry.id)}"><span class="qc-state is-${esc(entry.status)}"></span><span><small>${esc(entry.kind.toUpperCase())} · ${entry.roster.length} fichas · ${entry.loot.length} recompensas</small><strong>${esc(entry.title)}</strong><em>${esc(entry.objective)}</em></span></button><div class="qc-scene-maps">${assigned.length ? assigned.map((map) => `<span class="qc-map-chip"><button data-action="open-map" data-map="${esc(map.id)}" data-scene="${esc(entry.id)}">${esc(map.name)}</button><button data-action="remove-map" data-scene="${esc(entry.id)}" data-map="${esc(map.id)}" aria-label="Remover mapa">×</button></span>`).join("") : "<small>sem mapa</small>"}<select name="map-${esc(entry.id)}"><option value="">Associar mapa…</option>${maps.map(mapOption).join("")}</select><button data-action="add-map" data-scene="${esc(entry.id)}">+</button><button data-action="move-scene" data-scene="${esc(entry.id)}" data-direction="-1" ${index === 0 ? "disabled" : ""} aria-label="Mover cena para cima">↑</button><button data-action="move-scene" data-scene="${esc(entry.id)}" data-direction="1" ${index === campaign.scenes.length - 1 ? "disabled" : ""} aria-label="Mover cena para baixo">↓</button></div></article>`;
    };
    const rows = renderMapSequence(
      campaign,
      mapNames,
      selected?.id,
      renderScene,
    );
    const roster = selected?.roster ?? [];
    const rosterRows =
      roster
        .map(
          (row) =>
            `<li draggable="true" data-actor-uuid="${esc(row.actorUuid)}"><img src="${esc(row.img || "icons/svg/mystery-man.svg")}" alt=""><span><strong>${esc(row.name || row.actorUuid)}</strong><small>${esc(row.role)} · ${esc(selected.rooms.find((room) => room.id === row.roomId)?.name || "Cena inteira")} · ${row.hidden ? "oculto" : "visível"}</small></span><button data-action="roster-quantity" data-roster="${esc(rosterKey(row))}" data-change="-1">−</button><b>${row.quantity}</b><button data-action="roster-quantity" data-roster="${esc(rosterKey(row))}" data-change="1">+</button><button data-action="remove-roster" data-roster="${esc(rosterKey(row))}" aria-label="Remover">×</button></li>`,
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
          ["entryPoint", "Entrada do grupo / posicionamento no mapa"],
          ["narration", "Texto para narrar aos jogadores"],
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
    return `<div class="qc-shell"><header><div><small>ADMINISTRADOR DE CAMPANHA</small><h1>QUEDAÇO - Campanhas</h1></div><label>Campanha<select data-action="select-campaign">${this.campaigns.map((entry) => `<option value="${esc(entry.id)}" ${entry.id === campaign.id ? "selected" : ""}>${esc(entry.title)}</option>`).join("")}</select></label></header><section class="qc-library"><label>Adicionar campanha (.md ou .txt)<input type="file" accept=".md,.txt,text/plain,text/markdown" data-action="import-campaign"></label><div class="qc-campaign-grid">${campaignCards}</div></section><section class="qc-toolbar"><label>Pasta dos mapas no Foundry<select data-action="select-folder">${folderOptions}</select></label><span>${campaign.mapFolderId ? "A lista prioriza os mapas desta pasta." : "Nenhuma pasta selecionada; todos os mapas estão disponíveis."}</span></section><main><section class="qc-scenes"><header><h2>Cenas</h2><button data-action="new-scene">Adicionar cena</button><small>${campaign.scenes.length} cenas</small></header>${rows}</section><aside class="qc-detail">${sceneEditor}${selected ? renderQuestPanel(game, selected) + renderRooms(selected) : ""}${campaignInfo}${selected ? `<section><header><small>${esc(selected.kind.toUpperCase())} · ${esc(selected.status)}</small><h2>${esc(selected.title)}</h2><p>${esc(selected.objective)}</p><button data-action="set-current" data-scene="${esc(selected.id)}">Marcar como cena atual</button><button data-action="complete-scene" data-scene="${esc(selected.id)}">Concluir cena e atualizar missão</button></header><section><h3>Mapas associados</h3><div class="qc-map-cards">${mapCards}</div></section><section class="qc-resource-drop" data-resource-drop="Actor"><h3>Monstros e NPCs · tokens arrastáveis</h3><p>Adicione NPCs ou Atores à bandeja e abra o mapa. Cada linha pode ser arrastada para o canvas do Foundry para posicionar um token.</p><div class="qc-roster-add"><select name="roster-npc"><option value="">Escolher NPC ou Ator…</option>${npcOptions}</select><button data-action="add-roster" data-scene="${esc(selected.id)}">Adicionar</button></div><label>Sala para novos tokens<select name="roster-room">${roomOptions(selected)}</select></label><ul class="qc-roster">${rosterRows}</ul></section>${renderLoot(selected, Array.from(game.items ?? []), campaign.id)}</section>` : '<p class="qc-empty">Escolha uma cena.</p>'}</aside></main></div>`;
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
        const item = event.target.closest?.("[data-item-uuid]");
        if (item && event.dataTransfer) {
          event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
              type: "Item",
              uuid: item.dataset.itemUuid,
              quedacoCampaignLoot: {
                campaignId: item.dataset.campaign,
                sceneId: item.dataset.scene,
                lootId: item.dataset.lootId,
              },
            }),
          );
          event.dataTransfer.effectAllowed = "copy";
          return;
        }
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
        if (event.target.closest?.("[data-profile-id], [data-resource-drop]"))
          event.preventDefault();
      },
      { signal },
    );
    root.addEventListener(
      "drop",
      (event) =>
        void (event.target.closest?.("[data-profile-id]")
          ? this.dropNpcProfile(event)
          : this.dropResource(event)),
      {
        signal,
      },
    );
  }

  async prepareDocument(uuid, type) {
    try {
      let document = await fromUuid(uuid);
      if (type === "Actor" && document?.documentName === "Token")
        document = document.actor;
      if (document?.documentName !== type)
        throw Error("O documento não corresponde à bandeja escolhida.");
      const roomId =
        this.element.querySelector(
          type === "Item" ? '[name="loot-room"]' : '[name="roster-room"]',
        )?.value || "";
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === this.selectedSceneId,
        );
        if (!scene) return;
        const collection = type === "Item" ? scene.loot : scene.roster;
        const existing = collection.find(
          (row) =>
            (row.uuid || row.actorUuid) === document.uuid &&
            row.roomId === roomId &&
            !row.profileId,
        );
        if (existing) {
          existing.quantity += 1;
          return;
        }
        if (type === "Item")
          collection.push({
            id: `loot-${Date.now()}`,
            uuid: document.uuid,
            name: document.name,
            img: document.img,
            quantity: 1,
            roomId,
            notes: "",
            hidden: true,
          });
        else
          collection.push({
            actorUuid: document.uuid,
            name: document.name,
            img: document.img,
            role: document.type || "monstro / NPC",
            quantity: 1,
            roomId,
            hidden: false,
          });
      });
    } catch (error) {
      ui.notifications.error(
        error.message || "Não foi possível preparar o documento.",
      );
    }
  }

  async dropResource(event) {
    const target = event.target.closest?.("[data-resource-drop]");
    if (!target) return;
    event.preventDefault();
    let data;
    try {
      data = JSON.parse(event.dataTransfer?.getData("text/plain") || "{}");
    } catch {
      return;
    }
    if (!data.uuid) return;
    if (
      data.type !== target.dataset.resourceDrop &&
      !(data.type === "Token" && target.dataset.resourceDrop === "Actor")
    )
      return ui.notifications.warn(
        "Arraste uma ficha do tipo indicado nesta bandeja.",
      );
    return this.prepareDocument(data.uuid, target.dataset.resourceDrop);
  }

  async followMap(mapId, sceneId = "") {
    const candidates = [this.campaign, ...this.campaigns].filter(Boolean);
    const campaign = candidates.find((campaign) =>
      campaign.scenes.some((scene) => scene.mapSceneIds.includes(mapId)),
    );
    if (!campaign) return;
    const scene =
      campaign.scenes.find(
        (scene) =>
          scene.id === (sceneId || this.selectedSceneId) &&
          scene.mapSceneIds.includes(mapId),
      ) || campaign.scenes.find((scene) => scene.mapSceneIds.includes(mapId));
    this.campaignId = campaign.id;
    this.selectedSceneId = scene.id;
    return this.render(true);
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
      const current = target.scenes.find(
        (scene) => scene.id === this.selectedSceneId,
      );
      if (current) {
        for (const input of this.element.querySelectorAll("[data-scene-field]"))
          current[input.dataset.sceneField] = input.value;
        current.npcProfileIds = Array.from(
          this.element.querySelectorAll("[data-scene-npc]:checked"),
        ).map((input) => input.dataset.sceneNpc);
        for (const roomElement of this.element.querySelectorAll(
          "[data-room]",
        )) {
          const room = current.rooms.find(
            (room) => room.id === roomElement.dataset.room,
          );
          if (room)
            for (const input of roomElement.querySelectorAll(
              "[data-room-field]",
            ))
              room[input.dataset.roomField] = input.value;
        }
        const publicObjective = this.element.querySelector(
            '[name="public-objective"]',
          ),
          publicUpdate = this.element.querySelector('[name="public-update"]');
        if (publicObjective)
          current.quest.publicObjective = publicObjective.value;
        if (publicUpdate) current.quest.publicUpdate = publicUpdate.value;
      }
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
    if (action === "complete-scene")
      return this.mutate(async (campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === button.dataset.scene,
        );
        if (!scene) return;
        scene.status = "completed";
        if (scene.quest.syncOnComplete && scene.quest.taskId) {
          try {
            await syncSceneTask(game, scene, campaign);
          } catch (error) {
            ui.notifications.warn(
              `Cena concluída localmente. Missão ainda não sincronizada: ${error.message}`,
            );
          }
        }
      });
    if (action === "open-quest")
      return questAPI(game)?.open({
        questId: this.selectedScene?.quest.questId,
      });
    if (
      action === "create-quest-task" ||
      action === "sync-quest" ||
      action === "publish-quest-update"
    )
      return this.mutate(async (campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === this.selectedSceneId,
        );
        if (!scene) return;
        if (action === "create-quest-task")
          scene.quest.taskId = await createSceneTask(game, scene);
        else if (action === "sync-quest")
          await syncSceneTask(game, scene, campaign);
        else await publishSceneUpdate(game, scene);
      });
    if (action === "add-room")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === this.selectedSceneId,
        );
        if (scene)
          scene.rooms.push({
            id: `room-${Date.now()}`,
            name: `Sala ${scene.rooms.length + 1}`,
            description: "",
            notes: "",
            connections: "",
          });
      });
    if (action === "save-room") {
      const container = button.closest("[data-room]");
      const fields = Object.fromEntries(
        Array.from(container.querySelectorAll("[data-room-field]")).map(
          (input) => [input.dataset.roomField, input.value],
        ),
      );
      return this.mutate((campaign) => {
        const room = campaign.scenes
          .find((entry) => entry.id === this.selectedSceneId)
          ?.rooms.find((room) => room.id === button.dataset.room);
        if (room) Object.assign(room, fields);
      });
    }
    if (action === "add-loot")
      return this.prepareDocument(
        this.element.querySelector('[name="loot-item"]')?.value,
        "Item",
      );
    if (action === "loot-quantity" || action === "remove-loot")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === this.selectedSceneId,
        );
        if (!scene) return;
        if (action === "remove-loot")
          scene.loot = scene.loot.filter(
            (row) => row.id !== button.dataset.loot,
          );
        else {
          const row = scene.loot.find((row) => row.id === button.dataset.loot);
          if (row)
            row.quantity = Math.max(
              1,
              Math.min(999, row.quantity + Number(button.dataset.change || 0)),
            );
        }
      });
    if (action === "open-document") {
      const document = await fromUuid(button.dataset.uuid);
      return document?.sheet?.render(true);
    }
    if (action === "move-scene")
      return this.mutate((campaign) => {
        const index = campaign.scenes.findIndex(
            (scene) => scene.id === button.dataset.scene,
          ),
          next = index + Number(button.dataset.direction);
        if (index >= 0 && next >= 0 && next < campaign.scenes.length) {
          const [scene] = campaign.scenes.splice(index, 1);
          campaign.scenes.splice(next, 0, scene);
        }
      });
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
      return this.mutate(() => {
        this.campaignId = button.dataset.campaign;
        this.selectedSceneId = "";
      });
    }
    if (action === "select-scene") {
      return this.mutate(() => {
        this.selectedSceneId = button.dataset.scene;
      });
    }
    if (action === "open-map") {
      const map = game.scenes?.get(button.dataset.map);
      if (!map) return ui.notifications.warn("Mapa não encontrado no Foundry.");
      await this.mutate(() => {});
      await map.view();
      return this.followMap(map.id, button.dataset.scene);
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
      const select = button.closest(".qc-scene-maps")?.querySelector("select");
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
    if (action === "add-roster")
      return this.prepareDocument(
        this.element.querySelector('[name="roster-npc"]')?.value,
        "Actor",
      );
    if (action === "roster-quantity")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === this.selectedSceneId,
        );
        const row = scene?.roster.find(
          (entry) => rosterKey(entry) === button.dataset.roster,
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
            (row) => rosterKey(row) !== button.dataset.roster,
          );
      });
  }

  async change(event) {
    const target = event.target,
      action = target.dataset.action;
    if (
      action === "link-quest" ||
      action === "link-quest-task" ||
      action === "quest-auto-sync"
    )
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === this.selectedSceneId,
        );
        if (!scene) return;
        if (action === "link-quest") {
          scene.quest.questId = target.value;
          scene.quest.taskId = "";
        }
        if (action === "link-quest-task") scene.quest.taskId = target.value;
        if (action === "quest-auto-sync")
          scene.quest.syncOnComplete = target.checked;
      });
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
