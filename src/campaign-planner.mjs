import { escapeHtml as esc } from './preparation.mjs';
import { mapInventory } from './map-recognition.mjs';
import { importVisualAreas, unresolvedFor, applyAreaToScene } from './planning-analysis.mjs';

export const PLANNING_BRIEF = `Objetivo secreto da Mestra: descobrir que, no período do retorno do Dragão Vermelho, a garra de Bahamut, o Dragão de Ouro, foi roubada. Sua unha abre fendas no Arcanum e catalisa energia arcana.
Os personagens e a senhora desconhecem a garra. A senhora é a mãe de Carlos Alexandre e oferece uma memória ligada à investigação dele. Carlos acredita usar o poder de Fofuxa e desconhece a fonte real e o ritual.
Quatro personagens ocupam corpos anões após um pequeno deslizamento; três foram lembrados nas paredes de Noátorá, o quarto aparece borrado e sofre por nunca ser lembrado.
Possibilidades para aprovação: fendas temporais, seres que escapam delas e energia condensada. Seus sinais devem reaparecer nos experimentos de Carlos Alexandre, permitindo comparação no presente. Não definir a natureza desses seres sem aprovação.
Não presumir que a abertura acontece na água ou que todas as áreas são aquáticas. Jormü é um encontro secundário.
Analisar o conjunto dos mapas antes de distribuir cenas. Conexões, portas secretas e objetos ambíguos exigem pergunta e resposta da Mestra ANTES de criar propostas dependentes. Usar o guia apenas nas ligações que ele realmente mostra.
Usar regras e catálogo fornecidos; quando não houver referência para teste, dificuldade ou recompensa, marcar revisão necessária. Não inventar valores ou fichas.`;

export function normalizePlanning(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  return {
    brief: String(value.brief || ''), guide: String(value.guide || ''), expectation: String(value.expectation || ''),
    questions: Array.isArray(value.questions) ? value.questions.map((q) => ({ id: String(q?.id || ''), text: String(q?.text || ''), answer: String(q?.answer || ''), mapId: String(q?.mapId || ''), areaId: String(q?.areaId || '') })) : [],
    proposals: Array.isArray(value.proposals) ? value.proposals.map((p) => ({
      id: String(p.id || ''), title: String(p.title || ''), mapId: String(p.mapId || ''),
      narration: String(p.narration || ''),
      areaId: String(p.areaId || ''), targetSceneId: String(p.targetSceneId || ''),
      dependsOn: (Array.isArray(p.dependsOn) ? p.dependsOn : []).map(String),
      elements: (Array.isArray(p.elements) ? p.elements : []).map((e) => ({
        id: String(e.id || ''), kind: String(e.kind || 'informação'), text: String(e.text || ''),
        reference: String(e.reference || ''), status: ['approved', 'rejected'].includes(e.status) ? e.status : 'pending',
        quantity: Math.max(1, Math.min(99, Math.floor(Number(e.quantity) || 1))),
        dependsOn: (Array.isArray(e.dependsOn) ? e.dependsOn : []).map(String),
      })), status: ['approved', 'rejected', 'applied'].includes(p.status) ? p.status : 'pending',
    })) : [],
  };
}

export function planningPacket(campaign, maps, catalog = []) {
  const plan = normalizePlanning(campaign.planning);
  return {
    schema: 'quedaco-analysis/v1', campaignId: campaign.id,
    stage: plan.questions.some((q) => !q.answer.trim()) ? 'clarification' : 'analysis',
    instructions: 'Analise todos os mapas em conjunto. Identifique o máximo com evidências; deixe unknowns para o restante. Expectativas não são fatos. Pergunte sobre conexões, portas secretas ou objetos ambíguos ANTES de sugerir cenas dependentes. Use apenas referências fornecidas para regras; o restante exige revisão. Preserve aprovações anteriores.', brief: plan.brief, expectation: plan.expectation, material: campaign.working.material,
    guide: plan.guide, questions: plan.questions,
    maps: maps.map((m) => ({ id: m.id, name: m.name, image: m.background?.src || m.thumb || '', review: campaign.mapReviews?.[m.id] || null, inventory: mapInventory(m, maps) })),
    scenes: campaign.scenes.map((s) => ({ id: s.id, sourceKey: s.sourceKey, title: s.title, mapSceneIds: s.mapSceneIds, mapAreaRefs: s.mapAreaRefs })),
    catalog: catalog.map((r) => ({ uuid: r.uuid, name: r.name, documentName: r.documentName })),
    previousReview: plan.proposals,
    approved: plan.proposals.filter((p) => p.status === 'approved' || p.status === 'applied'),
    responseFormat: { campaignId: campaign.id, questions: [{ id: 'q1', text: 'Pergunta factual, sem sugerir uma resposta.' }], proposals: [{ id: 'p1', mapId: 'ID de um mapa do pacote, ou vazio para interlúdio', title: 'Título', narration: 'Narração sem segredos da Mestra', elements: [{ id: 'e1', kind: 'pista/ameaça/loot/puzzle/teste/NPC/recompensa', text: 'Descrição', reference: 'UUID ou referência de regra; vazio = revisão necessária' }] }] },
    visualFormat: { maps: [{ mapId: 'ID exportado', areas: [{ id: 'id-estavel-da-area', title: 'Nome ou área a identificar', shape: 'rect', vertices: [{ x: 10, y: 10 }, { x: 30, y: 30 }], observations: 'Apenas o que é visível', unknowns: ['O que não foi possível identificar'], evidence: 'Origem da identificação' }] }] },
    responseRules: 'Adicione mapId/areaId às perguntas e areaId/targetSceneId às propostas para limitar dependências e permitir várias salas numa cena. Use dependsOn para IDs de perguntas específicas. Não proponha conteúdo dependente de geografia sem resposta. Pode analisar áreas independentes enquanto outras aguardam confirmação. Nunca substituir propostas aprovadas. Geometria é percentual na imagem original, e a área importada deve ser confirmada antes de aplicar conteúdo. Expectativas orientam a leitura, mas não provam objetos.',
  };
}

export function importPlanning(campaign, response, mapIds) {
  if (response.campaignId !== campaign.id) throw Error('A análise pertence a outra campanha.');
  if (!Array.isArray(response.questions) || !Array.isArray(response.proposals)) throw Error('A análise precisa conter questions e proposals.');
  const current = normalizePlanning(campaign.planning);
  const draft = { ...campaign, mapReviews: structuredClone(campaign.mapReviews || {}) };
  if (response.maps !== undefined) importVisualAreas(draft, response.maps, mapIds);
  const incoming = normalizePlanning(response);
  const questions = [...current.questions];
  const questionIds = new Set();
  for (const q of incoming.questions) {
    if (!q.text || !q.id || questionIds.has(q.id)) throw Error('Perguntas precisam de ID único e texto.');
    questionIds.add(q.id);
    if (q.mapId && !mapIds.includes(q.mapId)) throw Error('Mapa desconhecido na pergunta.');
    if (q.areaId && !q.mapId) throw Error('Uma pergunta sobre sala precisa indicar o mapa.');
    if (q.areaId && q.mapId) q.areaId = draft.mapReviews[q.mapId]?.points.find((a) => a.id === q.areaId || a.sourceId === `visual:${q.areaId}`)?.id || q.areaId;
    q.answer = current.questions.find((old) => old.id === q.id && old.text === q.text && old.mapId === q.mapId && old.areaId === q.areaId)?.answer || '';
    const index = questions.findIndex((old) => old.id === q.id);
    if (index < 0) questions.push(q); else questions[index] = q;
  }
  const ids = new Set();
  for (const p of incoming.proposals) {
    if (!p.id || ids.has(p.id) || !p.title || !p.narration) throw Error('Cada proposta precisa de ID único, título e narração.');
    ids.add(p.id);
    if (p.mapId && !mapIds.includes(p.mapId)) throw Error(`Mapa desconhecido: ${p.mapId}`);
    if (p.areaId && !draft.mapReviews[p.mapId]?.points.some((a) => a.id === p.areaId || a.sourceId === `visual:${p.areaId}`)) throw Error('Área desconhecida na proposta.');
    if (p.areaId) p.areaId = draft.mapReviews[p.mapId].points.find((a) => a.id === p.areaId || a.sourceId === `visual:${p.areaId}`).id;
    if (p.targetSceneId && !campaign.scenes.some((s) => s.id === p.targetSceneId && s.mapSceneIds[0] === p.mapId)) throw Error('A cena escolhida não pertence ao mapa da proposta.');
    const elements = new Set();
    for (const e of p.elements) {
      if (!e.id || elements.has(e.id) || !e.text) throw Error('Cada elemento precisa de ID único e descrição.');
      elements.add(e.id); e.status = 'pending';
    }
    p.status = 'pending';
    if (unresolvedFor({ questions }, p).length) throw Error('Responda às dúvidas: ainda há perguntas sem resposta que afetam esta proposta.');
    for (const id of [...p.dependsOn, ...p.elements.flatMap((e) => e.dependsOn)])
      if (!questions.some((q) => q.id === id)) throw Error(`Dependência desconhecida: ${id}`);
    const previous = current.proposals.find((old) => old.id === p.id);
    if (previous) {
      // Uma nova análise só pode substituir os elementos ainda não aprovados.
      const approved = previous.elements.filter((e) => e.status === 'approved' || e.status === 'rejected');
      p.elements = [...approved, ...p.elements.filter((e) => !approved.some((old) => old.id === e.id))];
    }
  }
  const locked = current.proposals.filter((p) => ['approved', 'applied', 'rejected'].includes(p.status));
  const proposals = [...current.proposals];
  for (const proposal of incoming.proposals) {
    if (locked.some((old) => old.id === proposal.id)) continue;
    const index = proposals.findIndex((old) => old.id === proposal.id);
    if (index < 0) proposals.push(proposal); else proposals[index] = proposal;
  }
  campaign.planning = { ...current,
    questions,
    proposals,
  };
  campaign.mapReviews = draft.mapReviews;
}

/** Inclui os pixels dos mapas e do guia, sem enviar nada a um provedor externo. */
export async function attachPlanningImages(packet, readImage) {
  for (const map of packet.maps) {
    if (!map.image) throw Error(`O mapa ${map.name} não tem imagem disponível.`);
    map.imageData = await readImage(map.image);
  }
  if (packet.guide) packet.guideData = await readImage(packet.guide);
  packet.responseRules += ' As imagens estão em imageData/guideData como data URLs; se a ferramenta de IA não ler imagens embutidas no JSON, anexe os arquivos de imagem também.';
  return packet;
}

export function applyPlanning(campaign, proposalId, catalog = []) {
  const p = campaign.planning.proposals.find((row) => row.id === proposalId);
  if (!p || p.status !== 'approved') throw Error('Aprove a cena antes de adicioná-la.');
  if (unresolvedFor(campaign.planning, p).length) throw Error('Responda às dúvidas desta área primeiro.');
  if (p.elements.some((e) => e.status === 'pending')) throw Error('Revise cada elemento antes de adicionar a cena.');
  const area = p.areaId ? campaign.mapReviews[p.mapId]?.points.find((a) => a.id === p.areaId) : null;
  if (p.areaId && area?.recognition !== 'confirmed') throw Error('Confirme a área da proposta no mapa primeiro.');
  const id = p.targetSceneId || `plan-${p.id}`;
  if (!p.targetSceneId && campaign.scenes.some((s) => s.id === id)) throw Error('Esta proposta já foi adicionada.');
  const scene = { id, title: p.title, narration: p.narration,
    presentation: p.mapId ? 'map' : 'image', mapSceneIds: p.mapId ? [p.mapId] : [],
    kind: p.mapId ? 'exploracao' : 'narrativa',
    roster: p.elements.filter((e) => e.status === 'approved').flatMap((e) => {
      const r = catalog.find((r) => r.uuid === e.reference && r.documentName === 'Actor');
      return r ? [{ actorUuid: r.uuid, name: r.name, img: r.img, quantity: e.quantity, role: e.text }] : [];
    }),
    loot: p.elements.filter((e) => e.status === 'approved').flatMap((e) => {
      const r = catalog.find((r) => r.uuid === e.reference && r.documentName === 'Item');
      return r ? [{ id: `${id}-${p.id}-${e.id}`, uuid: r.uuid, name: r.name, img: r.img, quantity: e.quantity, hidden: true }] : [];
    }),
    notes: p.elements.filter((e) => e.status === 'approved').map((e) => `${e.kind}: ${e.text}\nReferência: ${e.reference || 'Revisão necessária'}`).join('\n\n'),
  };
  if (p.targetSceneId) {
    const existing = campaign.scenes.find((s) => s.id === p.targetSceneId);
    if (!existing || existing.mapSceneIds[0] !== p.mapId) throw Error('Cena alvo não pertence ao mapa.');
    if (!area) throw Error('Escolha uma sala para adicionar conteúdo à cena existente.');
    const roomId = applyAreaToScene(campaign, existing, area, p.mapId, { narration: p.narration });
    existing.rooms.find((r) => r.id === roomId).notes = scene.notes;
    existing.roster.push(...scene.roster.map((r) => ({ ...r, roomId })));
    existing.loot.push(...scene.loot.map((r) => ({ ...r, roomId })));
  } else {
    campaign.scenes.push(scene);
    if (area) applyAreaToScene(campaign, scene, area, p.mapId, { narration: p.narration });
  }
  p.status = 'applied';
}

const action = (name, label, attrs = '') => `<button type="button" data-action="${name}" ${attrs}>${label}</button>`;
export function renderPlanning(campaign, open = false, catalog = []) {
  const p = normalizePlanning(campaign.planning);
  return `<details class="qc-more qc-planning" ${open ? 'open' : ''}><summary>Planejamento do conjunto de mapas · análise e aprovação</summary>
    <p>1. Defina o objetivo e o guia. 2. Exporte o pedido e anexe todos os mapas à IA. 3. Importe as perguntas e confirme a geografia. 4. Exporte novamente e revise as propostas.</p>
    <p>A leitura visual é feita no chat. Aqui você importa os contornos, completa lacunas e aprova o conteúdo; o reconhecimento local usa os dados cadastrados no Foundry.</p>
    <datalist id="qc-planning-catalog">${catalog.map((r) => `<option value="${esc(r.uuid)}" label="${esc(r.name)} · ${esc(r.documentName)}"></option>`).join('')}</datalist>
    <label class="qc-field">Objetivo e informações privadas<textarea name="planning-brief" rows="8">${esc(p.brief)}</textarea></label>
    <label class="qc-field">O que espero da análise e da aventura<textarea name="planning-expectation" rows="4" placeholder="Ex.: priorizar exploração, procurar salas laterais e reservar combates para as cavernas. Estas expectativas orientam a análise sem afirmar que os elementos existem.">${esc(p.expectation)}</textarea></label>
    <label class="qc-field">Imagem do esquema geral (caminho no Foundry)<input name="planning-guide" value="${esc(p.guide)}"></label>
    ${p.questions.map((q) => `<label class="qc-field">${esc(q.text)}<textarea data-planning-answer="${esc(q.id)}" rows="2">${esc(q.answer)}</textarea></label>`).join('')}
    <div class="qc-actions">${action('save-planning', 'Salvar contexto e respostas')}${action('export-planning', 'Exportar pedido de análise')}${campaign.id === 'noatora-a-garra-ausente' && !p.brief ? action('seed-planning', 'Usar contexto revisado de Noátorá') : ''}</div>
    <label class="qc-field">Resultado da análise (JSON)<textarea name="planning-result" rows="4" placeholder="Cole a resposta estruturada da IA"></textarea></label>${action('import-planning', 'Revisar resultado')}
    <div class="qc-area-list">${p.proposals.map((proposal) => `<article class="qc-area-card" data-proposal="${esc(proposal.id)}"><h3>${esc(proposal.title)}</h3><small>Mapa: ${esc(proposal.mapId || 'Interlúdio')} · ${esc(proposal.status)}${proposal.areaId ? ` · Sala: ${esc(campaign.mapReviews[proposal.mapId]?.points.find((a) => a.id === proposal.areaId)?.title || proposal.areaId)}` : ''}</small>${proposal.areaId ? `<label class="qc-field">Destino do conteúdo<select data-proposal-target ${proposal.status === 'applied' ? 'disabled' : ''}><option value="">Criar nova cena</option>${campaign.scenes.filter((s) => s.mapSceneIds[0] === proposal.mapId).map((s) => `<option value="${esc(s.id)}" ${proposal.targetSceneId === s.id ? 'selected' : ''}>Adicionar à cena: ${esc(s.title)}</option>`).join('')}</select></label>` : ''}<label class="qc-field">Narração<textarea data-proposal-narration rows="6" ${proposal.status === 'applied' ? 'readonly' : ''}>${esc(proposal.narration)}</textarea></label>
    ${proposal.elements.map((e) => `<section class="qc-area-suggestion" data-planning-element="${esc(e.id)}"><strong>${esc(e.kind)}</strong><textarea aria-label="Descrição de ${esc(e.kind)}" data-proposal-element="${esc(e.id)}" rows="3" ${proposal.status === 'applied' ? 'readonly' : ''}>${esc(e.text)}</textarea><div class="qc-fields-row"><label class="qc-field">Ficha do catálogo ou referência de regra<input data-proposal-reference list="qc-planning-catalog" value="${esc(e.reference)}" ${proposal.status === 'applied' ? 'readonly' : ''}></label><label class="qc-field">Quantidade<input type="number" min="1" max="99" data-proposal-quantity value="${e.quantity}" ${proposal.status === 'applied' ? 'readonly' : ''}></label></div><small>${esc(catalog.find((r) => r.uuid === e.reference)?.name || e.reference || 'Revisão de regra/ficha necessária')} · ${esc(e.status)}</small><div class="qc-actions">${action('planning-element', 'Aprovar', `data-element="${esc(e.id)}" data-decision="approved"`)}${action('planning-element', 'Rejeitar', `data-element="${esc(e.id)}" data-decision="rejected"`)}</div></section>`).join('')}
    <div class="qc-actions">${action('planning-proposal', 'Aprovar cena', 'data-decision="approved"')}${action('planning-proposal', 'Rejeitar cena', 'data-decision="rejected"')}${proposal.status === 'approved' ? action('apply-planning', 'Adicionar cena aprovada') : ''}</div></article>`).join('')}</div></details>`;
}
