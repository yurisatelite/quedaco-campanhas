/** Reconhecimento geométrico local. Não interpreta os pixels nem inventa objetos. */
export const values = (collection) => {
  if (!collection) return [];
  if (collection instanceof Map) return [...collection.values()];
  if (Array.isArray(collection)) return collection;
  if (collection.contents) return collection.contents;
  return typeof collection[Symbol.iterator] === 'function' ? [...collection] : Object.values(collection);
};
const doc = (v) => v?.document || v;
const number = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const hash = (text) => {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
};

export function sceneFrame(map) {
  const d = map?.dimensions || map?.getDimensions?.() || {};
  return { x: number(d.sceneX), y: number(d.sceneY),
    width: Math.max(1, number(d.sceneWidth || map?.width, 1)),
    height: Math.max(1, number(d.sceneHeight || map?.height, 1)) };
}
export function scenePoint(map, x, y) {
  const f = sceneFrame(map);
  return { x: (number(x) - f.x) * 100 / f.width, y: (number(y) - f.y) * 100 / f.height };
}
export function signedArea(vertices) {
  return vertices.reduce((sum, a, i) => {
    const b = vertices[(i + 1) % vertices.length];
    return sum + a.x * b.y - b.x * a.y;
  }, 0) / 2;
}
export function pointInArea(point, area) {
  const p = area.vertices || [];
  if (area.shape === 'rect' && p.length >= 2)
    return point.x >= Math.min(p[0].x, p[1].x) && point.x <= Math.max(p[0].x, p[1].x)
      && point.y >= Math.min(p[0].y, p[1].y) && point.y <= Math.max(p[0].y, p[1].y);
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i], b = p[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Faces de um grafo planar; portas fecham contornos mesmo quando abertas. */
export function detectWallRooms(map, { maxWalls = 1800, minArea = 0.02 } = {}) {
  const raw = values(map?.walls).map(doc).filter((w) =>
    Array.isArray(w?.c) && w.c.length === 4 && w.c.every((n) => Number.isFinite(Number(n)))
    && (w.move === undefined || Number(w.move) > 0 || Number(w.door) > 0));
  if (raw.length > maxWalls) return { rooms: [], warnings: ['Muitas paredes para análise local de uma vez. Importe Regions/Drawings ou analise por áreas.'] };
  const segments = raw.map((w, index) => ({ id: String(w.id || w._id || index),
    a: scenePoint(map, w.c[0], w.c[1]), b: scenePoint(map, w.c[2], w.c[3]), cuts: [0, 1] }))
    .filter((s) => Math.hypot(s.a.x - s.b.x, s.a.y - s.b.y) > 0.0001);
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  for (let i = 0; i < segments.length; i++) {
    const a = segments[i], r = sub(a.b, a.a);
    for (let j = i + 1; j < segments.length; j++) {
      const b = segments[j], s = sub(b.b, b.a), q = sub(b.a, a.a), det = cross(r, s);
      if (Math.abs(det) > 1e-9) {
        const t = cross(q, s) / det, u = cross(q, r) / det;
        if (t >= -1e-8 && t <= 1 + 1e-8 && u >= -1e-8 && u <= 1 + 1e-8) {
          a.cuts.push(Math.max(0, Math.min(1, t))); b.cuts.push(Math.max(0, Math.min(1, u)));
        }
      } else if (Math.abs(cross(q, r)) < 1e-8) {
        for (const [first, second] of [[a, b], [b, a]]) {
          const delta = sub(first.b, first.a), length = delta.x ** 2 + delta.y ** 2;
          for (const p of [second.a, second.b]) {
            const t = ((p.x - first.a.x) * delta.x + (p.y - first.a.y) * delta.y) / length;
            if (t > 0 && t < 1) first.cuts.push(t);
          }
        }
      }
    }
  }
  const nodes = new Map(), edges = new Map();
  const key = (p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
  const node = (p) => {
    const id = key(p);
    if (!nodes.has(id)) nodes.set(id, { ...p, id, neighbors: new Set() });
    return nodes.get(id);
  };
  for (const segment of segments) {
    const cuts = [...new Set(segment.cuts.map((v) => +v.toFixed(8)))].sort((a, b) => a - b);
    const at = (t) => node({ x: segment.a.x + t * (segment.b.x - segment.a.x), y: segment.a.y + t * (segment.b.y - segment.a.y) });
    for (let i = 1; i < cuts.length; i++) {
      const a = at(cuts[i - 1]), b = at(cuts[i]);
      if (a.id === b.id) continue;
      a.neighbors.add(b.id); b.neighbors.add(a.id);
      const id = [a.id, b.id].sort().join('|');
      if (!edges.has(id)) edges.set(id, new Set());
      edges.get(id).add(segment.id);
    }
  }
  for (const n of nodes.values()) n.order = [...n.neighbors].sort((a, b) => {
    const p = nodes.get(a), q = nodes.get(b);
    return Math.atan2(p.y - n.y, p.x - n.x) - Math.atan2(q.y - n.y, q.x - n.x);
  });
  const visited = new Set(), rooms = [];
  for (const a of nodes.values()) for (const neighbor of a.order) {
    const start = `${a.id}>${neighbor}`;
    if (visited.has(start)) continue;
    const vertices = [], walls = new Set();
    let from = a.id, to = neighbor, closed = false;
    for (let step = 0; step <= edges.size * 2; step++) {
      const directed = `${from}>${to}`;
      if (visited.has(directed)) { closed = directed === start; break; }
      visited.add(directed);
      const n = nodes.get(from), next = nodes.get(to);
      vertices.push({ x: n.x, y: n.y });
      for (const id of edges.get([from, to].sort().join('|')) || []) walls.add(id);
      const idx = next.order.indexOf(from);
      from = to; to = next.order[(idx - 1 + next.order.length) % next.order.length];
    }
    if (!closed || vertices.length < 3 || signedArea(vertices) < minArea) continue;
    // O contorno precisa caber na imagem; não fecha artificialmente áreas externas.
    if (vertices.some((p) => p.x < 0 || p.y < 0 || p.x > 100 || p.y > 100)) continue;
    const unique = [...new Set(vertices.map(key))].sort();
    rooms.push({ source: 'walls', sourceId: `walls:${hash(unique.join(';'))}`,
      title: `Área detectada ${rooms.length + 1}`, shape: 'polygon', vertices,
      wallIds: [...walls].sort(), recognition: 'candidate',
      evidence: 'Contorno fechado nas paredes do Foundry; pode ser sala, pilar ou limite externo. Confirme a função.' });
  }
  return { rooms, warnings: !raw.length ? ['Sem paredes cadastradas. Desenhe áreas ou importe a análise visual do chat.']
    : !rooms.length ? ['Nenhum contorno fechado. Podem existir aberturas ou trechos incompletos; marque as áreas manualmente.'] : [] };
}

export function stairwayLinks(map, allMaps = []) {
  const stairs = (m) => values(m?.stairways).length ? values(m.stairways).map(doc) : values(m?.flags?.stairways?.data);
  return stairs(map).map((s, index) => {
    const targetMapId = s.scene == null ? map.id : String(s.scene);
    const target = allMaps.find((m) => m.id === targetMapId) || (targetMapId === map.id ? map : null);
    const partners = target ? stairs(target).filter((p) => p.name === s.name && (targetMapId !== map.id || (p.id || p._id) !== (s.id || s._id))) : [];
    const connected = partners.length === 1;
    return { id: String(s.id || s._id || `stairs-${index}`), name: String(s.label || s.name || 'Stairs'),
      ...scenePoint(map, s.x, s.y), source: 'stairways',
      targetMapId, targetId: connected ? String(partners[0].id || partners[0]._id || '') : '',
      status: connected ? 'confirmed' : 'unresolved', disabled: Boolean(s.disabled), hidden: Boolean(s.hidden) };
  });
}

export function mapInventory(map, allMaps = []) {
  const doors = values(map?.walls).map(doc).filter((w) => Number(w?.door) > 0 && w.c?.length === 4).map((w, index) => ({
    id: String(w.id || w._id || index), kind: Number(w.door) === 2 ? 'Porta secreta' : 'Porta',
    ...scenePoint(map, (number(w.c[0]) + number(w.c[2])) / 2, (number(w.c[1]) + number(w.c[3])) / 2),
    state: Number(w.ds) === 2 ? 'Trancada' : Number(w.ds) === 1 ? 'Aberta' : 'Fechada', source: 'Foundry: Wall',
  }));
  const tokens = values(map?.tokens).map(doc).map((t, index) => ({ id: String(t.id || t._id || index),
    kind: 'Token', name: String(t.name || ''), actorId: String(t.actorId || ''),
    ...scenePoint(map, number(t.x) + number(t.width, 1) * number(map?.grid?.size, 100) / 2,
      number(t.y) + number(t.height, 1) * number(map?.grid?.size, 100) / 2), source: 'Foundry: Token' }));
  return { doors, tokens, stairs: stairwayLinks(map, allMaps) };
}

/** Acrescenta candidatos sem sobrescrever confirmações, edições ou rejeições. */
export function mergeDetectedAreas(review, detected) {
  review.points ??= [];
  const geometryKey = (a) => {
    let p = a.vertices || [];
    if (a.shape === 'rect' && p.length >= 2) p = [p[0], { x: p[1].x, y: p[0].y }, p[1], { x: p[0].x, y: p[1].y }];
    if (p.length < 3) return '';
    p = p.filter((v, i) => {
      const prev = p[(i - 1 + p.length) % p.length], next = p[(i + 1) % p.length];
      return Math.abs((v.x - prev.x) * (next.y - v.y) - (v.y - prev.y) * (next.x - v.x)) > 1e-7;
    });
    return p.map((v) => `${v.x.toFixed(3)},${v.y.toFixed(3)}`).sort().join(';');
  };
  let added = 0;
  for (const area of detected) {
    if (review.points.some((p) => p.sourceId && p.source === area.source && p.sourceId === area.sourceId)) continue;
    const geometry = geometryKey(area);
    if (geometry && review.points.some((p) => geometryKey(p) === geometry)) continue;
    review.points.push({ ...area, id: `detected-${area.source}-${hash(area.sourceId)}`,
      type: 'exploration', environment: 'unknown', status: 'draft', feedback: '',
      x: area.vertices[0].x, y: area.vertices[0].y, visualDescription: '', expectation: '',
      gmNotes: '', suggestion: {}, sceneId: '',
      unknowns: ['Função da área a preencher.', 'Objetos desenhados na imagem ainda não identificados.'],
      recognition: 'candidate', evidence: area.evidence || `Geometria importada de ${area.source}.` });
    added++;
  }
  return added;
}
