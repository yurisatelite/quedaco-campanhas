import { escapeHtml as esc } from "./preparation.mjs";
import {
  AREA_TYPES,
  AREA_ENVIRONMENTS,
  areaCentroid,
  campaignThemes,
  learningStats,
} from "./room-learning.mjs";

export const POINT_TYPES = AREA_TYPES;
export const DRAW_MODES = Object.freeze([
  ["point", "Ponto"],
  ["rect", "Retângulo"],
  ["polygon", "Polígono"],
]);

const collectionValues = (value) =>
  value instanceof Map
    ? Array.from(value.values())
    : Array.isArray(value)
      ? value
      : value && typeof value[Symbol.iterator] === "function"
        ? Array.from(value)
        : Object.values(value || {});

/** Converte Regions/Drawings já existentes no Foundry em geometria percentual. */
export function extractFoundryAreas(map) {
  const width = Number(map?.width || map?.dimensions?.sceneWidth || 1),
    height = Number(map?.height || map?.dimensions?.sceneHeight || 1),
    pct = (x, total) => Math.max(0, Math.min(100, (Number(x || 0) / total) * 100)),
    points = [];
  const add = (source, sourceId, title, shape, vertices) => {
    if (!vertices?.length) return;
    points.push({ source, sourceId, title, shape, vertices });
  };
  for (const region of collectionValues(map?.regions)) {
    for (const [index, raw] of collectionValues(region.shapes).entries()) {
      const shape = raw?.toObject?.() || raw || {},
        type = String(shape.type || "").toLowerCase();
      if (type.includes("rectangle"))
        add("region", `${region.id}:${index}`, region.name || "Região", "rect", [
          { x: pct(shape.x, width), y: pct(shape.y, height) },
          { x: pct(Number(shape.x) + Number(shape.width), width), y: pct(Number(shape.y) + Number(shape.height), height) },
        ]);
      else if (type.includes("polygon")) {
        const flat = shape.points || [],
          vertices = Array.isArray(flat[0])
            ? flat.map(([x, y]) => ({ x: pct(x, width), y: pct(y, height) }))
            : Array.from({ length: Math.floor(flat.length / 2) }, (_, i) => ({ x: pct(flat[i * 2], width), y: pct(flat[i * 2 + 1], height) }));
        add("region", `${region.id}:${index}`, region.name || "Região", "polygon", vertices);
      }
    }
  }
  for (const drawing of collectionValues(map?.drawings)) {
    const doc = drawing.document || drawing,
      shape = doc.shape?.toObject?.() || doc.shape || {},
      x = Number(doc.x || 0),
      y = Number(doc.y || 0),
      type = String(shape.type || "").toLowerCase();
    if (type.includes("rect"))
      add("drawing", doc.id, doc.text || "Desenho", "rect", [
        { x: pct(x, width), y: pct(y, height) },
        { x: pct(x + Number(shape.width), width), y: pct(y + Number(shape.height), height) },
      ]);
    else if (Array.isArray(shape.points) && shape.points.length >= 6)
      add(
        "drawing",
        doc.id,
        doc.text || "Desenho",
        "polygon",
        Array.from({ length: Math.floor(shape.points.length / 2) }, (_, i) => ({
          x: pct(x + Number(shape.points[i * 2]), width),
          y: pct(y + Number(shape.points[i * 2 + 1]), height),
        })),
      );
  }
  return points;
}

const optionList = (options, current) =>
  options
    .map(
      ([id, label]) =>
        `<option value="${id}" ${current === id ? "selected" : ""}>${esc(label)}</option>`,
    )
    .join("");

export function areaShape(area, index) {
  const vertices = area.vertices?.length
    ? area.vertices
    : [{ x: area.x || 0, y: area.y || 0 }];
  if (area.shape === "rect" && vertices.length >= 2) {
    const [a, b] = vertices,
      x = Math.min(a.x, b.x),
      y = Math.min(a.y, b.y),
      width = Math.abs(a.x - b.x),
      height = Math.abs(a.y - b.y);
    return `<rect class="qc-area-shape is-${esc(area.status)}" x="${x}" y="${y}" width="${width}" height="${height}"></rect>`;
  }
  if (area.shape === "polygon" && vertices.length >= 3)
    return `<polygon class="qc-area-shape is-${esc(area.status)}" points="${vertices.map((point) => `${point.x},${point.y}`).join(" ")}"></polygon>`;
  const point = vertices[0];
  return `<circle class="qc-area-point is-${esc(area.status)}" cx="${point.x}" cy="${point.y}" r="1.4"></circle>`;
}

function suggestionFields(area) {
  const suggestion = area.suggestion || {};
  const fields = [
    ["narrativeFunction", "Função narrativa", 2],
    ["narration", "Texto sugerido para narrar", 5],
    ["challenge", "Puzzle / desafio", 3],
    ["threats", "Ameaças", 2],
    ["loot", "Loot / recompensa", 2],
    ["secret", "Segredo ou revelação", 2],
  ];
  if (!Object.values(suggestion).some(Boolean))
    return '<p class="qc-empty">Gere uma proposta depois de descrever visualmente a sala.</p>';
  const sourceLabel =
    suggestion.source === "memory"
      ? "exemplo semelhante aceito anteriormente"
      : suggestion.source === "rules-adjusted"
        ? "regras ajustadas por rejeições anteriores"
        : "regras locais e temas da campanha";
  return `<div class="qc-suggestion-fields">${fields
    .map(
      ([name, label, rows]) =>
        `<label class="qc-field">${label}<textarea data-suggestion-field="${name}" rows="${rows}">${esc(suggestion[name] || "")}</textarea></label>`,
    )
    .join("")}</div><small>Origem: ${sourceLabel}.</small>`;
}

function areaCard(area, index) {
  const status =
    area.feedback === "accepted"
      ? "Aceita e registrada na memória"
      : area.feedback === "rejected"
        ? "Rejeitada e registrada"
        : area.status === "suggested"
          ? "Proposta aguardando revisão"
          : "Descrição em preparação";
  return `<article class="qc-area-card" data-area="${esc(area.id)}">
    <header><span class="qc-area-number">${index + 1}</span><div><strong>${esc(area.title)}</strong><small>${esc(status)}</small></div></header>
    <div class="qc-fields-row">
      <label class="qc-field">Nome da sala/área<input data-area-field="title" value="${esc(area.title)}"></label>
      <label class="qc-field">Função<select data-area-field="type">${optionList(AREA_TYPES, area.type)}</select></label>
      <label class="qc-field">Ambiente<select data-area-field="environment">${optionList(AREA_ENVIRONMENTS, area.environment)}</select></label>
    </div>
    <label class="qc-field">O que você reconhece visualmente<textarea data-area-field="visualDescription" rows="4" placeholder="Ex.: duas fornalhas, trilhos quebrados, canal de água e uma porta menor ao norte.">${esc(area.visualDescription)}</textarea></label>
    <label class="qc-field">Anotações privadas<textarea data-area-field="gmNotes" rows="3">${esc(area.gmNotes)}</textarea></label>
    <details class="qc-area-suggestion" ${area.status === "suggested" ? "open" : ""}><summary>Proposta de conteúdo</summary>${suggestionFields(area)}</details>
    <div class="qc-actions">
      <button data-action="suggest-area" data-area="${esc(area.id)}">Gerar proposta</button>
      <button data-action="accept-area" data-area="${esc(area.id)}" ${!Object.values(area.suggestion || {}).some(Boolean) ? "disabled" : ""}>Aceitar / aprender</button>
      <button data-action="reject-area" data-area="${esc(area.id)}" ${!Object.values(area.suggestion || {}).some(Boolean) ? "disabled" : ""}>Rejeitar</button>
      <button data-action="area-scene" data-area="${esc(area.id)}">${area.sceneId ? "Abrir cena vinculada" : "Criar cena"}</button>
      <button data-action="link-area-scene" data-area="${esc(area.id)}">Vincular à cena atual</button>
      <button data-action="remove-area" data-area="${esc(area.id)}">Remover</button>
    </div>
  </article>`;
}

export function renderMapReview(app, maps) {
  const map =
    maps.get(app.reviewMapId) || maps.get(app.selectedScene?.mapSceneIds[0]);
  if (!map)
    return "<p>Abra a galeria e clique em “Planejar” em um mapa. Você também pode escrever cenas sem mapa.</p>";
  const review = app.campaign.mapReviews[map.id] || { notes: "", points: [] },
    areas = review.points || [],
    stats = learningStats(app.campaigns),
    themes = campaignThemes(app.campaign),
    drawMode = app.drawMode || "point",
    areaType = app.pointType || "exploration",
    foundryAreas = extractFoundryAreas(map),
    importable = foundryAreas.filter(
      (row) => !areas.some((area) => area.sourceId === row.sourceId),
    ).length;
  return `<section class="qc-map-review" data-review-map="${esc(map.id)}">
    <header class="qc-review-header"><div><h3>Planejar salas: ${esc(map.name)}</h3><p>Desenhe áreas, descreva o que vê e transforme as decisões aprovadas em cenas.</p></div><div class="qc-learning-status"><strong>${stats.accepted}</strong> aceitas · <strong>${stats.rejected}</strong> rejeitadas</div></header>
    <div class="qc-draw-toolbar">
      <label>Forma<select name="draw-mode">${optionList(DRAW_MODES, drawMode)}</select></label>
      <label>Função inicial<select name="point-type">${optionList(AREA_TYPES, areaType)}</select></label>
      ${drawMode === "polygon" ? '<button data-action="finish-polygon">Concluir polígono</button><button data-action="cancel-polygon">Cancelar desenho</button>' : ""}
      <small>${drawMode === "point" ? "Clique para marcar um ponto." : drawMode === "rect" ? "Clique e arraste para contornar a sala." : `Clique nos cantos da sala e conclua o polígono · ${app.pendingVertices?.length || 0} vértices.`}</small>
    </div>
    <div class="qc-review-canvas" data-action="draw-map-area">
      <img src="${esc(map.background?.src || map.thumb || "")}" alt="${esc(map.name)}" draggable="false">
      <svg class="qc-area-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${areas.map(areaShape).join("")}
        <polyline class="qc-pending-polygon" points="${(app.pendingVertices || []).map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
        <rect class="qc-pending-rect" hidden></rect>
      </svg>
      ${areas
        .map((area, index) => {
          const center = areaCentroid(area);
          return `<button class="qc-area-marker" data-action="focus-area" data-area="${esc(area.id)}" style="left:${center.x}%;top:${center.y}%" title="${esc(area.title)}">${index + 1}</button>`;
        })
        .join("")}
    </div>
    <p class="qc-theme-hint"><strong>Temas reconhecidos no texto:</strong> ${themes.length ? themes.map(({ term }) => esc(term)).join(", ") : "nenhum tema específico; serão usadas regras gerais"}.</p>
    <label class="qc-field">Leitura geral do mapa<textarea data-review-notes rows="3">${esc(review.notes)}</textarea></label>
    <div class="qc-actions"><button data-action="save-map-review">Salvar planejamento</button><button data-action="import-foundry-areas" ${!importable ? "disabled" : ""}>Importar Regions/Drawings (${importable})</button><button data-action="create-accepted-scenes" ${!areas.some((area) => area.feedback === "accepted" && !area.sceneId) ? "disabled" : ""}>Criar cenas das salas aceitas</button><button data-action="export-learning" ${!stats.samples.length ? "disabled" : ""}>Exportar aprendizado</button></div>
    <div class="qc-area-list">${areas.map(areaCard).join("") || '<p class="qc-empty">Ainda não há salas ou pontos marcados neste mapa.</p>'}</div>
  </section>`;
}
