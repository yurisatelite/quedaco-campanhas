import { escapeHtml as esc } from "./preparation.mjs";
export const POINT_TYPES = [
  ["loot", "Loot"],
  ["puzzle", "Puzzle"],
  ["threat", "Ameaça"],
  ["challenge", "Desafio complexo"],
  ["exploration", "Exploração"],
  ["secret", "Segredo"],
];
export function renderMapReview(app, maps) {
  const map =
    maps.get(app.reviewMapId) || maps.get(app.selectedScene?.mapSceneIds[0]);
  if (!map)
    return "<p>Abra a galeria e clique em “Planejar” em um mapa. Você também pode escrever cenas sem mapa.</p>";
  const review = app.campaign.mapReviews[map.id] || { notes: "", points: [] };
  return `<section class="qc-map-review" data-review-map="${esc(map.id)}"><h3>Planejar: ${esc(map.name)}</h3><p>Marque pontos na imagem para planejar a distribuição das cenas. Leitura visual assistida, sem detecção automática de salas.</p><div class="qc-actions"><select name="point-type" aria-label="Categoria do ponto">${POINT_TYPES.map(([id, label]) => `<option value="${id}" ${app.pointType === id ? "selected" : ""}>${label}</option>`).join("")}</select></div><p><small>Clique no mapa para adicionar um ponto da categoria escolhida.</small></p><div class="qc-review-canvas" data-action="mark-map-point"><img src="${esc(map.background?.src || map.thumb || "")}" alt="${esc(map.name)}" draggable="false">${review.points.map((point, index) => `<span class="qc-map-pin" style="left:${point.x}%;top:${point.y}%" title="${esc(point.title)}">${index + 1}</span>`).join("")}</div><label class="qc-field">Leitura geral do mapa<textarea data-review-notes rows="3">${esc(review.notes)}</textarea></label>${review.points.map((point, index) => `<article class="qc-review-point" data-point="${esc(point.id)}"><label class="qc-field">${index + 1} · ${esc(POINT_TYPES.find(([id]) => id === point.type)?.[1])}<input data-point-field="title" value="${esc(point.title)}"></label><label class="qc-field">Descrição, pista ou conteúdo<textarea data-point-field="description" rows="3">${esc(point.description)}</textarea></label><div class="qc-actions"><button data-action="point-scene" data-point="${esc(point.id)}">${point.sceneId ? "Abrir cena vinculada" : "Criar cena deste ponto"}</button><button data-action="link-point-scene" data-point="${esc(point.id)}">Vincular à cena atual</button><button data-action="remove-point" data-point="${esc(point.id)}">Remover ponto</button></div></article>`).join("")}<button data-action="save-map-review">Salvar planejamento</button></section>`;
}
