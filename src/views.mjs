import { resourcesForScene } from "./declared-resources.mjs";
import { renderMapReview } from "./map-review.mjs";
import { DEFAULT_COVER, SCENE_TYPES } from "./data.mjs";
import { escapeHtml as esc, mapSequence, renderLoot } from "./preparation.mjs";
import { mapImage, folderPath } from "./map-library.mjs";
import { renderQuestPanel } from "./quests.mjs";
import { fxMasterStatus, presetNames } from "./fxmaster.mjs";

const button = (action, label, attributes = "") =>
  `<button type="button" data-action="${action}" ${attributes}>${label}</button>`;
const img = (src, alt = "", className = "") =>
  `<img class="${className}" src="${esc(src || DEFAULT_COVER)}" alt="${esc(alt)}" loading="lazy">`;
const field = (name, label, value, rows = 3) =>
  `<label class="qc-field">${label}<textarea data-scene-field="${name}" rows="${rows}">${esc(value)}</textarea></label>`;
const sceneMap = (scene, maps) =>
  scene.mapSceneIds.map((id) => maps.get(id)).find(Boolean);
const mediaImage = (scene, maps) =>
  scene.presentation === "image"
    ? scene.image || DEFAULT_COVER
    : mapImage(sceneMap(scene, maps));

function timeline(app, campaign, maps) {
  return mapSequence(campaign)
    .map((group) => {
      const map = maps.get(group.mapId);
      return `<section class="qc-map-group" data-map-group="${esc(group.mapId)}"><header>${map ? img(mapImage(map), map.name) : ""}<div><strong>${esc(map?.name || "Narração e próximas cenas")}</strong><small>${group.scenes.length} de ${campaign.scenes.length} cenas</small></div></header><ol>${group.scenes.map(({ scene, index }) => `<li class="${scene.id === app.selectedSceneId ? "is-active" : ""}"><span class="qc-step-number">${String(index + 1).padStart(2, "0")}</span><article class="qc-scene-row"><button class="qc-scene-main" data-action="select-scene" data-scene="${esc(scene.id)}">${img(mediaImage(scene, maps), "", "qc-scene-thumb")}<span><small>${esc(SCENE_TYPES.find(([value]) => value === scene.kind)?.[1] || "Narração")} · ${scene.presentation === "image" ? "Imagem" : "Mapa"}</small><strong>${esc(scene.title)}</strong></span></button><div class="qc-row-actions">${scene.presentation === "image" ? button("open-image", "Abrir imagem", `data-scene="${esc(scene.id)}"`) : map ? button("open-map", "Abrir mapa", `data-map="${esc(map.id)}" data-scene="${esc(scene.id)}"`) : button("choose-scene-map", "Escolher mapa", `data-scene="${esc(scene.id)}"`)}${button("move-scene", "↑", `data-scene="${esc(scene.id)}" data-direction="-1" aria-label="Mover cena para cima" ${index === 0 ? "disabled" : ""}`)}${button("move-scene", "↓", `data-scene="${esc(scene.id)}" data-direction="1" aria-label="Mover cena para baixo" ${index === campaign.scenes.length - 1 ? "disabled" : ""}`)}</div><div class="qc-inline-resources">${scene.roster.map((row) => `<span draggable="true" data-actor-uuid="${esc(row.actorUuid)}" title="${esc(row.name)}">${img(row.img || "icons/svg/mystery-man.svg")}<span>${esc(row.name)} ×${row.quantity}</span></span>`).join("")}${scene.loot.map((item) => `<span draggable="true" data-item-uuid="${esc(item.uuid)}" data-loot-id="${esc(item.id)}" data-campaign="${esc(campaign.id)}" data-scene="${esc(scene.id)}" title="${esc(item.name)}">${img(item.img || "icons/svg/item-bag.svg")}<span>${esc(item.name)} ×${item.quantity}</span></span>`).join("")}</div></article></li>`).join("")}</ol></section>`;
    })
    .join("");
}

function mapGallery(app, scene) {
  const maps = app
    .mapsForCampaign()
    .filter(
      (map) =>
        !app.mapSearch ||
        `${map.name} ${map.folder?.name || ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(app.mapSearch.toLocaleLowerCase("pt-BR")),
    );
  return `<details class="qc-map-library" ${app.galleryOpen ? "open" : ""}><summary>Galeria de mapas da pasta · ${maps.length}</summary><div class="qc-gallery-tools"><input name="map-search" value="${esc(app.mapSearch || "")}" placeholder="Buscar mapa nesta pasta" aria-label="Buscar mapa nesta pasta"><small>Escolha uma miniatura para usar em “${esc(scene?.title || "cena")}”.</small></div><div class="qc-map-gallery">${maps.map((map) => `<article class="qc-map-tile ${scene?.mapSceneIds.includes(map.id) ? "is-assigned" : ""}">${img(mapImage(map), map.name)}<strong>${esc(map.name)}</strong><small>${esc(folderPath(map.folder, app.sceneFolders()))}</small><div>${button("assign-map", scene?.mapSceneIds.includes(map.id) ? "Usar nesta cena ✓" : "Usar nesta cena", `data-map="${esc(map.id)}"`)}${button("open-map", "Abrir", `data-map="${esc(map.id)}" data-scene="${esc(scene?.id || "")}"`)}${button("review-map", "Planejar", `data-map="${esc(map.id)}"`)}${button("use-map-cover", "Capa", `data-map="${esc(map.id)}"`)}</div></article>`).join("") || '<p class="qc-empty">Escolha a pasta que contém os mapas da campanha.</p>'}</div></details>`;
}

function sceneMedia(scene, maps) {
  if (scene.presentation === "image")
    return `<section class="qc-scene-media"><div class="qc-image-preview">${img(scene.image || DEFAULT_COVER, "Imagem de narração")}</div><label class="qc-field">Imagem de narração<div class="qc-input-action"><input data-scene-field="image" value="${esc(scene.image)}" placeholder="Caminho da imagem no Foundry">${button("pick-image", "Escolher imagem")}</div></label><div class="qc-actions">${button("open-image", "Abrir imagem", `data-scene="${esc(scene.id)}"`)}${button("share-image", "Mostrar imagem aos jogadores", `data-scene="${esc(scene.id)}"`)}</div></section>`;
  const assigned = scene.mapSceneIds.map((id) => maps.get(id)).filter(Boolean);
  return `<section class="qc-scene-media"><div class="qc-assigned-maps">${assigned.map((map) => `<article>${img(mapImage(map), map.name)}<strong>${esc(map.name)}</strong><div class="qc-actions">${button("open-map", "Abrir mapa", `data-map="${esc(map.id)}" data-scene="${esc(scene.id)}"`)}${button("fx-particles", "☁ Partículas", `data-map="${esc(map.id)}" data-scene="${esc(scene.id)}" ${fxMasterStatus().available ? "" : "disabled"}`)}${button("fx-filters", "◐ Filtros", `data-map="${esc(map.id)}" data-scene="${esc(scene.id)}" ${fxMasterStatus().available ? "" : "disabled"}`)}${button("remove-map", "×", `data-map="${esc(map.id)}" data-scene="${esc(scene.id)}" aria-label="Retirar mapa da cena"`)}</div></article>`).join("")}</div>${button("choose-scene-map", "Escolher mapa na galeria", `data-scene="${esc(scene.id)}"`)}</section>`;
}

function fxPanel(scene, maps) {
  if (scene.presentation !== "map" || !scene.mapSceneIds.length) return "";
  const status = fxMasterStatus();
  return `<details class="qc-fx"><summary>Preset e efeitos desta cena · FXMaster</summary><label class="qc-field">Preset<div class="qc-input-action"><input name="fx-preset" list="qc-presets" value="${esc(scene.fx.preset)}" placeholder="Escolher ou escrever preset">${button("save-fx", "Aplicar e guardar", `data-scene="${esc(scene.id)}" ${status.canPlay ? "" : "disabled"}`)}</div><datalist id="qc-presets">${presetNames()
    .map((name) => `<option value="${esc(name)}"></option>`)
    .join(
      "",
    )}</datalist></label>${scene.fx.enabled ? button("disable-fx", "Desativar preset guardado", `data-scene="${esc(scene.id)}"`) : ""}<small>Partículas e filtros podem ser editados nos botões do mapa. As alterações permanecem no mapa ao abri-lo novamente.</small></details>`;
}

function narrativeEditor(scene, campaign) {
  return `<section class="qc-scene-editor"><div class="qc-fields-row"><label class="qc-field">Título da cena<input data-scene-field="title" value="${esc(scene.title)}"></label><label class="qc-field">Tipo de cena<select data-scene-field="kind">${SCENE_TYPES.map(([key, label]) => `<option value="${key}" ${scene.kind === key ? "selected" : ""}>${label}</option>`).join("")}</select></label></div><label class="qc-field">Apresentação<select data-scene-field="presentation" data-action="scene-presentation"><option value="map" ${scene.presentation === "map" ? "selected" : ""}>Mapa do Foundry</option><option value="image" ${scene.presentation === "image" ? "selected" : ""}>Imagem para narração</option></select></label>${field("narration", "Texto para narrar aos jogadores", scene.narration, 9)}${field("notes", "Anotações privadas da Mestra", scene.notes, 4)}<details class="qc-more"><summary>Objetivo, pistas e consequências</summary>${[
    ["purpose", "Função narrativa"],
    ["objective", "Objetivo"],
    ["information", "Pistas e revelações"],
    ["success", "Sucesso / saída"],
    ["failure", "Consequências da falha"],
  ]
    .map(([key, label]) => field(key, label, scene[key], 3))
    .join(
      "",
    )}</details><fieldset><legend>Personagens nesta cena</legend><div class="qc-role-list">${campaign.npcProfiles.map((profile) => `<article><button class="qc-toggle" type="button" data-action="toggle-profile" data-profile="${esc(profile.id)}" aria-pressed="${scene.npcProfileIds.includes(profile.id)}"><span aria-hidden="true">${scene.npcProfileIds.includes(profile.id) ? "✓" : "+"}</span>${esc(profile.name)}</button><small>${esc(profile.campaignRole)}</small>${button("prepare-profile", "Preparar token", `data-profile="${esc(profile.id)}"`)}</article>`).join("")}</div></fieldset>${button("save-scene", "Salvar preparação e notas", `data-scene="${esc(scene.id)}"`)}${scene.details ? `<details class="qc-more"><summary>Referência original da cena</summary><pre>${esc(scene.details)}</pre></details>` : ""}</section>`;
}

function resourcePanel(app, scene, campaign) {
  const actors = app.catalog.entries.filter(
      (row) => row.documentName === "Actor",
    ),
    items = app.catalog.entries.filter((row) => row.documentName === "Item");
  const declared = resourcesForScene(campaign, scene)
    .map(
      (profile) =>
        `<article class="qc-review-point" data-resource-profile="${esc(profile.id)}"><strong>${esc(profile.name)}</strong><p>${esc(profile.description)}</p><small>${profile.uuid ? "Ficha vinculada: " + esc(profile.bindingName) : "Ficha pendente · arraste uma ficha/token ou selecione abaixo"}</small><select data-action="bind-resource-profile" data-profile="${esc(profile.id)}" aria-label="Ficha para ${esc(profile.name)}"><option value="">Selecionar representação…</option>${(profile.kind === "item" ? items : actors).map((row) => `<option value="${esc(row.uuid)}" ${row.uuid === profile.uuid ? "selected" : ""}>${esc(row.name)}</option>`).join("")}</select></article>`,
    )
    .join("");
  return `<section class="qc-resource-panel">${declared}<header><h3>Recursos da cena</h3>${button("resolve-resources", "Atualizar pelo texto")}</header><p>Itens, monstros e NPCs citados pelo nome no roteiro são preparados ao salvar. Você pode ajustar ou complementar abaixo.</p><small>${actors.length} fichas e ${items.length} itens consultáveis${app.catalog.failures.length ? ` · ${app.catalog.failures.length} compêndio(s) indisponível(is)` : ""}</small><section class="qc-resource-drop" data-resource-drop="Actor"><h3>Monstros e NPCs</h3><div class="qc-roster-add"><select name="roster-npc" aria-label="Ficha de monstro ou NPC"><option value="">Complementar com uma ficha…</option>${actors.map((actor) => `<option value="${esc(actor.uuid)}">${esc(actor.name)} · ${esc(actor.source)}</option>`).join("")}</select>${button("add-roster", "Adicionar")}</div><ul class="qc-roster">${scene.roster.map((row) => `<li draggable="true" data-actor-uuid="${esc(row.actorUuid)}">${img(row.img || "icons/svg/mystery-man.svg")}<span><strong>${esc(row.name)}</strong><small>${row.source === "auto" ? "Identificado no texto" : esc(row.role)}</small></span>${button("roster-quantity", "−", `data-roster="${esc(JSON.stringify([row.actorUuid, row.roomId || "", row.profileId || ""]))}" data-change="-1"`)}<b>${row.quantity}</b>${button("roster-quantity", "+", `data-roster="${esc(JSON.stringify([row.actorUuid, row.roomId || "", row.profileId || ""]))}" data-change="1"`)}${button("remove-roster", "×", `data-roster="${esc(JSON.stringify([row.actorUuid, row.roomId || "", row.profileId || ""]))}"`)}</li>`).join("") || '<li class="qc-empty">As fichas reconhecidas no texto aparecerão aqui. Também pode arrastar uma ficha ou token para esta área.</li>'}</ul></section>${renderLoot(scene, items, campaign.id)}<details class="qc-more"><summary>Fichas dos personagens da campanha</summary>${campaign.npcProfiles.map((profile) => `<article class="qc-npc-profile" data-profile-id="${esc(profile.id)}">${img(profile.actorImg || "icons/svg/mystery-man.svg")}<div><strong>${esc(profile.name)}</strong><p>${esc(profile.behavior)}</p><label>Representação no Foundry<select data-action="replace-npc" data-profile="${esc(profile.id)}"><option value="">Arraste uma ficha ou escolha…</option>${actors.map((actor) => `<option value="${esc(actor.uuid)}" ${profile.actorUuid === actor.uuid ? "selected" : ""}>${esc(actor.name)}</option>`).join("")}</select></label></div></article>`).join("")}</details></section>`;
}

export function renderWorkspace(app, game) {
  const campaign = app.campaign,
    scene = app.selectedScene,
    maps = new Map(app.allMaps().map((map) => [map.id, map])),
    folders = app.sceneFolders();
  const selectedFolder = folders.find(
    (folder) => folder.id === campaign.mapFolderId,
  );
  const path = selectedFolder
    ? folderPath(selectedFolder, folders)
    : "Escolha a pasta de mapas desta campanha";
  const tab = app.detailTab || "roteiro";
  return `<div class="qc-shell"><header class="qc-header">${img(campaign.cover || DEFAULT_COVER, campaign.title, "qc-cover")}<div><small>QUEDAÇO · CAMPANHAS</small><h1>${esc(campaign.title)}</h1><span>${esc(campaign.date.year)}${campaign.regions.length ? ` · ${esc(campaign.regions.join(" / "))}` : ""}</span></div></header><section class="qc-toolbar"><label class="qc-field">Pasta dos mapas<select data-action="select-folder"><option value="">Escolher pasta…</option>${folders.map((folder) => `<option value="${esc(folder.id)}" ${folder.id === campaign.mapFolderId ? "selected" : ""}>${esc(folderPath(folder, folders))}</option>`).join("")}</select></label><div class="qc-breadcrumb"><small>PASTA ATUAL</small><strong>${esc(path)}</strong></div></section><main class="qc-main"><section class="qc-scenes">${mapGallery(app, scene)}<header><h2>Roteiro</h2>${button("new-scene", "+ Cena")}<small>${campaign.scenes.length} cenas</small></header>${timeline(app, campaign, maps)}</section><aside class="qc-detail">${
    scene
      ? `<header class="qc-scene-header"><div><small>CENA ${String(campaign.scenes.findIndex((entry) => entry.id === scene.id) + 1).padStart(2, "0")} · USO DA MESTRA</small><h2>${esc(scene.title)}</h2></div><div class="qc-actions">${button("set-current", "Cena atual", `data-scene="${esc(scene.id)}"`)}${button("complete-scene", "Concluir cena e atualizar missão", `data-scene="${esc(scene.id)}"`)}</div></header>${sceneMedia(scene, maps)}${fxPanel(scene, maps)}<nav class="qc-tabs" aria-label="Preparação da cena">${[
          ["roteiro", "Narração e notas"],
          ["mapa", "Planejar mapa"],
          [
            "recursos",
            `Monstros e itens (${scene.roster.length + scene.loot.length})`,
          ],
          ["missao", "Missão dos jogadores"],
        ]
          .map(([key, label]) =>
            button(
              "detail-tab",
              label,
              `data-tab="${key}" aria-pressed="${tab === key}"`,
            ),
          )
          .join(
            "",
          )}</nav>${tab === "mapa" ? renderMapReview(app, maps) : tab === "roteiro" ? narrativeEditor(scene, campaign) : tab === "recursos" ? resourcePanel(app, scene, campaign) : renderQuestPanel(game, scene, campaign)}`
      : tab === "mapa"
        ? renderMapReview(app, maps)
        : "<p>Adicione uma cena ou planeje um mapa na galeria para começar.</p>"
  }</aside></main><details class="qc-library"><summary>Campanhas salvas e rascunho · ${esc(campaign.title)}</summary><div class="qc-campaign-grid">${app.campaigns.map((entry) => `<button class="qc-campaign-card ${entry.id === campaign.id ? "is-selected" : ""}" data-action="select-campaign-card" data-campaign="${esc(entry.id)}">${img(entry.cover || DEFAULT_COVER)}<span><strong>${esc(entry.title)}</strong><small>${entry.scenes.length} cenas · rascunho ${entry.working.revision}</small></span></button>`).join("")}</div><label class="qc-field">Adicionar campanha (.md ou .txt)<input type="file" accept=".md,.txt,text/plain,text/markdown" data-action="import-campaign"></label><details class="qc-campaign-info"><summary>Texto da campanha, original e contexto</summary><div class="qc-fields-row"><label class="qc-field">Nome sem spoilers<input data-action="edit-title" value="${esc(campaign.title)}"></label><label class="qc-field">Ano<input data-action="edit-year" value="${esc(campaign.date.year)}"></label></div><label class="qc-field">Imagem da campanha<div class="qc-input-action"><input data-action="edit-cover" value="${esc(campaign.cover)}">${button("pick-cover", "Escolher imagem")}</div></label><label class="qc-field">Era<input data-action="edit-era" value="${esc(campaign.date.era)}"></label><label class="qc-field">Regiões<input data-action="edit-regions" value="${esc(campaign.regions.join(", "))}"></label><label class="qc-field">Cópia de trabalho<textarea name="working-material" rows="14">${esc(campaign.working.material)}</textarea></label>${button("save-material", "Salvar cópia de trabalho")}<details><summary>Original preservado</summary><pre>${esc(campaign.original.material)}</pre></details></details></details></div>`;
}
