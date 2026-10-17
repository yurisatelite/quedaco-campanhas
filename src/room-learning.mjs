import { normalizeName } from "./names.mjs";
import { pointInArea } from './map-recognition.mjs';

export const AREA_TYPES = Object.freeze([
  ["exploration", "Exploração"],
  ["threat", "Ameaça / combate"],
  ["puzzle", "Puzzle"],
  ["challenge", "Desafio complexo"],
  ["loot", "Loot / recompensa"],
  ["secret", "Segredo"],
  ["social", "Interação social"],
  ["narrative", "Narração"],
]);

export const AREA_ENVIRONMENTS = Object.freeze([
  ["unknown", "Ainda não definido"],
  ["hall", "Salão / câmara"],
  ["corridor", "Corredor / passagem"],
  ["forge", "Forja / oficina"],
  ["shrine", "Templo / santuário"],
  ["quarters", "Alojamento"],
  ["storage", "Depósito / arsenal"],
  ["prison", "Prisão / cela"],
  ["laboratory", "Laboratório"],
  ["cave", "Caverna natural"],
  ["water", "Área alagada"],
  ["bridge", "Ponte / precipício"],
]);

const TEMPLATES = {
  exploration: {
    narrativeFunction: "Revelar a história do lugar por meio do ambiente.",
    narration:
      "O espaço se abre diante de vocês. Marcas de uso, danos antigos e detalhes fora do lugar sugerem que esta área ainda guarda uma história.",
    challenge: "Escolher uma rota segura e interpretar os sinais do ambiente.",
    threats: "",
    loot: "Um vestígio útil ou objeto ligado ao antigo propósito da sala.",
    secret: "Uma mudança na construção denuncia uma passagem ou compartimento oculto.",
  },
  threat: {
    narrativeFunction: "Transformar a exploração em pressão e perigo imediato.",
    narration:
      "O ambiente parece quieto apenas por um instante. Há sinais claros de que alguma coisa ocupa ou protege este lugar.",
    challenge: "Entender o terreno antes que a ameaça controle a posição do grupo.",
    threats: "Uma ameaça compatível com o tema e a dificuldade da campanha.",
    loot: "Vestígios ou pertences deixados por vítimas anteriores.",
    secret: "A ameaça reage a um elemento da sala que também pode ser usado contra ela.",
  },
  puzzle: {
    narrativeFunction: "Exigir que o grupo compreenda uma regra do cenário.",
    narration:
      "A passagem não está simplesmente bloqueada: símbolos, mecanismos e marcas de tentativa indicam que este lugar obedece a uma lógica própria.",
    challenge: "Descobrir a regra, testar hipóteses e lidar com o custo de uma tentativa errada.",
    threats: "Uma consequência ambiental ou guardião ativado por erro.",
    loot: "Acesso, informação ou ferramenta que simplifica um desafio posterior.",
    secret: "A solução aparece parcialmente em outro elemento visual da sala.",
  },
  challenge: {
    narrativeFunction: "Criar uma escolha difícil com risco e consequências visíveis.",
    narration:
      "O caminho continua, mas não de forma segura. A estrutura, o terreno e o tempo transformam cada decisão em parte do desafio.",
    challenge: "Combinar perícias e recursos; sucesso parcial deve alterar a posição ou o custo da travessia.",
    threats: "O próprio ambiente ou uma criatura que se aproveita da instabilidade.",
    loot: "Uma rota vantajosa ou recurso recuperado durante a travessia.",
    secret: "Existe uma solução menos óbvia para quem observar a construção.",
  },
  loot: {
    narrativeFunction: "Recompensar exploração e reforçar o tema da campanha.",
    narration:
      "Entre objetos abandonados e sinais do antigo uso da sala, algo permaneceu preservado o bastante para chamar atenção.",
    challenge: "Determinar o que pode ser retirado com segurança e o que ainda está protegido.",
    threats: "Uma proteção, armadilha ou consequência de remover o objeto.",
    loot: "Um item útil, uma pista material e uma recompensa temática.",
    secret: "O objeto mais importante não é necessariamente o mais valioso.",
  },
  secret: {
    narrativeFunction: "Premiar atenção e oferecer uma descoberta opcional.",
    narration:
      "À primeira vista, este trecho parece comum. Uma diferença de desgaste, som ou alinhamento revela que a construção esconde mais do que mostra.",
    challenge: "Perceber o indício e descobrir como acessar o espaço sem destruir seu conteúdo.",
    threats: "Uma proteção discreta ou risco de selar a passagem.",
    loot: "Informação, atalho ou recurso reservado aos exploradores atentos.",
    secret: "A própria existência da área é a primeira revelação.",
  },
  social: {
    narrativeFunction: "Apresentar uma perspectiva viva sobre o conflito da campanha.",
    narration:
      "A presença aqui não reage como um inimigo imediato. Gestos, posição e objetos próximos dizem tanto quanto as primeiras palavras.",
    challenge: "Descobrir o que a figura deseja, teme e está disposta a negociar.",
    threats: "A conversa pode atrair atenção ou revelar uma lealdade perigosa.",
    loot: "Informação, permissão, abrigo ou ajuda temporária.",
    secret: "A figura omite algo que o ambiente contradiz.",
  },
  narrative: {
    narrativeFunction: "Entregar uma imagem ou revelação importante sem exigir confronto.",
    narration:
      "A cena se impõe antes que qualquer ação seja necessária. O que aconteceu aqui pode ser compreendido pelos vestígios deixados no espaço.",
    challenge: "Escolher o que investigar e como interpretar a revelação.",
    threats: "",
    loot: "Uma pista que conecta esta imagem ao objetivo principal.",
    secret: "Um detalhe muda o sentido aparente da cena.",
  },
};

const ENVIRONMENT_CUES = {
  forge: "Calor residual, fuligem, ferramentas e mecanismos de ventilação podem participar do desafio.",
  shrine: "Símbolos, oferendas e orientação ritual devem comunicar crenças ou um juramento antigo.",
  prison: "Grades, correntes e marcas pessoais permitem contar quem esteve preso e por quê.",
  laboratory: "Experimentos incompletos e instrumentos tornam o propósito da sala visível antes da explicação.",
  cave: "Desníveis, rocha instável e sons distantes podem orientar ou enganar o grupo.",
  water: "Profundidade, correnteza, reflexos e contaminação transformam o deslocamento em informação.",
  bridge: "Altura, sustentação e caminhos alternativos devem tornar o posicionamento relevante.",
  storage: "A organização dos objetos revela prioridades, escassez e o abandono do lugar.",
  quarters: "Objetos pessoais humanizam antigos ocupantes e oferecem pistas pequenas, mas concretas.",
  corridor: "Use a passagem para antecipar o que existe adiante e controlar ritmo, ruído ou visibilidade.",
  hall: "A escala e a disposição da sala devem indicar sua função social ou cerimonial.",
};

const THEME_CUES = [
  ["dragao", "Inclua um vestígio de ressonância dracônica, transformação ou memória herdada."],
  ["anao", "A construção deve comunicar técnica, uso comunitário e memória dos antigos habitantes."],
  ["tora", "Use marcas culturais tôras, engenharia subterrânea ou relações com a pedra."],
  ["mina", "Trilhos, escoras, ferramentas e sinais geológicos podem orientar a exploração."],
  ["garra", "Uma pista pode remeter ao receptáculo, à ausência da garra ou à energia deixada por ela."],
  ["bahamut", "A informação deve aprofundar o mistério de Bahamut sem resolver tudo de uma vez."],
  ["gigante", "A escala do espaço ou dos objetos pode denunciar a passagem de gigantes."],
  ["desabamento", "Danos estruturais e rotas interrompidas devem criar escolhas, não apenas bloqueios."],
];

const REJECTION_VARIANTS = [
  "Comece pelos efeitos visíveis no ambiente antes de revelar sua causa.",
  "Apresente primeiro uma escolha concreta de rota, risco ou prioridade.",
  "Use som, escala ou movimento para diferenciar esta proposta da anterior.",
];

const clean = (value) => String(value || "").trim();
const cloneSuggestion = (value = {}) => ({
  narrativeFunction: clean(value.narrativeFunction),
  narration: clean(value.narration),
  challenge: clean(value.challenge),
  threats: clean(value.threats),
  loot: clean(value.loot),
  secret: clean(value.secret),
  source: clean(value.source) || "rules",
});

export function campaignThemes(campaign) {
  const material = normalizeName(campaign?.working?.material || "");
  return THEME_CUES.filter(([term]) => material.includes(term)).map(
    ([term, cue]) => ({ term, cue }),
  );
}

export function learningStats(campaigns) {
  const samples = campaigns.flatMap((campaign) => campaign.learning?.samples || []);
  return {
    samples,
    accepted: samples.filter((sample) => sample.decision === "accepted").length,
    rejected: samples.filter((sample) => sample.decision === "rejected").length,
  };
}

function similarity(area, sample) {
  let score = 0;
  if (sample.type === area.type) score += 4;
  if (sample.environment === area.environment) score += 3;
  const terms = new Set(normalizeName(area.visualDescription).split(" ").filter((term) => term.length > 3));
  for (const term of sample.visualTerms || []) if (terms.has(term)) score += 1;
  return score;
}

export function suggestArea(campaign, area, campaigns = [campaign]) {
  const template = cloneSuggestion(TEMPLATES[area.type] || TEMPLATES.exploration);
  const ranked = learningStats(campaigns).samples
    .map((sample) => ({ sample, score: similarity(area, sample) }))
    .filter(({ score }) => score >= 5)
    .sort((a, b) => b.score - a.score),
    accepted = ranked.find(
      ({ sample }) => sample.decision === "accepted",
    )?.sample,
    rejected = ranked.filter(
      ({ sample }) => sample.decision === "rejected",
    ).length;
  const suggestion = accepted
    ? { ...cloneSuggestion(accepted.suggestion), source: "memory" }
    : { ...template, source: "rules" };
  if (!accepted && rejected) {
    suggestion.source = "rules-adjusted";
    suggestion.narration = `${REJECTION_VARIANTS[(rejected - 1) % REJECTION_VARIANTS.length]}\n\n${suggestion.narration}`;
  }
  const cues = [
    ENVIRONMENT_CUES[area.environment],
    ...campaignThemes(campaign)
      .slice(0, 2)
      .map(({ cue }) => cue),
  ].filter(Boolean);
  if (cues.length)
    suggestion.challenge = [suggestion.challenge, ...cues].filter(Boolean).join("\n\n");
  if (area.visualDescription)
    suggestion.narration = `${suggestion.narration}\n\nConsidere na descrição: ${clean(area.visualDescription)}`;
  const expectation = [campaign.planning?.expectation,
    Object.values(campaign.mapReviews || {}).find((r) => r.points?.some((p) => p.id === area.id))?.expectation,
    area.expectation].filter(Boolean).join('\n');
  if (expectation) suggestion.narrativeFunction += `\n\nOrientação da Mestra: ${clean(expectation)}`;
  if (area.type === 'exploration' && !accepted) suggestion.secret = 'Revelação a definir pela Mestra; nenhuma conexão secreta foi inferida.';
  return suggestion;
}

export function recordAreaFeedback(campaign, area, decision) {
  campaign.learning ??= { samples: [] };
  campaign.learning.samples ??= [];
  const sample = {
    id: globalThis.crypto?.randomUUID?.() || `sample-${Date.now()}`,
    createdAt: new Date().toISOString(),
    decision,
    type: area.type,
    environment: area.environment,
    visualTerms: normalizeName(area.visualDescription)
      .split(" ")
      .filter((term) => term.length > 3)
      .slice(0, 30),
    suggestion: cloneSuggestion(area.suggestion),
  };
  campaign.learning.samples.push(sample);
  campaign.learning.samples = campaign.learning.samples.slice(-500);
  area.feedback = decision;
  area.feedbackId = sample.id;
  return sample;
}

export function areaSceneData(area, mapId) {
  const suggestion = cloneSuggestion(area.suggestion);
  const details = [
    area.visualDescription && `Descrição visual: ${area.visualDescription}`,
    suggestion.challenge && `Desafio: ${suggestion.challenge}`,
    suggestion.threats && `Ameaças: ${suggestion.threats}`,
    suggestion.loot && `Loot: ${suggestion.loot}`,
    suggestion.secret && `Segredo: ${suggestion.secret}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    id: globalThis.crypto?.randomUUID?.() || `scene-${Date.now()}`,
    title: area.title || "Nova área",
    kind:
      area.type === "threat"
        ? "combate"
        : ["puzzle", "challenge"].includes(area.type)
          ? "desafio"
          : area.type === "social"
            ? "social"
            : area.type === "narrative"
              ? "narrativa"
              : "exploracao",
    presentation: "map",
    mapSceneIds: [mapId],
    mapAreaRefs: [{ mapId, areaId: area.id }],
    narration: suggestion.narration,
    purpose: suggestion.narrativeFunction,
    information: suggestion.secret,
    notes: [area.gmNotes, details].filter(Boolean).join("\n\n"),
    details,
    objective: suggestion.challenge,
    roster: [],
    loot: [],
  };
}

export function areaCentroid(area) {
  const vertices = area.vertices?.length
    ? area.vertices
    : [{ x: area.x || 0, y: area.y || 0 }];
  const center = {
    x: vertices.reduce((total, point) => total + point.x, 0) / vertices.length,
    y: vertices.reduce((total, point) => total + point.y, 0) / vertices.length,
  };
  if (area.shape !== 'polygon' || vertices.length < 3 || pointInArea(center, area)) return center;
  const ys = [...new Set(vertices.map((v) => v.y))].sort((a, b) => a - b);
  let best = null;
  for (let i = 1; i < ys.length; i++) {
    const y = (ys[i - 1] + ys[i]) / 2, intersections = [];
    for (let j = 0; j < vertices.length; j++) {
      const a = vertices[j], b = vertices[(j + 1) % vertices.length];
      if ((a.y > y) !== (b.y > y)) intersections.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
    }
    intersections.sort((a, b) => a - b);
    for (let j = 1; j < intersections.length; j += 2) {
      const width = intersections[j] - intersections[j - 1];
      if (!best || width > best.width) best = { x: (intersections[j] + intersections[j - 1]) / 2, y, width };
    }
  }
  return best ? { x: best.x, y: best.y } : vertices[0];
}
