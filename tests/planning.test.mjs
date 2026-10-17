import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCampaign } from '../src/data.mjs';
import { importPlanning, applyPlanning, planningPacket, attachPlanningImages } from '../src/campaign-planner.mjs';

test('geografia deve ser esclarecida antes das cenas; aprovação é separada por elemento', () => {
  let c = normalizeCampaign({ id: 'test', scenes: [] });
  importPlanning(c, { campaignId: 'test', questions: [{ id: 'q1', text: 'O poço liga os dois mapas?' }], proposals: [] }, ['m1']);
  const response = { campaignId: 'test', questions: [], proposals: [{ id: 'p1', mapId: 'm1', title: 'Vestígios', narration: 'A pedra guarda um brilho.', elements: [{ id: 'e1', kind: 'loot', text: 'Cristal', reference: 'Item.crystal' }] }] };
  assert.throws(() => importPlanning(c, response, ['m1']), /perguntas sem resposta/);
  c.planning.questions[0].answer = 'Sim, confirmado pelo guia.';
  importPlanning(c, response, ['m1']);
  assert.equal(c.planning.proposals[0].status, 'pending');
  c.planning.proposals[0].status = 'approved';
  assert.throws(() => applyPlanning(c, 'p1'), /cada elemento/);
  c.planning.proposals[0].elements[0].status = 'approved';
  c = normalizeCampaign(c);
  applyPlanning(c, 'p1', [{ uuid: 'Item.crystal', name: 'Cristal', documentName: 'Item' }]);
  assert.deepEqual(c.scenes[0].mapSceneIds, ['m1']);
  assert.equal(c.scenes[0].loot[0].uuid, 'Item.crystal');
  assert.throws(() => applyPlanning(c, 'p1'), /Aprove/);
  importPlanning(c, response, ['m1']);
  assert.equal(c.planning.proposals[0].status, 'applied');
  assert.equal(planningPacket(c, [{ id: 'm1', background: { src: 'full-map.webp' }, thumb: 'thumb.webp' }]).maps[0].image, 'full-map.webp');
});

test('análise de outra campanha, mapa desconhecido e perguntas junto de propostas são recusados', () => {
  const c = normalizeCampaign({ id: 'test', scenes: [] });
  assert.throws(() => importPlanning(c, { campaignId: 'other' }, []), /outra campanha/);
  assert.throws(() => importPlanning(c, { campaignId: 'test', questions: [{ id: 'q1', text: '?' }], proposals: [{ id: 'p1', title: 'Cena', narration: 'Narração' }] }, []), /dúvidas/);
  assert.throws(() => importPlanning(c, { campaignId: 'test', questions: [], proposals: [{ id: 'p1', title: 'X', narration: 'Y', mapId: 'unknown' }] }, []), /Mapa desconhecido/);
});

test('exportação inclui imagens de todos os mapas e guia; análise preserva elemento aprovado', async () => {
  const c = normalizeCampaign({ id: 'test', scenes: [], planning: { guide: 'guide.webp' } });
  const response = { campaignId: 'test', questions: [], proposals: [{ id: 'p1', title: 'Vestígio', narration: 'Um brilho.', elements: [{ id: 'e1', text: 'Cristal aprovado' }, { id: 'e2', text: 'Ainda pendente' }] }] };
  importPlanning(c, response, []);
  c.planning.proposals[0].elements[0].status = 'approved';
  response.proposals[0].elements[0].text = 'Uma mudança não solicitada';
  importPlanning(c, response, []);
  assert.equal(c.planning.proposals[0].elements[0].text, 'Cristal aprovado');
  const packet = planningPacket(c, [{ id: 'a', name: 'A', thumb: 'a.webp' }, { id: 'b', name: 'B', thumb: 'b.webp' }]);
  const paths = [];
  await attachPlanningImages(packet, async (path) => { paths.push(path); return `data:image/webp;base64,${path}`; });
  assert.deepEqual(paths, ['a.webp', 'b.webp', 'guide.webp']);
  assert.ok(packet.guideData.startsWith('data:image/'));
});
