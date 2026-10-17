import test from 'node:test';
import assert from 'node:assert/strict';
import { detectWallRooms, mergeDetectedAreas, scenePoint, mapInventory, pointInArea } from '../src/map-recognition.mjs';
import { extractFoundryAreas } from '../src/map-review.mjs';
import { normalizeCampaign } from '../src/data.mjs';
import { importPlanning, applyPlanning, planningPacket } from '../src/campaign-planner.mjs';
import { areaCentroid } from '../src/room-learning.mjs';

const walls = (segments) => segments.map((c, i) => ({ id: `w${i}`, c, move: 20 }));
const square = [[0, 0, 100, 0], [100, 0, 100, 100], [100, 100, 0, 100], [0, 100, 0, 0]];

test('marcador permanece dentro de sala côncava', () => {
  const area = { shape: 'polygon', vertices: [[0, 0], [100, 0], [100, 100], [80, 100], [80, 20], [20, 20], [20, 100], [0, 100]].map(([x, y]) => ({ x, y })) };
  assert.ok(pointInArea(areaCentroid(area), area));
});

test('paredes com interseções em T e porta dividem salas; repetir análise preserva confirmações', () => {
  const map = { width: 100, height: 100, walls: walls([...square, [50, 0, 50, 40], [50, 40, 50, 60], [50, 60, 50, 100]]) };
  map.walls[5].door = 1; map.walls[5].ds = 1;
  const result = detectWallRooms(map);
  assert.equal(result.rooms.length, 2);
  assert.ok(result.rooms.every((r) => r.recognition === 'candidate'));
  const review = { points: [] };
  assert.equal(mergeDetectedAreas(review, result.rooms), 2);
  review.points[0].title = 'Sala corrigida'; review.points[0].recognition = 'confirmed';
  assert.equal(mergeDetectedAreas(review, detectWallRooms({ ...map, walls: [...map.walls].reverse() }).rooms), 0);
  assert.equal(review.points[0].title, 'Sala corrigida');
  assert.equal(review.points[0].recognition, 'confirmed');
});

test('cruzamentos são divididos em vértices; aberturas não viram portas imaginárias', () => {
  assert.equal(detectWallRooms({ width: 100, height: 100, walls: walls([...square, [0, 0, 100, 100], [0, 100, 100, 0]]) }).rooms.length, 4);
  const result = detectWallRooms({ width: 100, height: 100, walls: walls(square.slice(0, 3)) });
  assert.equal(result.rooms.length, 0);
  assert.ok(result.warnings.length);
  assert.ok(detectWallRooms({ walls: [] }).warnings[0].includes('Sem paredes'));
});

test('mesmo contorno em Region e Walls não gera duas salas locais', () => {
  const review = { points: [] };
  mergeDetectedAreas(review, [{ source: 'region', sourceId: 'r', shape: 'rect', vertices: [{ x: 0, y: 0 }, { x: 100, y: 100 }] }]);
  const result = detectWallRooms({ width: 100, height: 100, walls: walls(square) });
  assert.equal(mergeDetectedAreas(review, result.rooms), 0);
  assert.equal(review.points.length, 1);
});

test('coordenadas respeitam padding e offset, inclusive mapas quadrados', () => {
  const map = { width: 1000, height: 1000, dimensions: { sceneX: 200, sceneY: 100, sceneWidth: 1000, sceneHeight: 1000 },
    regions: [{ id: 'r', shapes: [{ type: 'rectangle', x: 300, y: 300, width: 200, height: 200 }] }] };
  assert.deepEqual(scenePoint(map, 300, 300), { x: 10, y: 20 });
  assert.deepEqual(extractFoundryAreas(map)[0].vertices, [{ x: 10, y: 20 }, { x: 30, y: 40 }]);
  assert.ok(pointInArea({ x: 20, y: 30 }, extractFoundryAreas(map)[0]));
});

test('círculos e retângulos rotacionados são importados; desenho usa tipos nativos do Foundry 13', () => {
  const map = { width: 100, height: 100, regions: [{ id: 'round', shapes: [{ type: 'circle', x: 50, y: 50, radius: 10 }, { type: 'rectangle', x: 30, y: 40, width: 40, height: 20, rotation: 90 }] }],
    drawings: [{ id: 'r', x: 10, y: 20, shape: { type: 'r', width: 10, height: 20 } }, { id: 'e', x: 60, y: 60, shape: { type: 'e', width: 20, height: 10 } }] };
  const areas = extractFoundryAreas(map);
  assert.equal(areas.length, 4);
  assert.equal(areas[0].vertices.length, 32);
  assert.equal(areas[1].shape, 'polygon');
  assert.ok(Math.abs(areas[1].vertices[0].x - 60) < 1e-6);
  assert.deepEqual(areas[2].vertices, [{ x: 10, y: 20 }, { x: 20, y: 40 }]);
});

test('uma dúvida de sala não bloqueia outra no mesmo mapa; contorno não confirmado bloqueia aplicação', () => {
  const c = normalizeCampaign({ id: 'c', scenes: [] });
  mergeDetectedAreas(c.mapReviews.m ??= { points: [] }, ['a', 'b'].map((id, i) => ({ source: 'region', sourceId: id, shape: 'rect', vertices: [{ x: 1 + i * 30, y: 1 }, { x: 20 + i * 30, y: 20 }] })));
  const [a, b] = c.mapReviews.m.points;
  const payload = { campaignId: 'c', questions: [{ id: 'q1', mapId: 'm', areaId: a.id, text: 'É um poço?' }], proposals: [{ id: 'p', mapId: 'm', areaId: b.id, title: 'Outra sala', narration: 'Um salão.', elements: [] }] };
  importPlanning(c, payload, ['m']);
  c.planning.proposals[0].status = 'approved';
  assert.throws(() => applyPlanning(c, 'p'), /Confirme a área/);
  b.recognition = 'confirmed';
  // importPlanning troca o snapshot de mapReviews de maneira atômica.
  c.mapReviews.m.points.find((p) => p.id === b.id).recognition = 'confirmed';
  applyPlanning(c, 'p');
  assert.equal(c.scenes.length, 1);
  assert.equal(c.planning.questions[0].answer, '');
});

test('stairs exigem parceiro real e porta secreta vem dos dados do Foundry', () => {
  const a = { id: 'a', width: 100, height: 100, flags: { stairways: { data: [{ _id: 's1', name: 'link', scene: 'b', x: 30, y: 40 }] } },
    walls: [{ id: 'secret', c: [0, 0, 20, 0], door: 2, ds: 2 }] };
  const b = { id: 'b', flags: { stairways: { data: [{ _id: 's2', name: 'link', scene: 'a' }] } } };
  assert.equal(mapInventory(a, [a, b]).stairs[0].status, 'confirmed');
  assert.equal(mapInventory(a, [a]).stairs[0].status, 'unresolved');
  assert.equal(mapInventory(a, [a, b]).doors[0].kind, 'Porta secreta');
  assert.equal(mapInventory(a, [a, b]).doors[0].state, 'Trancada');
});

test('análise visual persiste, mantém desconhecidos e protege correções da Mestra', () => {
  let c = normalizeCampaign({ id: 'c', scenes: [] });
  const response = { campaignId: 'c', questions: [], proposals: [], maps: [{ mapId: 'm', areas: [{ id: 'sala', title: 'Sala', shape: 'rect', vertices: [{ x: 10, y: 10 }, { x: 40, y: 40 }], observations: 'Pilares', unknowns: ['Função do objeto'] }] }] };
  importPlanning(c, response, ['m']);
  const area = c.mapReviews.m.points[0];
  assert.equal(area.recognition, 'candidate');
  area.expectation = 'Pista'; area.editedByGM = true; area.title = 'Salão corrigido';
  c = normalizeCampaign(c);
  importPlanning(c, response, ['m']);
  assert.equal(c.mapReviews.m.points.length, 1);
  assert.equal(c.mapReviews.m.points[0].title, 'Salão corrigido');
  assert.deepEqual(c.mapReviews.m.points[0].unknowns, ['Função do objeto']);
  assert.equal(planningPacket(c, [{ id: 'm' }]).maps[0].review.points[0].expectation, 'Pista');
});

test('dúvida de um mapa não bloqueia outro; conteúdo de sala pode entrar em cena existente', () => {
  const c = normalizeCampaign({ id: 'c', scenes: [{ id: 'existing', title: 'Explorar', mapSceneIds: ['b'] }] });
  mergeDetectedAreas(c.mapReviews.b ??= { points: [] }, [{ source: 'region', sourceId: 'r1', title: 'Biblioteca', shape: 'rect', vertices: [{ x: 1, y: 1 }, { x: 40, y: 40 }] }]);
  const area = c.mapReviews.b.points[0]; area.recognition = 'confirmed';
  importPlanning(c, { campaignId: 'c', questions: [{ id: 'q', text: 'Onde leva o poço?', mapId: 'a' }],
    proposals: [{ id: 'p', mapId: 'b', areaId: area.id, targetSceneId: 'existing', title: 'Biblioteca', narration: 'Livros.', elements: [] }] }, ['a', 'b']);
  c.planning.proposals[0].status = 'approved';
  applyPlanning(c, 'p');
  assert.equal(c.scenes.length, 1);
  assert.equal(c.scenes[0].title, 'Explorar');
  assert.equal(c.scenes[0].rooms[0].description, 'Livros.');
  assert.deepEqual(c.scenes[0].mapAreaRefs, [{ mapId: 'b', areaId: area.id }]);
});

test('importação inválida é atômica e não aplica áreas antes de falhar nas propostas', () => {
  const c = normalizeCampaign({ id: 'c', scenes: [] });
  const before = structuredClone(c);
  assert.throws(() => importPlanning(c, { campaignId: 'c', questions: [], proposals: [{ id: 'p', mapId: 'missing', title: 'A', narration: 'B' }], maps: [{ mapId: 'm', areas: [{ id: 'a', shape: 'point', vertices: [{ x: 1, y: 1 }] }] }] }, ['m']), /Mapa desconhecido/);
  assert.deepEqual(c, before);
});

test('importar a análise de outra parte mantém propostas pendentes e decisões anteriores', () => {
  const c = normalizeCampaign({ id: 'c', scenes: [] });
  const proposal = (id) => ({ id, title: id, narration: 'Texto', elements: [{ id: 'e', text: 'Pista' }] });
  importPlanning(c, { campaignId: 'c', questions: [], proposals: [proposal('p1')] }, []);
  c.planning.proposals[0].elements[0].status = 'approved';
  importPlanning(c, { campaignId: 'c', questions: [], proposals: [proposal('p2')] }, []);
  assert.deepEqual(c.planning.proposals.map((p) => p.id), ['p1', 'p2']);
  assert.equal(c.planning.proposals[0].elements[0].status, 'approved');
});
