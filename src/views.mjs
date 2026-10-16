import { resourcesForScene } from "./declared-resources.mjs";
import { renderMapReview, areaShape } from "./map-review.mjs";
import { areaCentroid } from "./room-learning.mjs";
import { DEFAULT_COVER, SCENE_TYPES } from "./data.mjs";
import { escapeHtml as esc, renderLoot } from "./preparation.mjs";
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

const sceneNumber = (campaign, scene) =>
  String(campaign.scenes.findIndex((entry) => entry.id === scene.id) + 1).padStart(2, "0");
const sceneKindLabel = (scene) =>
  SCENE_TYPES.find(([value]) => value === scene.kind)?.[1] || "Narração";

/** Mapas do quadro: os da pasta escolhida, na ordem do nome, mais os já usados fora dela. */
export function boardMaps(app, campaign, maps) {
  const ordered = [...app.mapsForCampaign()],
    known = new Set(ordered.map((map) => map.id));
  for (const id of [
    ...campaign.scenes.flatMap((scene) => scene.mapSceneIds || []),
    ...Object.keys(campaign.mapReviews || {}),
  ]) {
    const map = maps.get(id);
    if (map && !known.has(id)) {
      known.add(id);
      ordered.push(map);
    }
  }
  return ordered;
}

function boardThumb(campaign, map) {
  const areas = campaign.mapReviews?.[map.id]?.points || [];
  return `<div class="qc-board-thumb">${img(mapImage(map), map.name)}${areas.length ? `<svg class="qc-area-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${areas.map(areaShape).join("")}</svg>${areas
    .map((area, index) => {
      const center = areaCentroid(area);
      return `<span class="qc-board-room" style="left:${center.x}%;top:${center.y}%" title="${esc(area.title)}">${index + 1}</span>`;
    })
    .join("")}` : ""}</div>`;
}

function boardSceneItem(app, campaign, scene) {
  return `<li class="${scene.id === app.selectedSceneId ? "is-active" : ""}" draggable="true" data-drag-scene="${esc(scene.id)}"><button type="button" data-action="select-scene" data-scene="${esc(scene.id)}" title="${esc(scene.title)}"><b>${sceneNumber(campaign, scene)}</b><span>${esc(scene.title)}</span></button></li>`;
}

/** Topo da campanha: somente os mapas, cada um com as cenas que já recebeu. */
function mapBoard(app, campaign, maps) {
  if (!campaign.usesMaps) return "";
  const list = boardMaps(app, campaign, maps);
  const cards = list
    .map((map) => {
      const scenes = campaign.scenes.filter((scene) => scene.mapSceneIds[0] === map.id),
        rooms = campaign.mapReviews?.[map.id]?.points?.length || 0,
        active =
          scenes.some((scene) => scene.id === app.selectedSceneId) ||
          (app.detailTab === "mapa" && app.reviewMapId === map.id);
      return `<article class="qc-board-map ${active ? "is-active" : ""}" data-map-drop="${esc(map.id)}">${boardThumb(campaign, map)}<header><strong title="${esc(map.name)}">${esc(map.name)}</strong><small>${scenes.length} cena(s) · ${rooms} sala(s)</small></header><ol class="qc-board-scenes">${scenes.map((scene) => boardSceneItem(app, campaign, scene)).join("") || '<li class="qc-board-empty">Arraste cenas para cá</li>'}</ol><div class="qc-board-actions">${button("open-map", "Abrir", `data-map="${esc(map.id)}"`)}${button("review-map", "Salas", `data-map="${esc(map.id)}" title="Planejar as salas deste mapa"`)}${button("new-map-scene", "+ Cena", `data-map="${esc(map.id)}"`)}</div></article>`;
    })
    .join("");
  return `<section class="qc-board" role="region" aria-label="Mapas da campanha"><header><div><small>MAPAS DA CAMPANHA</small><h2>${list.length} mapa(s)</h2></div><small>Arraste uma cena da biblioteca para o mapa onde ela acontece.</small></header><div class="qc-board-grid">${cards || '<p class="qc-empty">Escolha acima a pasta de Cenas do Foundry que contém os mapas desta campanha.</p>'}</div></section>`;
}

function libraryRow(app, campaign, scene, maps) {
  const index = campaign.scenes.indexOf(scene),
    map = maps.get(scene.mapSceneIds[0]),
    place =
      scene.presentation === "image"
        ? '<span class="qc-place is-image">Imagem</span>'
        : map
          ? `<span class="qc-place is-map">${esc(map.name)}</span>`
          : campaign.usesMaps
            ? '<span class="qc-place is-loose">Sem mapa</span>'
            : "";
  return `<li class="qc-library-scene ${scene.id === app.selectedSceneId ? "is-active" : ""}" draggable="true" data-drag-scene="${esc(scene.id)}"><button type="button" class="qc-library-main" data-action="select-scene" data-scene="${esc(scene.id)}"><b>${sceneNumber(campaign, scene)}</b><span><small>${esc(sceneKindLabel(scene))}</small><strong>${esc(scene.title)}</strong></span>${place}</button><div class="qc-library-move">${button("move-scene", "↑", `data-scene="${esc(scene.id)}" data-direction="-1" aria-label="Subir ${esc(scene.title)} na ordem" ${index === 0 ? "disabled" : ""}`)}${button("move-scene", "↓", `data-scene="${esc(scene.id)}" data-direction="1" aria-label="Descer ${esc(scene.title)} na ordem" ${index === campaign.scenes.length - 1 ? "disabled" : ""}`)}</div></li>`;
}

/** Biblioteca inferior: todas as cenas da campanha; as sem mapa ficam em destaque. */
function sceneLibrary(app, campaign, maps) {
  const rows = (filter) =>
    campaign.scenes
      .filter(filter)
      .map((scene) => libraryRow(app, campaign, scene, maps))
      .join("");
  const loose = (scene) => !scene.mapSceneIds.length && scene.presentation !== "image",
    images = (scene) => !scene.mapSceneIds.length && scene.presentation === "image",
    placed = (scene) => scene.mapSceneIds.length > 0;
  const groups = campaign.usesMaps
    ? [
        ["Sem mapa", loose, true],
        ["Interlúdios com imagem", images, true],
        ["Já nos mapas", placed, false],
      ]
    : [["Ordem das cenas", () => true, true]];
  return `<section class="qc-scene-library" data-map-drop="" aria-label="Cenas da campanha"><header><div><small>CENAS DA CAMPANHA</small><h3>${campaign.scenes.length} cena(s)</h3></div>${button("new-scene", campaign.usesMaps ? "+ Interlúdio" : "+ Cena")}</header>${campaign.usesMaps ? "<p>Crie cenas de mapa no botão do mapa correspondente. Aqui ficam cenas sem mapa e interlúdios de imagem.</p>" : ""}${groups
    .map(([label, filter, open]) => {
      const count = campaign.scenes.filter(filter).length;
      if (!count && label === "Interlúdios com imagem") return "";
      return `<details class="qc-library-group" ${open || count < 6 ? "open" : ""}><summary>${label} · ${count}</summary><ol>${rows(filter) || '<li class="qc-empty">Nenhuma cena aqui.</li>'}</ol></details>`;
    })
    .join("")}</section>`;
}

const inlineMarkdown = (value) =>
  esc(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

/** Leitura do texto da campanha: títulos, parágrafos, listas e tabelas simples. */
export function renderMaterial(material) {
  const lines = String(material || "")
    .replace(/\r/g, "")
    .replace(/^---\n[\s\S]*?\n---\n?/, "")
    .split("\n");
  const out = [];
  let paragraph = [],
    list = [],
    table = [];
  const flush = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inlineMarkdown).join("<br>")}</p>`);
    if (list.length) out.push(`<ul>${list.map((row) => `<li>${inlineMarkdown(row)}</li>`).join("")}</ul>`);
    if (table.length) {
      const rows = table
        .filter((row) => !/^\|[\s:|-]+\|$/.test(row))
        .map((row) => row.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
      out.push(`<table>${rows.map((cells, index) => `<tr>${cells.map((cell) => (index ? `<td>${inlineMarkdown(cell)}</td>` : `<th>${inlineMarkdown(cell)}</th>`)).join("")}</tr>`).join("")}</table>`);
    }
    paragraph = [];
    list = [];
    table = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (!line) flush();
    else if (heading) {
      flush();
      out.push(`<h${heading[1].length <= 2 ? 3 : 4}>${inlineMarkdown(heading[2])}</h${heading[1].length <= 2 ? 3 : 4}>`);
    } else if (line.startsWith("|")) {
      if (!table.length) flush();
      table.push(line);
    } else if (/^[-*]\s+/.test(line)) {
      if (!list.length) flush();
      list.push(line.replace(/^[-*]\s+/, ""));
    } else {
      if (list.length || table.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return out.join("") || '<p class="qc-empty">Esta campanha ainda não tem texto. Cole o texto em “Editar dados e texto”.</p>';
}

const dateLabel = (campaign) =>
  [campaign.date.era, campaign.date.year].filter(Boolean).join(" · ");

function overviewCard(imgSrc, title, subtitle, note, uuid = "") {
  return `<article class="qc-overview-card">${img(imgSrc || "icons/svg/mystery-man.svg")}<span><strong>${esc(title)}</strong>${subtitle ? `<small>${esc(subtitle)}</small>` : ""}${note ? `<small class="qc-overview-note">${esc(note)}</small>` : ""}</span>${uuid ? button("open-document", "Ficha", `data-uuid="${esc(uuid)}"`) : ""}</article>`;
}

/** Painel direito sem cena escolhida: a campanha inteira, com quem e o que participa. */
function campaignOverview(app, campaign, maps) {
  const scenesWith = (test) =>
    campaign.scenes
      .filter(test)
      .map((scene) => sceneNumber(campaign, scene))
      .join(", ");
  const threats = campaign.resourceProfiles.filter((row) => row.kind === "threat"),
    items = campaign.resourceProfiles.filter((row) => row.kind === "item"),
    tokens = new Map();
  for (const scene of campaign.scenes)
    for (const row of scene.roster) {
      const entry = tokens.get(row.actorUuid) || { ...row, quantity: 0, scenes: [] };
      entry.quantity += row.quantity;
      entry.scenes.push(sceneNumber(campaign, scene));
      tokens.set(row.actorUuid, entry);
    }
  const refScenes = (id) =>
    scenesWith((scene) => scene.resourceRefs?.some((ref) => ref.id === id));
  const used = boardMaps(app, campaign, maps).length,
    loose = campaign.scenes.filter(
      (scene) => !scene.mapSceneIds.length && scene.presentation !== "image",
    ).length;
  const chips = [
    ["Mapas", used],
    ["Cenas", campaign.scenes.length],
    ...(campaign.usesMaps ? [["Sem mapa", loose]] : []),
    ["NPCs", campaign.npcProfiles.length],
    ["Ameaças", threats.length],
    ["Itens", items.length],
    ["Tokens", tokens.size],
  ];
  const block = (title, content, empty) =>
    `<section class="qc-overview-block"><h3>${title}</h3><div class="qc-overview-grid">${content || `<p class="qc-empty">${empty}</p>`}</div></section>`;
  return `<header class="qc-scene-header"><div><small>CAMPANHA · VISÃO DA MESTRA</small><h2>${esc(campaign.title)}</h2>${dateLabel(campaign) ? `<span class="qc-overview-date">${esc(dateLabel(campaign))}</span>` : ""}</div></header>${campaign.description ? `<p class="qc-overview-description">${esc(campaign.description)}</p>` : ""}<section class="qc-scene-summary"><header><small>NESTA CAMPANHA</small><strong>Clique numa cena para abrir o uso da Mestra</strong></header><span class="qc-summary-chips">${chips.map(([label, count]) => `<span>${label} <b>${count}</b></span>`).join("")}</span></section>${block(
    "NPCs",
    campaign.npcProfiles
      .map((npc) =>
        overviewCard(
          npc.actorImg,
          npc.name,
          npc.campaignRole,
          [
            npc.actorName ? `Ficha: ${npc.actorName}` : "Sem ficha vinculada",
            scenesWith(
              (scene) =>
                scene.npcProfileIds?.includes(npc.id) ||
                scene.resourceRefs?.some((ref) => ref.id === `npc:${npc.id}`),
            ) && `Cenas ${scenesWith((scene) => scene.npcProfileIds?.includes(npc.id) || scene.resourceRefs?.some((ref) => ref.id === `npc:${npc.id}`))}`,
          ]
            .filter(Boolean)
            .join(" · "),
          npc.actorUuid,
        ),
      )
      .join(""),
    "Nenhum NPC declarado no texto.",
  )}${block(
    "Ameaças",
    threats
      .map((row) =>
        overviewCard(
          row.img,
          row.name,
          row.bindingName ? `Ficha: ${row.bindingName}` : "Ficha pendente",
          refScenes(row.id) && `Cenas ${refScenes(row.id)}`,
          row.uuid,
        ),
      )
      .join(""),
    "Nenhuma ameaça declarada no texto.",
  )}${block(
    "Itens e recompensas",
    items
      .map((row) =>
        overviewCard(
          row.img || "icons/svg/item-bag.svg",
          row.name,
          row.bindingName ? `Ficha: ${row.bindingName}` : "Ficha pendente",
          refScenes(row.id) && `Cenas ${refScenes(row.id)}`,
          row.uuid,
        ),
      )
      .join(""),
    "Nenhum item declarado no texto.",
  )}${block(
    "Tokens preparados nas cenas",
    [...tokens.values()]
      .map((row) =>
        overviewCard(row.img, `${row.name} ×${row.quantity}`, row.role, `Cenas ${row.scenes.join(", ")}`, row.actorUuid),
      )
      .join(""),
    "Nenhum token preparado ainda.",
  )}<section class="qc-overview-block qc-campaign-text"><h3>Texto da campanha</h3><div class="qc-material">${renderMaterial(campaign.working.material)}</div></section>${campaignEditor(campaign)}`;
}

function campaignEditor(campaign) {
  return `<details class="qc-campaign-info"><summary>Editar dados e texto da campanha</summary><div class="qc-fields-row"><label class="qc-field">Nome sem spoilers<input data-action="edit-title" value="${esc(campaign.title)}"></label><label class="qc-field">Ano<input data-action="edit-year" value="${esc(campaign.date.year)}"></label></div><div class="qc-fields-row"><label class="qc-field">Era<input data-action="edit-era" value="${esc(campaign.date.era)}"></label><label class="qc-field">Regiões<input data-action="edit-regions" value="${esc(campaign.regions.join(", "))}"></label></div><label class="qc-field">Descrição curta (aparece na seleção)<textarea data-action="edit-description" rows="2">${esc(campaign.description)}</textarea></label><label class="qc-field">Imagem da campanha<div class="qc-input-action"><input data-action="edit-cover" value="${esc(campaign.cover)}">${button("pick-cover", "Escolher imagem")}</div></label><label class="qc-field">Cópia de trabalho do texto<textarea name="working-material" rows="14">${esc(campaign.working.material)}</textarea></label>${button("save-material", "Salvar cópia de trabalho")}<details><summary>Original preservado</summary><pre>${esc(campaign.original.material)}</pre></details></details>`;
}

/** Primeira tela: escolher uma campanha salva ou criar outra. */
export function renderCampaignPicker(app) {
  const campaigns = app.campaigns;
  const rows = campaigns
    .map((entry) => {
      const mapCount = new Set(entry.scenes.flatMap((scene) => scene.mapSceneIds)).size;
      return `<li><button type="button" class="qc-campaign-row" data-action="open-campaign" data-campaign="${esc(entry.id)}">${img(entry.cover || DEFAULT_COVER, entry.title)}<span><strong>${esc(entry.title)}</strong><small class="qc-campaign-date">${esc(dateLabel(entry) || "Sem data")}</small><span class="qc-campaign-description">${esc(entry.description || "Sem descrição. Abra a campanha e escreva uma em “Editar dados e texto”.")}</span><small>${entry.scenes.length} cena(s) · ${mapCount} mapa(s) com cenas · ${entry.npcProfiles.length} NPC(s)</small></span></button></li>`;
    })
    .join("");
  return `<div class="qc-shell qc-picker"><header class="qc-picker-header"><small>QUEDAÇO · CAMPANHAS</small><h1>Selecionar campanha</h1><p>Escolha uma campanha para abrir os mapas, as cenas e o texto da Mestra.</p></header><ol class="qc-campaign-list">${rows || '<li class="qc-empty">Nenhuma campanha salva ainda. Crie a primeira abaixo.</li>'}</ol><details class="qc-new-campaign" ${campaigns.length ? "" : "open"}><summary>+ Nova campanha</summary><div class="qc-fields-row"><label class="qc-field">Nome<input name="new-title" placeholder="Nome sem spoilers"></label><label class="qc-field">Data<input name="new-year" placeholder="Ex.: 105 A.F."></label></div><label class="qc-field">Era<input name="new-era" placeholder="Ex.: Era das Estações"></label><label class="qc-field">Descrição curta<textarea name="new-description" rows="2" placeholder="Uma frase para reconhecer a campanha nesta lista."></textarea></label><label class="qc-field">Texto da campanha (opcional — pode colar agora ou depois)<textarea name="new-material" rows="8" placeholder="# Nome da campanha&#10;&#10;## NPCs&#10;### ...&#10;&#10;## Cenas&#10;### C01 - ..."></textarea></label><div class="qc-actions">${button("create-campaign", "Criar campanha")}<label class="qc-file-button">Importar arquivo .md ou .txt<input type="file" accept=".md,.txt,text/plain,text/markdown" data-action="import-campaign"></label></div></details></div>`;
}

function linkedAreas(scene, campaign) {
  return (scene.mapAreaRefs || [])
    .map((ref) =>
      campaign.mapReviews?.[ref.mapId]?.points?.find(
        (area) => area.id === ref.areaId,
      ),
    )
    .filter(Boolean);
}

function sceneSummary(scene, campaign) {
  const areas = linkedAreas(scene, campaign),
    joined = areas
      .map((area) =>
        `${area.type} ${area.suggestion?.challenge || ""} ${area.suggestion?.secret || ""}`,
      )
      .join(" ")
      .toLocaleLowerCase("pt-BR"),
    countType = (type) => areas.filter((area) => area.type === type).length;
  return [
    ["Monstros", scene.roster.length || areas.filter((a) => a.suggestion?.threats).length],
    ["Loot", scene.loot.length || areas.filter((a) => a.suggestion?.loot).length],
    ["Puzzles", countType("puzzle")],
    ["Armadilhas", (joined.match(/armadilh/g) || []).length],
    ["Desafios", countType("challenge") + countType("threat")],
    ["Segredos", countType("secret") || areas.filter((a) => a.suggestion?.secret).length],
  ];
}

function summaryChips(scene, campaign, includeEmpty = false) {
  return `<span class="qc-summary-chips">${sceneSummary(scene, campaign)
    .filter(([, count]) => includeEmpty || count)
    .map(([label, count]) => `<span>${esc(label)} <b>${count}</b></span>`)
    .join("") || "<span>Sem conteúdo preparado</span>"}</span>`;
}

function sceneSummaryPanel(scene, campaign) {
  return `<section class="qc-scene-summary"><header><small>RESUMO DE PREPARAÇÃO</small><strong>O que existe nesta cena</strong></header>${summaryChips(scene, campaign, true)}</section>`;
}

const parentId = (folder) =>
  typeof folder?.folder === "string" ? folder.folder : folder?.folder?.id || "";

function mapTile(app, scene, map, folders) {
  const assigned = scene?.mapSceneIds.includes(map.id),
    label = assigned
      ? "Retirar desta cena"
      : app.campaign.usesMaps
        ? "Mover cena para este mapa"
        : "Usar nesta cena";
  return `<article class="qc-map-tile ${assigned ? "is-assigned" : ""}">${img(mapImage(map), map.name)}<strong>${esc(map.name)}</strong><small>${esc(folderPath(map.folder, folders))}</small><div class="qc-map-tile-actions">${scene ? button("assign-map", label, `data-map="${esc(map.id)}"`) : ""}${button("open-map", "Abrir", `data-map="${esc(map.id)}" data-scene="${esc(scene?.id || "")}"`)}${button("review-map", "Planejar", `data-map="${esc(map.id)}"`)}${button("use-map-cover", "Capa", `data-map="${esc(map.id)}"`)}</div></article>`;
}

function folderNode(app, scene, folder, folders, maps, root = false) {
  const children = folders.filter((row) => parentId(row) === folder.id),
    direct = maps.filter((map) => parentId(map) === folder.id),
    content = `${direct.map((map) => mapTile(app, scene, map, folders)).join("")}${children.map((child) => folderNode(app, scene, child, folders, maps)).join("")}`;
  if (root)
    return `<section class="qc-folder-root"><header><span>▣</span><strong>${esc(folder.name)}</strong><small>${maps.length} mapa(s)</small></header><div class="qc-folder-content">${content}</div></section>`;
  return `<details class="qc-folder-node"><summary><span>▸</span><strong>${esc(folder.name)}</strong><small>${direct.length} mapa(s)</small></summary><div class="qc-folder-content">${content}</div></details>`;
}

function mapGallery(app, scene) {
  const folders = app.sceneFolders(),
    selected = folders.find((folder) => folder.id === app.campaign.mapFolderId),
    maps = app
    .mapsForCampaign()
    .filter(
      (map) =>
        !app.mapSearch ||
        `${map.name} ${map.folder?.name || ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(app.mapSearch.toLocaleLowerCase("pt-BR")),
    );
  const tree = !selected
    ? '<p class="qc-empty">Escolha a pasta que contém os mapas da campanha.</p>'
    : app.mapSearch
      ? `<div class="qc-map-gallery">${maps.map((map) => mapTile(app, scene, map, folders)).join("") || '<p class="qc-empty">Nenhum mapa encontrado.</p>'}</div>`
      : folderNode(app, scene, selected, folders, maps, true);
  return `<details class="qc-map-library" ${app.galleryOpen ? "open" : ""}><summary>Galeria de mapas · ${maps.length}</summary><div class="qc-gallery-tools"><input name="map-search" value="${esc(app.mapSearch || "")}" placeholder="Buscar nesta galeria" aria-label="Buscar mapa nesta pasta"><small>${scene ? `Atribuição atual: “${esc(scene.title)}”. Clicar novamente retira o mapa.` : "Escolha uma cena para atribuir; o planejamento do mapa continua disponível."}</small></div>${tree}</details>`;
}

function sceneMedia(scene, maps) {
  if (scene.presentation === "image")
    return `<section class="qc-scene-media"><div class="qc-image-preview">${img(scene.image || DEFAULT_COVER, "Imagem de narração")}</div><label class="qc-field">Imagem de narração<div class="qc-input-action"><input data-scene-field="image" value="${esc(scene.image)}" placeholder="Caminho da imagem no Foundry">${button("pick-image", "Escolher imagem")}</div></label><div class="qc-actions">${button("open-image", "Abrir imagem", `data-scene="${esc(scene.id)}"`)}${button("share-image", "Mostrar imagem aos jogadores", `data-scene="${esc(scene.id)}"`)}</div></section>`;
  const assigned = scene.mapSceneIds.map((id) => maps.get(id)).filter(Boolean);
  return `<section class="qc-scene-media"><div class="qc-assigned-maps">${assigned.map((map) => `<article>${img(mapImage(map), map.name)}<div><small>MAPA DESTA CENA</small><strong>${esc(map.name)}</strong><div class="qc-actions">${button("open-map", "Abrir mapa", `data-map="${esc(map.id)}" data-scene="${esc(scene.id)}"`)}${button("review-map", "Planejar salas", `data-map="${esc(map.id)}"`)}${button("remove-map", "Retirar mapa", `data-map="${esc(map.id)}" data-scene="${esc(scene.id)}"`)}</div></div></article>`).join("") || '<p class="qc-empty">Esta cena ainda não foi colocada em um mapa.</p>'}</div>${button("choose-scene-map", assigned.length ? "Trocar mapa na galeria" : "Escolher mapa na galeria", `data-scene="${esc(scene.id)}"`)}</section>`;
}

function fxPanel(scene, maps) {
  if (scene.presentation !== "map" || !scene.mapSceneIds.length) return "";
  const status = fxMasterStatus();
  const map = maps.get(scene.mapSceneIds[0]);
  return `<section class="qc-fx"><header><div><small>FXMASTER · EFEITOS DO MAPA</small><strong>Controles desta cena</strong></div><div class="qc-actions">${button("fx-particles", "Abrir partículas", `data-map="${esc(map?.id || "")}" data-scene="${esc(scene.id)}" ${status.available ? "" : "disabled"}`)}${button("fx-filters", "Abrir filtros", `data-map="${esc(map?.id || "")}" data-scene="${esc(scene.id)}" ${status.available ? "" : "disabled"}`)}</div></header><label class="qc-field">Preset<div class="qc-input-action"><input name="fx-preset" list="qc-presets" value="${esc(scene.fx.preset)}" placeholder="Escolher ou escrever preset">${button("save-fx", "Aplicar e guardar", `data-scene="${esc(scene.id)}" ${status.canPlay ? "" : "disabled"}`)}</div><datalist id="qc-presets">${presetNames()
    .map((name) => `<option value="${esc(name)}"></option>`)
    .join(
      "",
    )}</datalist></label>${scene.fx.enabled ? button("disable-fx", "Desativar preset guardado", `data-scene="${esc(scene.id)}"`) : ""}<small>Os botões acima abrem os controles visuais do FXMaster no mapa atual.</small></section>`;
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
  return `<section class="qc-resource-panel">${declared}<header><h3>Recursos da cena</h3>${button("resolve-resources", "Atualizar pelo texto")}</header><p>Itens, monstros e NPCs citados pelo nome no roteiro são preparados ao salvar. Você pode ajustar ou complementar abaixo.</p><small>${actors.length} fichas e ${items.length} itens consultáveis${app.catalog.failures.length ? ` · ${app.catalog.failures.length} compêndio(s) indisponível(is)` : ""}</small><section class="qc-resource-drop" data-resource-drop="Actor"><h3>Monstros e NPCs</h3><div class="qc-roster-add"><select name="roster-npc" aria-label="Ficha de monstro ou NPC"><option value="">Complementar com uma ficha…</option>${actors.map((actor) => `<option value="${esc(actor.uuid)}">${esc(actor.name)} · ${esc(actor.source)}</option>`).join("")}</select>${button("add-roster", "Adicionar")}</div><ul class="qc-roster">${scene.roster.map((row) => { const key = esc(JSON.stringify([row.actorUuid, row.roomId || "", row.profileId || ""])); return `<li draggable="true" data-actor-uuid="${esc(row.actorUuid)}">${img(row.img || "icons/svg/mystery-man.svg")}<span><strong>${esc(row.name)}</strong><small>${row.source === "auto" ? "Identificado no texto" : esc(row.role)}</small></span><div class="qc-quantity-controls">${button("roster-quantity", "−", `data-roster="${key}" data-change="-1" aria-label="Diminuir quantidade de ${esc(row.name)}"`)}<b>${row.quantity}</b>${button("roster-quantity", "+", `data-roster="${key}" data-change="1" aria-label="Aumentar quantidade de ${esc(row.name)}"`)}${button("remove-roster", "×", `data-roster="${key}" aria-label="Remover ${esc(row.name)}"`)}</div></li>`; }).join("") || '<li class="qc-empty">As fichas reconhecidas no texto aparecerão aqui. Também pode arrastar uma ficha ou token para esta área.</li>'}</ul></section>${renderLoot(scene, items, campaign.id)}<details class="qc-more"><summary>Fichas dos personagens da campanha</summary>${campaign.npcProfiles.map((profile) => `<article class="qc-npc-profile" data-profile-id="${esc(profile.id)}">${img(profile.actorImg || "icons/svg/mystery-man.svg")}<div><strong>${esc(profile.name)}</strong><p>${esc(profile.behavior)}</p><label>Representação no Foundry<select data-action="replace-npc" data-profile="${esc(profile.id)}"><option value="">Arraste uma ficha ou escolha…</option>${actors.map((actor) => `<option value="${esc(actor.uuid)}" ${profile.actorUuid === actor.uuid ? "selected" : ""}>${esc(actor.name)}</option>`).join("")}</select></label></div></article>`).join("")}</details></section>`;
}

function detailPanel(app, game, campaign, scene, maps, tab) {
  if (!scene)
    return tab === "mapa" && app.reviewMapId
      ? `<header class="qc-scene-header"><div><small>MAPA · SALAS</small><h2>${esc(maps.get(app.reviewMapId)?.name || "Mapa")}</h2></div><div class="qc-actions">${button("close-scene", "← Visão da campanha")}</div></header>${renderMapReview(app, maps)}`
      : campaignOverview(app, campaign, maps);
  const tabs = [
      ["roteiro", "Narração e notas"],
      ["mapa", "Planejar mapa"],
      ["recursos", `Monstros e itens (${scene.roster.length + scene.loot.length})`],
      ["missao", "Missão dos jogadores"],
    ],
    content =
      tab === "mapa"
        ? renderMapReview(app, maps)
        : tab === "roteiro"
          ? narrativeEditor(scene, campaign)
          : tab === "recursos"
            ? resourcePanel(app, scene, campaign)
            : renderQuestPanel(game, scene, campaign);
  return `<header class="qc-scene-header"><div><small>CENA ${sceneNumber(campaign, scene)} · USO DA MESTRA</small><h2>${esc(scene.title)}</h2></div><div class="qc-actions">${button("close-scene", "← Visão da campanha")}${button("set-current", "Cena atual", `data-scene="${esc(scene.id)}" aria-pressed="${campaign.currentSceneId === scene.id}"`)}${button("complete-scene", "Concluir cena e atualizar missão", `data-scene="${esc(scene.id)}"`)}</div></header>${sceneSummaryPanel(scene, campaign)}${sceneMedia(scene, maps)}${fxPanel(scene, maps)}<nav class="qc-tabs" role="tablist" aria-label="Preparação da cena">${tabs.map(([key, label]) => button("detail-tab", label, `data-tab="${key}" role="tab" aria-selected="${tab === key}" aria-pressed="${tab === key}" tabindex="${tab === key ? "0" : "-1"}"`)).join("")}</nav><section class="qc-tab-panel" role="tabpanel" aria-label="${esc(tabs.find(([key]) => key === tab)?.[1] || "Preparação da cena")}">${content}</section>`;
}

export function renderWorkspace(app, game) {
  const campaign = app.campaign;
  if (!campaign) return renderCampaignPicker(app);
  const scene = app.selectedScene,
    maps = new Map(app.allMaps().map((map) => [map.id, map])),
    folders = app.sceneFolders();
  const selectedFolder = folders.find(
    (folder) => folder.id === campaign.mapFolderId,
  );
  const path = selectedFolder
    ? folderPath(selectedFolder, folders)
    : "Escolha a pasta de mapas desta campanha";
  const tab = app.detailTab || "roteiro";
  const mapSetup = campaign.usesMaps
    ? `<label class="qc-field">Pasta dos mapas<select data-action="select-folder"><option value="">Escolher pasta…</option>${folders.map((folder) => `<option value="${esc(folder.id)}" ${folder.id === campaign.mapFolderId ? "selected" : ""}>${esc(folderPath(folder, folders))}</option>`).join("")}</select></label><div class="qc-breadcrumb"><small>GALERIA ATUAL</small><strong>${esc(path)}</strong></div>`
    : '<div class="qc-breadcrumb"><small>ESTRUTURA</small><strong>Cenas livres, sem mapa obrigatório</strong></div>';
  return `<div class="qc-shell"><header class="qc-header">${button("close-campaign", "← Campanhas", 'class="qc-back"')}${img(campaign.cover || DEFAULT_COVER, campaign.title, "qc-cover")}<div><small>QUEDAÇO · CAMPANHAS</small><h1>${esc(campaign.title)}</h1><span>${esc(dateLabel(campaign))}${campaign.regions.length ? ` · ${esc(campaign.regions.join(" / "))}` : ""}</span></div></header><section class="qc-toolbar" aria-label="Configuração dos mapas"><div class="qc-map-mode"><small>ESTA CAMPANHA</small><div>${button("set-map-mode", "Com mapas", `data-value="true" aria-pressed="${campaign.usesMaps}"`)}${button("set-map-mode", "Sem mapas", `data-value="false" aria-pressed="${!campaign.usesMaps}"`)}</div></div>${mapSetup}</section>${mapBoard(app, campaign, maps)}<main class="qc-main"><section class="qc-scenes" aria-label="Biblioteca da campanha"><header><div><small>BIBLIOTECA</small><h2>${campaign.usesMaps ? "Mapas e cenas" : "Cenas da campanha"}</h2></div><small>${campaign.scenes.length} cenas</small></header>${campaign.usesMaps ? mapGallery(app, scene) : ""}${sceneLibrary(app, campaign, maps)}</section><aside class="qc-detail" aria-label="${scene ? "Uso da Mestra na cena" : "Visão da campanha"}">${detailPanel(app, game, campaign, scene, maps, tab)}</aside></main></div>`;
}
