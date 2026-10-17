import { mergeDetectedAreas, signedArea } from './map-recognition.mjs';

export function questionAffects(q, proposal) {
  return (
    (!q.mapId && !q.areaId) || proposal.dependsOn?.includes(q.id)
    || (q.mapId === proposal.mapId && (!q.areaId || q.areaId === proposal.areaId))
    || proposal.elements?.some((e) => e.status !== 'rejected' && e.dependsOn?.includes(q.id))
  );
}
export function unresolvedFor(plan, proposal) {
  return plan.questions.filter((q) => !q.answer.trim() && questionAffects(q, proposal));
}

export function importVisualAreas(campaign, maps, mapIds) {
  if (!Array.isArray(maps)) throw Error('O campo maps deve ser uma lista.');
  for (const result of maps) {
    if (!mapIds.includes(result?.mapId)) throw Error(`Mapa desconhecido na análise visual: ${result?.mapId}`);
    if (!Array.isArray(result.areas)) throw Error('Cada mapa analisado precisa de uma lista areas.');
    const seen = new Set();
    for (const area of result.areas) {
      if (typeof area?.id !== 'string' || !area.id.trim() || seen.has(area.id)) throw Error('As áreas precisam de IDs únicos em cada mapa.');
      seen.add(area.id);
      const length = area.shape === 'rect' ? 2 : area.shape === 'point' ? 1 : area.shape === 'polygon' ? 3 : Infinity;
      if (!Array.isArray(area.vertices) || area.vertices.length < length || area.vertices.some((p) =>
        typeof p?.x !== 'number' || typeof p?.y !== 'number' || !Number.isFinite(p.x) || !Number.isFinite(p.y)
        || p.x < 0 || p.y < 0 || p.x > 100 || p.y > 100)) throw Error('A área precisa de forma válida e coordenadas entre 0 e 100 na imagem.');
      if ((area.shape !== 'polygon' && area.vertices.length !== length) || area.vertices.length > 256) throw Error('Quantidade inválida de vértices.');
      if (area.shape === 'rect' && (area.vertices[0].x === area.vertices[1].x || area.vertices[0].y === area.vertices[1].y)) throw Error('Retângulo sem área.');
      if (area.shape === 'polygon' && Math.abs(signedArea(area.vertices)) < 1e-6) throw Error('Polígono sem área.');
    }
  }
  for (const result of maps) {
    const review = campaign.mapReviews[result.mapId] ??= { notes: '', points: [] };
    for (const a of result.areas) {
      const sourceId = `visual:${a.id}`;
      let existing = review.points.find((p) => p.id === a.id || (p.source === 'visual' && p.sourceId === sourceId));
      if (existing?.recognition === 'confirmed' || existing?.recognition === 'rejected' || existing?.feedback === 'accepted' || existing?.sceneId || existing?.editedByGM) continue;
      const geometry = { source: existing?.source || 'visual', sourceId: existing?.sourceId || sourceId, shape: a.shape, vertices: a.vertices.map((p) => ({ x: p.x, y: p.y })) };
      if (!existing) {
        mergeDetectedAreas(review, [geometry]);
        existing = review.points.find((p) => p.source === 'visual' && p.sourceId === sourceId);
        // Um contorno idêntico já pode estar cadastrado por Walls/Regions.
        // A importação visual recebe seu próprio ID para manter referências estáveis.
        if (!existing) {
          const temporary = { points: [] };
          mergeDetectedAreas(temporary, [geometry]);
          existing = temporary.points[0];
          review.points.push(existing);
        }
      }
      Object.assign(existing, geometry, { title: String(a.title || 'Área a identificar'),
        visualDescription: String(a.observations || ''), evidence: String(a.evidence || 'Análise visual do chat; aguardando confirmação da Mestra.'),
        unknowns: (Array.isArray(a.unknowns) ? a.unknowns : []).map(String), recognition: 'candidate' });
    }
  }
}

/** Adiciona uma sala a uma cena sem multiplicar cenas e sem tocar em dados públicos. */
export function applyAreaToScene(campaign, scene, area, mapId, suggestion = area.suggestion) {
  if (area.recognition !== 'confirmed') throw Error('Confirme a área antes de aplicar conteúdo.');
  if (scene.mapSceneIds?.[0] !== mapId) throw Error('A cena escolhida pertence a outro mapa.');
  scene.rooms ??= [];
  const roomId = `area-${area.id}`;
  let room = scene.rooms.find((r) => r.id === roomId);
  const content = {
    id: roomId, name: area.title, description: suggestion?.narration || '',
    notes: [area.gmNotes, ...['challenge', 'threats', 'loot', 'secret'].filter((k) => suggestion?.[k]).map((k) => `${k}: ${suggestion[k]}`)].filter(Boolean).join('\n\n'),
    connections: '',
  };
  if (room) Object.assign(room, content); else scene.rooms.push(content);
  scene.mapAreaRefs ??= [];
  if (!scene.mapAreaRefs.some((r) => r.mapId === mapId && r.areaId === area.id)) scene.mapAreaRefs.push({ mapId, areaId: area.id });
  area.sceneId = scene.id;
  return roomId;
}
