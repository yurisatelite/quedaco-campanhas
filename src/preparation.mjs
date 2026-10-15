export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

export function mapSequence(campaign) {
  const groups = new Map();
  for (const [index, scene] of campaign.scenes.entries()) {
    for (const mapId of scene.mapSceneIds.length ? scene.mapSceneIds : [""]) {
      if (!groups.has(mapId)) groups.set(mapId, { mapId, scenes: [] });
      groups.get(mapId).scenes.push({ scene, index });
    }
  }
  return [...groups.values()];
}

export function renderMapSequence(
  campaign,
  maps,
  selectedSceneId,
  renderScene,
) {
  const esc = escapeHtml;
  return mapSequence(campaign)
    .map((group) => {
      const map = maps.get(group.mapId);
      const title =
        map?.name || (group.mapId ? "Mapa indisponível" : "Cenas sem mapa");
      return `<section class="qc-map-group" data-map-group="${esc(group.mapId)}"><header><div><small>${group.mapId ? "MAPA DA CAMPANHA" : "ASSOCIAÇÃO PENDENTE"}</small><h3>${esc(title)}</h3><span class="qc-count">${group.scenes.length} de ${campaign.scenes.length} cenas</span></div>${map ? `<button data-action="open-map" data-map="${esc(map.id)}" data-scene="${esc(group.scenes[0].scene.id)}">Abrir mapa e roteiro</button>` : ""}</header><ol>${group.scenes.map(({ scene, index }) => `<li class="${scene.id === selectedSceneId ? "is-active" : ""}"><span class="qc-step-number">${String(index + 1).padStart(2, "0")}</span>${renderScene(scene, index)}${renderInlineResources(scene, campaign.id)}</li>`).join("")}</ol></section>`;
    })
    .join("");
}

function renderInlineResources(scene, campaignId) {
  const esc = escapeHtml;
  return `<div class="qc-inline-resources">${scene.roster.map((row) => `<span draggable="true" data-actor-uuid="${esc(row.actorUuid)}" title="Arraste para posicionar um token"><img src="${esc(row.img || "icons/svg/mystery-man.svg")}" alt="">${esc(row.name)} ×${row.quantity}</span>`).join("")}${scene.loot.map((item) => `<span draggable="true" data-item-uuid="${esc(item.uuid)}" data-loot-id="${esc(item.id)}" data-campaign="${esc(campaignId)}" data-scene="${esc(scene.id)}" title="Arraste para preparar a recompensa no mapa"><img src="${esc(item.img || "icons/svg/item-bag.svg")}" alt="">${esc(item.name)} ×${item.quantity}</span>`).join("")}</div>`;
}

export function renderRooms(scene) {
  const esc = escapeHtml;
  return `<section class="qc-rooms"><header><h3>Salas e pontos de interesse</h3><button data-action="add-room">Adicionar sala</button></header><p>Descreva cada sala antes da sessão. Monstros e recompensas podem ser vinculados a ela nas bandejas abaixo.</p>${scene.rooms.map((room) => `<details class="qc-room" open data-room="${esc(room.id)}"><summary>${esc(room.name)}</summary><label>Nome<input data-room-field="name" value="${esc(room.name)}"></label><label>Descrição para narrar<textarea data-room-field="description" rows="3">${esc(room.description)}</textarea></label><label>Segredos, pistas e orientação da Mestra<textarea data-room-field="notes" rows="3">${esc(room.notes)}</textarea></label><label>Saídas e conexões<input data-room-field="connections" value="${esc(room.connections)}"></label><button data-action="save-room" data-room="${esc(room.id)}">Salvar sala</button></details>`).join("") || '<p class="qc-empty">Nenhuma sala descrita nesta cena.</p>'}</section>`;
}

export function roomOptions(scene, selected = "") {
  const esc = escapeHtml;
  return `<option value="">Cena inteira</option>${scene.rooms.map((room) => `<option value="${esc(room.id)}" ${room.id === selected ? "selected" : ""}>${esc(room.name)}</option>`).join("")}`;
}

export function renderLoot(scene, items, campaignId) {
  const esc = escapeHtml;
  return `<section class="qc-loot qc-resource-drop" data-resource-drop="Item"><h3>Itens e loot</h3><p>Escolha um item do mundo ou arraste uma ficha de Item de um compêndio para esta área. Arraste a recompensa preparada para o mapa para criar um marcador visual, ou para uma ficha que aceite itens.</p><div class="qc-roster-add"><select name="loot-item"><option value="">Escolher item…</option>${items.map((item) => `<option value="${esc(item.uuid)}">${esc(item.name)}</option>`).join("")}</select><button data-action="add-loot">Preparar item</button></div><label>Sala para novas recompensas<select name="loot-room">${roomOptions(scene)}</select></label><ul class="qc-roster">${scene.loot.map((item) => `<li draggable="true" data-item-uuid="${esc(item.uuid)}" data-loot-id="${esc(item.id)}" data-campaign="${esc(campaignId)}" data-scene="${esc(scene.id)}"><img src="${esc(item.img || "icons/svg/item-bag.svg")}" alt=""><span><strong>${esc(item.name)}</strong><small>${esc(scene.rooms.find((room) => room.id === item.roomId)?.name || "Cena inteira")} · ${item.hidden ? "marcador oculto" : "marcador visível"}</small><button data-action="open-document" data-uuid="${esc(item.uuid)}">Abrir ficha</button></span><button data-action="loot-quantity" data-loot="${esc(item.id)}" data-change="-1">−</button><b>${item.quantity}</b><button data-action="loot-quantity" data-loot="${esc(item.id)}" data-change="1">+</button><button data-action="remove-loot" data-loot="${esc(item.id)}" aria-label="Remover item">×</button></li>`).join("") || '<li class="qc-empty">Nenhuma recompensa preparada.</li>'}</ul></section>`;
}
