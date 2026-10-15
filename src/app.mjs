import { resourceDefinitions } from "./declared-resources.mjs";
import {
  areaSceneData,
  learningStats,
  recordAreaFeedback,
  suggestArea,
} from "./room-learning.mjs";
import { MODULE_ID, DEFAULT_COVER } from "./data.mjs";
import { renderWorkspace } from "./views.mjs";
import { extractFoundryAreas } from "./map-review.mjs";
import { ResourceCatalog, applyResourceMatches } from "./resource-catalog.mjs";
import { mapsInFolder } from "./map-library.mjs";
import { listCampaigns, saveCampaigns } from "./store.mjs";
import {
  playPreset,
  stopPreset,
  openFxEditor,
  applyStoredSceneFx,
} from "./fxmaster.mjs";
import { campaignFromMarkdown, enrichScenes } from "./campaign-document.mjs";
import {
  questAPI,
  createSceneTask,
  syncSceneTask,
  publishSceneUpdate,
} from "./quests.mjs";

const rosterKey = (row) =>
  JSON.stringify([row.actorUuid, row.roomId || "", row.profileId || ""]);
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
    this.detailTab = "roteiro";
    this.galleryOpen = true;
    this.mapSearch = "";
    this.drawMode = "point";
    this.pointType = "exploration";
    this.pendingVertices = [];
    this.rectangleStart = null;
    this.catalog = new ResourceCatalog(game);
    this.resourcesInitialized = false;
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
    return mapsInFolder(
      this.allMaps(),
      this.sceneFolders(),
      this.campaign?.mapFolderId,
    );
  }
  npcCatalog() {
    return this.catalog.entries.filter((row) => row.documentName === "Actor");
  }
  async prepareCatalog(force = false) {
    await this.catalog.load(force);
    const all = this.campaigns,
      before = JSON.stringify(all);
    for (const campaign of all)
      applyResourceMatches(campaign, this.catalog.entries);
    if (before !== JSON.stringify(all)) await saveCampaigns(game, all);
    this.resourcesInitialized = true;
  }
  async _renderHTML() {
    if (!game.user?.isGM)
      return "<p>O administrador de campanhas é uma ferramenta da Mestra.</p>";
    if (!this.resourcesInitialized) await this.prepareCatalog();
    const campaign = this.campaign;
    if (!campaign) return "<p>Nenhuma campanha disponível.</p>";
    this.campaignId = campaign.id;
    this.selectedSceneId = this.selectedScene?.id || campaign.currentSceneId;
    return renderWorkspace(this, game);
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
  }

  captureScroll() {
    const value = (selector) => this.element?.querySelector(selector)?.scrollTop || 0;
    return {
      scenes: value(".qc-scenes"),
      detail: value(".qc-detail"),
      library: value(".qc-library"),
      timeline: this.element?.querySelector(".qc-timeline-track")?.scrollLeft || 0,
    };
  }

  restoreScroll(state) {
    if (!state) return;
    for (const [key, selector] of [
      ["scenes", ".qc-scenes"],
      ["detail", ".qc-detail"],
      ["library", ".qc-library"],
    ]) {
      const element = this.element?.querySelector(selector);
      if (element) element.scrollTop = state[key] || 0;
    }
    const timeline = this.element?.querySelector(".qc-timeline-track");
    if (timeline) timeline.scrollLeft = state.timeline || 0;
  }

  async renderPreservingScroll() {
    const state = this.captureScroll();
    await this.render(true);
    this.restoreScroll(state);
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
    root.addEventListener(
      "pointerdown",
      (event) => void this.mapPointerDown(event),
      { signal },
    );
    root.addEventListener(
      "pointermove",
      (event) => this.mapPointerMove(event),
      { signal },
    );
    root.addEventListener(
      "pointerup",
      (event) => void this.mapPointerUp(event),
      { signal },
    );
    root.addEventListener("change", (event) => void this.change(event), {
      signal,
    });
    root.addEventListener(
      "toggle",
      (event) => {
        if (event.target.matches?.(".qc-map-library"))
          this.galleryOpen = event.target.open;
      },
      { signal, capture: true },
    );
    root.addEventListener(
      "input",
      (event) => {
        if (event.target.name !== "map-search") return;
        const value = event.target.value;
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
          this.mapSearch = value;
          this.restoreSearchFocus = true;
          void this.mutate(() => {});
        }, 220);
      },
      { signal },
    );
    if (this.restoreSearchFocus) {
      const input = root.querySelector('[name="map-search"]');
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
      this.restoreSearchFocus = false;
    }
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
        if (
          event.target.closest?.(
            "[data-profile-id], [data-resource-drop], [data-resource-profile]",
          )
        )
          event.preventDefault();
      },
      { signal },
    );
    root.addEventListener(
      "drop",
      (event) =>
        void (event.target.closest?.("[data-resource-profile]")
          ? this.dropResourceProfile(event)
          : event.target.closest?.("[data-profile-id]")
            ? this.dropNpcProfile(event)
            : this.dropResource(event)),
      {
        signal,
      },
    );
  }

  mapCoordinates(event, canvasElement) {
    const image = canvasElement?.querySelector("img"),
      rect = image?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  }

  addMapArea(campaign, mapId, shape, vertices) {
    const review = (campaign.mapReviews[mapId] ??= { notes: "", points: [] }),
      index = review.points.length + 1,
      first = vertices[0] || { x: 0, y: 0 };
    review.points.push({
      id: globalThis.crypto?.randomUUID?.() || `area-${Date.now()}`,
      type: this.pointType || "exploration",
      shape,
      x: first.x,
      y: first.y,
      vertices,
      title: `Sala ${index}`,
      description: "",
      visualDescription: "",
      gmNotes: "",
      environment: "unknown",
      status: "draft",
      suggestion: {},
      feedback: "",
      feedbackId: "",
      sceneId: "",
    });
  }

  async mapPointerDown(event) {
    const canvasElement = event.target.closest?.('[data-action="draw-map-area"]');
    if (
      !canvasElement ||
      event.target.closest?.('[data-action="focus-area"]') ||
      this.drawMode !== "rect" ||
      event.button !== 0
    )
      return;
    this.rectangleStart = this.mapCoordinates(event, canvasElement);
    canvasElement.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  mapPointerMove(event) {
    if (!this.rectangleStart || this.drawMode !== "rect") return;
    const canvasElement = event.target.closest?.('[data-action="draw-map-area"]');
    if (!canvasElement) return;
    const current = this.mapCoordinates(event, canvasElement),
      preview = canvasElement.querySelector(".qc-pending-rect");
    if (!current || !preview) return;
    preview.removeAttribute("hidden");
    preview.setAttribute("x", Math.min(this.rectangleStart.x, current.x));
    preview.setAttribute("y", Math.min(this.rectangleStart.y, current.y));
    preview.setAttribute("width", Math.abs(this.rectangleStart.x - current.x));
    preview.setAttribute("height", Math.abs(this.rectangleStart.y - current.y));
  }

  async mapPointerUp(event) {
    if (!this.rectangleStart || this.drawMode !== "rect") return;
    const canvasElement = event.target.closest?.('[data-action="draw-map-area"]'),
      start = this.rectangleStart;
    this.rectangleStart = null;
    if (!canvasElement) return;
    event.preventDefault();
    const end = this.mapCoordinates(event, canvasElement);
    if (!end || Math.abs(start.x - end.x) < 1 || Math.abs(start.y - end.y) < 1)
      return ui.notifications.info("Arraste uma área maior para marcar a sala.");
    const mapId = canvasElement.closest("[data-review-map]").dataset.reviewMap;
    return this.mutate((campaign) =>
      this.addMapArea(campaign, mapId, "rect", [start, end]),
    );
  }

  async bindResourceProfile(id, uuid) {
    if (!uuid) return;
    try {
      let document = await fromUuid(uuid);
      if (document?.documentName === "Token") document = document.actor;
      const profile = resourceDefinitions(this.campaign).find(
        (row) => row.id === id,
      );
      if (
        !profile ||
        document?.documentName !== (profile.kind === "item" ? "Item" : "Actor")
      )
        throw Error("Escolha uma ficha compatível com este recurso.");
      return this.mutate((campaign) => {
        if (
          id.startsWith("npc:") &&
          campaign.npcProfiles.some((row) => `npc:${row.id}` === id)
        ) {
          Object.assign(
            campaign.npcProfiles.find((row) => `npc:${row.id}` === id),
            {
              actorUuid: document.uuid,
              actorName: document.name,
              actorImg: document.img,
            },
          );
        } else
          Object.assign(
            campaign.resourceProfiles.find((row) => row.id === id),
            {
              uuid: document.uuid,
              bindingName: document.name,
              img: document.img,
            },
          );
      });
    } catch (error) {
      ui.notifications.warn(error.message);
    }
  }
  async dropResourceProfile(event) {
    event.preventDefault();
    try {
      const data = JSON.parse(event.dataTransfer.getData("text/plain"));
      return this.bindResourceProfile(
        event.target.closest("[data-resource-profile]").dataset.resourceProfile,
        data.uuid,
      );
    } catch (error) {
      ui.notifications.warn("Arraste uma ficha ou token válido.");
    }
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
          existing.source = "manual";
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
    return this.mutate(() => {
      this.campaignId = campaign.id;
      this.selectedSceneId = scene.id;
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
    const scrollState = this.captureScroll();
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
      const reviewElement = this.element.querySelector("[data-review-map]");
      if (reviewElement) {
        const review = (target.mapReviews[reviewElement.dataset.reviewMap] ??= {
          notes: "",
          points: [],
        });
        review.notes =
          reviewElement.querySelector("[data-review-notes]")?.value || "";
        for (const element of reviewElement.querySelectorAll("[data-area]")) {
          const point = review.points.find(
            (row) => row.id === element.dataset.area,
          );
          if (point) {
            for (const input of element.querySelectorAll("[data-area-field]"))
              point[input.dataset.areaField] = input.value;
            for (const input of element.querySelectorAll(
              "[data-suggestion-field]",
            ))
              point.suggestion[input.dataset.suggestionField] = input.value;
          }
        }
      }
      await callback(target);
      if (target.usesMaps)
        for (const scene of target.scenes)
          scene.mapSceneIds = (scene.mapSceneIds || []).slice(0, 1);
      await this.catalog.load();
      applyResourceMatches(target, this.catalog.entries);
      await saveCampaigns(game, all);
      await this.render(true);
      this.restoreScroll(scrollState);
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
    if (action === "review-map")
      return this.mutate(() => {
        this.reviewMapId = button.dataset.map;
        this.detailTab = "mapa";
        this.pendingVertices = [];
      });
    if (action === "save-map-review") return this.mutate(() => {});
    if (action === "import-foundry-areas") {
      const mapId = button.closest("[data-review-map]").dataset.reviewMap,
        map = game.scenes.get(mapId);
      return this.mutate((campaign) => {
        const review = (campaign.mapReviews[mapId] ??= { notes: "", points: [] });
        for (const imported of extractFoundryAreas(map)) {
          if (review.points.some((area) => area.sourceId === imported.sourceId))
            continue;
          this.addMapArea(campaign, mapId, imported.shape, imported.vertices);
          Object.assign(review.points.at(-1), {
            title: imported.title || `Sala ${review.points.length}`,
            source: imported.source,
            sourceId: imported.sourceId,
          });
        }
      });
    }
    if (action === "draw-map-area") {
      if (this.drawMode === "rect") return;
      const coordinate = this.mapCoordinates(event, button);
      if (!coordinate) return;
      const mapId = button.closest("[data-review-map]").dataset.reviewMap;
      if (this.drawMode === "polygon") {
        this.pendingVertices.push(coordinate);
        const preview = button.querySelector(".qc-pending-polygon");
        preview?.setAttribute(
          "points",
          this.pendingVertices.map((point) => `${point.x},${point.y}`).join(" "),
        );
        const hint = button
          .closest("[data-review-map]")
          .querySelector(".qc-draw-toolbar small");
        if (hint)
          hint.textContent = `Clique nos cantos da sala e conclua o polígono · ${this.pendingVertices.length} vértices.`;
        return;
      }
      return this.mutate((campaign) =>
        this.addMapArea(campaign, mapId, "point", [coordinate]),
      );
    }
    if (action === "cancel-polygon") {
      this.pendingVertices = [];
      return this.renderPreservingScroll();
    }
    if (action === "finish-polygon") {
      const mapId = button.closest("[data-review-map]").dataset.reviewMap;
      if (this.pendingVertices.length < 3)
        return ui.notifications.info(
          "Marque pelo menos três cantos para concluir o polígono.",
        );
      const vertices = [...this.pendingVertices];
      this.pendingVertices = [];
      return this.mutate((campaign) =>
        this.addMapArea(campaign, mapId, "polygon", vertices),
      );
    }
    if (action === "focus-area") {
      const card = this.element.querySelector(
        `[data-area="${button.dataset.area}"]`,
      );
      card?.scrollIntoView({ behavior: "smooth", block: "start" });
      card?.classList.add("is-focused");
      setTimeout(() => card?.classList.remove("is-focused"), 1200);
      return;
    }
    if (
      [
        "suggest-area",
        "accept-area",
        "reject-area",
        "area-scene",
        "link-area-scene",
        "remove-area",
      ].includes(action)
    ) {
      const mapId = button.closest("[data-review-map]").dataset.reviewMap;
      return this.mutate((campaign) => {
        const review = campaign.mapReviews[mapId],
          area = review?.points.find((row) => row.id === button.dataset.area);
        if (!area) return;
        if (action === "remove-area") {
          review.points = review.points.filter((row) => row.id !== area.id);
          return;
        }
        if (action === "suggest-area") {
          area.suggestion = suggestArea(campaign, area, this.campaigns);
          area.status = "suggested";
          area.feedback = "";
          return;
        }
        if (action === "accept-area" || action === "reject-area") {
          const decision =
            action === "accept-area" ? "accepted" : "rejected";
          recordAreaFeedback(campaign, area, decision);
          area.status = decision;
          return;
        }
        if (action === "link-area-scene") {
          const scene = campaign.scenes.find(
            (row) => row.id === this.selectedSceneId,
          );
          if (scene) {
            area.sceneId = scene.id;
            scene.presentation = "map";
            if (!scene.mapSceneIds.includes(mapId))
              scene.mapSceneIds.push(mapId);
            scene.mapAreaRefs ??= [];
            if (!scene.mapAreaRefs.some((row) => row.areaId === area.id))
              scene.mapAreaRefs.push({ mapId, areaId: area.id });
          }
          return;
        }
        if (!campaign.scenes.some((row) => row.id === area.sceneId)) {
          if (!Object.values(area.suggestion || {}).some(Boolean))
            area.suggestion = suggestArea(campaign, area, this.campaigns);
          const newScene = areaSceneData(area, mapId);
          area.sceneId = newScene.id;
          const index = campaign.scenes.findIndex(
            (row) => row.id === this.selectedSceneId,
          );
          campaign.scenes.splice(index + 1, 0, newScene);
        }
        this.selectedSceneId = area.sceneId;
        this.detailTab = "roteiro";
      });
    }
    if (action === "create-accepted-scenes") {
      const mapId = button.closest("[data-review-map]").dataset.reviewMap;
      return this.mutate((campaign) => {
        const areas = campaign.mapReviews[mapId]?.points || [];
        let insertion = campaign.scenes.findIndex(
          (row) => row.id === this.selectedSceneId,
        );
        for (const area of areas
          .filter((row) => row.feedback === "accepted" && !row.sceneId)
          .sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0))) {
          const newScene = areaSceneData(area, mapId);
          area.sceneId = newScene.id;
          campaign.scenes.splice(++insertion, 0, newScene);
        }
      });
    }
    if (action === "export-learning") {
      await this.mutate(() => {});
      const data = JSON.stringify(learningStats(this.campaigns).samples, null, 2),
        name = `quedaco-aprendizado-${Date.now()}.json`;
      if (typeof globalThis.saveDataToFile === "function")
        return globalThis.saveDataToFile(data, "application/json", name);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(
        new Blob([data], { type: "application/json" }),
      );
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      return;
    }
    if (action === "use-map-cover")
      return this.mutate((campaign) => {
        const map = game.scenes.get(button.dataset.map);
        if (map)
          campaign.cover = map.thumb || map.background?.src || DEFAULT_COVER;
      });
    if (action === "link-quest-card")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (row) => row.id === this.selectedSceneId,
        );
        if (scene) {
          scene.quest.questId = button.dataset.quest;
          scene.quest.taskId = "";
        }
      });
    if (action === "toggle-quest-sync")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (row) => row.id === this.selectedSceneId,
        );
        if (scene) scene.quest.syncOnComplete = !scene.quest.syncOnComplete;
      });
    if (action === "detail-tab")
      return this.mutate(() => {
        this.detailTab = button.dataset.tab;
      });
    if (action === "toggle-profile")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (row) => row.id === this.selectedSceneId,
        );
        if (scene)
          scene.npcProfileIds = scene.npcProfileIds.includes(
            button.dataset.profile,
          )
            ? scene.npcProfileIds.filter((id) => id !== button.dataset.profile)
            : [...scene.npcProfileIds, button.dataset.profile];
      });
    if (action === "set-map-mode")
      return this.mutate((campaign) => {
        campaign.usesMaps = button.dataset.value === "true";
        if (campaign.usesMaps) this.galleryOpen = true;
      });
    if (action === "choose-scene-map")
      return this.mutate(() => {
        this.selectedSceneId = button.dataset.scene;
        this.galleryOpen = true;
        this.detailTab = "roteiro";
      });
    if (action === "assign-map")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (row) => row.id === this.selectedSceneId,
        );
        if (scene) {
          scene.presentation = "map";
          scene.mapSceneIds = scene.mapSceneIds.includes(button.dataset.map)
            ? scene.mapSceneIds.filter((id) => id !== button.dataset.map)
            : [button.dataset.map];
        }
      });
    if (action === "resolve-resources") {
      await this.catalog.load(true);
      return this.mutate(() => {});
    }
    if (action === "pick-image" || action === "pick-cover") {
      const Picker =
        foundry.applications.apps?.FilePicker?.implementation ||
        globalThis.FilePicker;
      if (!Picker)
        return ui.notifications.warn(
          "O seletor de arquivos não está disponível. Cole o caminho da imagem no campo.",
        );
      return new Picker({
        type: "image",
        current:
          action === "pick-cover"
            ? this.campaign.cover
            : this.selectedScene?.image,
        callback: (path) =>
          void this.mutate((campaign) => {
            if (action === "pick-cover") campaign.cover = path;
            else {
              const scene = campaign.scenes.find(
                (row) => row.id === this.selectedSceneId,
              );
              if (scene) scene.image = path;
            }
          }),
      }).browse();
    }
    if (action === "open-image" || action === "share-image") {
      await this.mutate(() => {});
      const scene = this.campaign?.scenes.find(
        (row) => row.id === button.dataset.scene,
      );
      if (!scene) return;
      const Popout =
        foundry.applications.apps?.ImagePopout || globalThis.ImagePopout;
      if (!Popout)
        return ui.notifications.warn(
          "O visualizador de imagens não está disponível.",
        );
      const popout = new Popout({
        src: scene.image || DEFAULT_COVER,
        window: { title: this.campaign.title },
        shareable: true,
      });
      await popout.render(true);
      if (action === "share-image") popout.shareImage();
      return;
    }
    if (action === "fx-particles" || action === "fx-filters") {
      await this.mutate(() => {});
      const map = game.scenes?.get(button.dataset.map);
      try {
        return await openFxEditor(
          map,
          action === "fx-filters" ? "filters" : "particles",
        );
      } catch (error) {
        ui.notifications.warn(error.message);
        return;
      }
    }
    if (action === "save-fx") {
      const preset = this.element
        .querySelector('[name="fx-preset"]')
        ?.value.trim();
      if (!preset)
        return ui.notifications.warn(
          "Escolha um preset ou use o painel de partículas.",
        );
      return this.mutate(async (campaign) => {
        const scene = campaign.scenes.find(
          (row) => row.id === button.dataset.scene,
        );
        if (!scene) return;
        for (const id of scene.mapSceneIds) {
          const map = game.scenes.get(id);
          if (
            map &&
            scene.fx.enabled &&
            scene.fx.preset &&
            scene.fx.preset !== preset
          )
            await stopPreset(scene.fx.preset, map);
          if (map) await playPreset(preset, map);
        }
        scene.fx.preset = preset;
        scene.fx.enabled = true;
      });
    }
    if (action === "disable-fx")
      return this.mutate(async (campaign) => {
        const scene = campaign.scenes.find(
          (row) => row.id === button.dataset.scene,
        );
        if (!scene) return;
        for (const id of scene.mapSceneIds) {
          const map = game.scenes.get(id);
          if (map) await stopPreset(scene.fx.preset, map);
        }
        scene.fx.enabled = false;
      });
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
        if (action === "remove-loot") {
          const removed = scene.loot.find(
            (row) => row.id === button.dataset.loot,
          );
          if (removed) scene.excludedResources.push(removed.uuid);
        }
        if (action === "remove-loot")
          scene.loot = scene.loot.filter(
            (row) => row.id !== button.dataset.loot,
          );
        else {
          const row = scene.loot.find((row) => row.id === button.dataset.loot);
          if (row) row.source = "manual";
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
        const index = campaign.scenes.findIndex(
          (scene) => scene.id === this.selectedSceneId,
        );
        campaign.scenes.splice(index + 1, 0, {
          id,
          title: "Nova cena",
          narration:
            "Vocês chegam a uma nova etapa da jornada. Antes de seguir, observem o ambiente e decidam o próximo passo.",
          kind: "narrativa",
          objective: "",
          mapSceneIds: [],
          roster: [],
          presentation: "image",
        });
        this.selectedSceneId = id;
        this.detailTab = "roteiro";
      });
    if (action === "new-map-scene")
      return this.mutate((campaign) => {
        const id = `scene-${Date.now()}`,
          mapId = button.dataset.map,
          mapIndexes = campaign.scenes
            .map((scene, index) => ({ scene, index }))
            .filter(({ scene }) => scene.mapSceneIds?.[0] === mapId),
          insertAt = mapIndexes.length
            ? mapIndexes.at(-1).index + 1
            : campaign.scenes.length;
        campaign.scenes.splice(insertAt, 0, {
          id,
          title: "Nova cena deste mapa",
          narration:
            "Descreva o que os personagens percebem nesta parte do mapa.",
          kind: "exploração",
          objective: "",
          mapSceneIds: [mapId],
          mapAreaRefs: [],
          roster: [],
          loot: [],
          presentation: "map",
        });
        this.selectedSceneId = id;
        this.detailTab = "roteiro";
      });
    if (action === "save-scene") {
      const fields = Object.fromEntries(
        Array.from(this.element.querySelectorAll("[data-scene-field]")).map(
          (input) => [input.dataset.sceneField, input.value],
        ),
      );
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (entry) => entry.id === button.dataset.scene,
        );
        if (scene) Object.assign(scene, fields);
      });
    }
    if (action === "save-material") {
      const material = this.element.querySelector(
        '[name="working-material"]',
      )?.value;
      return this.mutate((campaign) => {
        campaign.working.material = material ?? campaign.working.material;
        campaign.working.revision += 1;
        Object.assign(
          campaign,
          enrichScenes(campaign, campaign.working.material),
        );
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
      this.openingMap = true;
      try {
        await map.view();
        await this.followMap(map.id, button.dataset.scene);
      } finally {
        this.openingMap = false;
      }
      const linked = this.campaign?.scenes.find(
        (scene) => scene.id === (button.dataset.scene || this.selectedSceneId),
      );
      if (linked)
        try {
          await applyStoredSceneFx(linked, map);
        } catch (error) {
          ui.notifications.warn(error.message);
        }
      return;
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
        if (scene) scene.presentation = "map";
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
        if (row) row.source = "manual";
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
        if (scene) {
          const removed = scene.roster.find(
            (row) => rosterKey(row) === button.dataset.roster,
          );
          if (removed) scene.excludedResources.push(removed.actorUuid);
        }
        if (scene)
          scene.roster = scene.roster.filter(
            (row) => rosterKey(row) !== button.dataset.roster,
          );
      });
  }

  async change(event) {
    const target = event.target,
      action = target.dataset.action;
    if (target.name === "draw-mode") {
      this.drawMode = target.value;
      this.pendingVertices = [];
      return this.mutate(() => {});
    }
    if (target.name === "point-type") {
      this.pointType = target.value;
      return;
    }
    if (action === "bind-resource-profile")
      return this.bindResourceProfile(target.dataset.profile, target.value);
    if (action === "scene-presentation") return this.mutate(() => {});
    if (action === "edit-cover")
      return this.mutate((campaign) => {
        campaign.cover = target.value;
      });
    if (action === "link-quest-card")
      return this.mutate((campaign) => {
        const scene = campaign.scenes.find(
          (row) => row.id === this.selectedSceneId,
        );
        if (scene) {
          scene.quest.questId = target.value;
          scene.quest.taskId = "";
        }
      });
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
        await this.catalog.load();
        applyResourceMatches(campaign, this.catalog.entries);
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
        this.galleryOpen = true;
        this.mapSearch = "";
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
