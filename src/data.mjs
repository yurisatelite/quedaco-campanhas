import { normalizePlanning } from './campaign-planner.mjs';
export const MODULE_ID = "quedaco-campanhas";
export const CAMPAIGN_SCHEMA = "quedaco-campanhas/v3";
export const DEFAULT_COVER =
  "modules/quedaco-campanhas/assets/viagem-estranha.svg";
export const SCENE_TYPES = Object.freeze([
  ["narrativa", "Narração"],
  ["exploracao", "Exploração"],
  ["social", "Interação social"],
  ["investigacao", "Investigação"],
  ["desafio", "Desafio"],
  ["combate", "Combate"],
  ["descanso", "Descanso"],
]);
export function sceneKind(value) {
  const key = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return key.includes("combate")
    ? "combate"
    : key.includes("explora")
      ? "exploracao"
      : key.includes("investiga")
        ? "investigacao"
        : key.includes("social") || key.includes("intera")
          ? "social"
          : key.includes("desafio")
            ? "desafio"
            : key.includes("descanso")
              ? "descanso"
              : "narrativa";
}
const scene = (id, title, kind, objective) => ({
  id,
  title,
  kind,
  objective,
  status: "pending",
  mapSceneIds: [],
  roster: [],
  fx: { preset: "", enabled: false },
});
const profile = (id, name, campaignRole, behavior) => ({
  id,
  name,
  campaignRole,
  behavior,
  actorUuid: "",
  actorName: "",
  actorImg: "",
});
const material =
  "# Noátorá: A Garra Ausente\n\n## Premissa\nOs personagens atravessam uma memória arcana e despertam em corpos tôras na Noátorá do passado. A missão é localizar a câmara que guardava a garra arrancada de Bahamut e compreender por que ela está vazia.\n\n## Verdade da Mestra\nA garra foi retirada da história por Fofuxa, a atual Dragoneza Azul. Carlos Alexandre acredita que trabalha com o poder dela; ele não sabe que alimenta um ritual ligado à garra. Jormü é um encontro histórico importante, mas não é o objetivo da missão.\n";

export const NOATORA_CAMPAIGN = Object.freeze({
  schema: CAMPAIGN_SCHEMA,
  id: "noatora-a-garra-ausente",
  title: "Noátorá: A Garra Ausente",
  status: "draft",
  usesMaps: true,
  regions: ["Törmund", "Noátorá"],
  date: {
    era: "Era das Estações",
    year: "105 A.F.",
    label: "Antes do cerco de Jormü",
  },
  mapFolderId: "",
  currentSceneId: "c01-memoria-sem-reflexo",
  original: {
    id: "noatora-a-garra-ausente:original",
    revision: 1,
    locked: true,
    material,
  },
  working: { revision: 1, material },
  npcProfiles: [
    profile(
      "jormu",
      "Jormü",
      "Encontro histórico e presságio",
      "Um tôra marcado pela ressonância do ovo. Age com curiosidade, medo e uma força que ainda não compreende.",
    ),
    profile(
      "fofuxa",
      "Fofuxa",
      "Ameaça oculta no presente",
      "Não aparece como antagonista direta na memória. Sua presença deve surgir por pistas ligadas à garra.",
    ),
    profile(
      "carlos-alexandre",
      "Carlos Alexandre",
      "Consequência futura",
      "Não participa da memória. Ele acredita que a energia dos experimentos vem de Fofuxa e desconhece a garra e o ritual.",
    ),
  ],
  scenes: [
    scene(
      "c01-memoria-sem-reflexo",
      "A memória sem reflexo",
      "narrativa",
      "Conduzir os personagens do presente à memória arcana.",
    ),
    scene(
      "c02-corpos-de-pedra",
      "Corpos de pedra",
      "criação",
      "Apresentar Noátorá e permitir a criação dos corpos tôras.",
    ),
    scene(
      "c03-permissao-para-descer",
      "Permissão para descer",
      "interação",
      "Conseguir acesso, equipamento ou informações sobre a ala selada.",
    ),
    scene(
      "c04-rota-esquecida",
      "A rota esquecida",
      "exploração",
      "Chegar à ala de contenção pelas estruturas antigas.",
    ),
    scene(
      "c05-selo-que-sangra",
      "O selo que ainda sangra",
      "desafio",
      "Abrir ou atravessar o selo que protege a rota da câmara.",
    ),
    scene(
      "c06-ecos-da-garra",
      "Ecos da garra",
      "exploração",
      "Seguir os vestígios de Bahamut nas galerias inferiores.",
    ),
    scene(
      "c07-respira-fogo",
      "A coisa que aprendeu a respirar fogo",
      "combate",
      "Superar uma criatura deformada pela ressonância dracônica.",
    ),
    scene(
      "c08-jormu-no-limite",
      "Jormü no limite",
      "interação",
      "Cruzar o caminho de Jormü sem deslocar o foco da missão.",
    ),
    scene(
      "c09-camara-da-garra",
      "A câmara da garra ausente",
      "desafio",
      "Examinar o receptáculo original da garra de Bahamut.",
    ),
    scene(
      "c10-nascimento-vermelho",
      "O nascimento do Dragão Vermelho",
      "narrativa",
      "Mostrar a catástrofe histórica que rompe Noátorá.",
    ),
    scene(
      "c11-cidade-ruir",
      "A cidade que começa a ruir",
      "desafio",
      "Sair das profundezas com a pista obtida.",
    ),
    scene(
      "c12-o-que-voltou",
      "O que voltou com eles",
      "narrativa",
      "Retornar ao presente com a descoberta sobre a garra.",
    ),
  ],
});

export const clone = (value) =>
  globalThis.structuredClone
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
const text = (value, fallback = "") => String(value ?? fallback);
const normalizedScene = (entry, index) => ({
  mapAreaRefs: (Array.isArray(entry?.mapAreaRefs) ? entry.mapAreaRefs : [])
    .map((row) => ({
      mapId: text(row?.mapId),
      areaId: text(row?.areaId),
    }))
    .filter((row) => row.mapId && row.areaId),
  resourceRefs: (Array.isArray(entry?.resourceRefs) ? entry.resourceRefs : [])
    .map((row) => ({
      id: text(row?.id),
      quantity: Math.max(1, Math.min(99, Number(row?.quantity) || 1)),
    }))
    .filter((row) => row.id),
  sourceKey: text(
    entry?.sourceKey,
    entry?.id?.match(/^c(\d+)/i)?.[1]
      ? `C${entry.id.match(/^c(\d+)/i)[1].padStart(2, "0")}`
      : "",
  ),
  presentation:
    entry?.presentation === "image"
      ? "image"
      : entry?.presentation === "map"
        ? "map"
        : sceneKind(entry?.kind) === "narrativa" && !entry?.mapSceneIds?.length
          ? "image"
          : "map",
  image: text(entry?.image),
  excludedResources: (Array.isArray(entry?.excludedResources)
    ? entry.excludedResources
    : []
  ).map(String),
  quest: {
    questId: text(entry?.quest?.questId),
    taskId: text(entry?.quest?.taskId),
    publicObjective: text(entry?.quest?.publicObjective),
    publicUpdate: text(entry?.quest?.publicUpdate),
    syncOnComplete: entry?.quest?.syncOnComplete !== false,
  },
  narration: text(entry?.narration),
  entryPoint: text(entry?.entryPoint),
  rooms: (Array.isArray(entry?.rooms) ? entry.rooms : []).map(
    (room, index) => ({
      id: text(room?.id, `room-${index + 1}`),
      name: text(room?.name, `Sala ${index + 1}`),
      description: text(room?.description),
      notes: text(room?.notes),
      connections: text(room?.connections),
    }),
  ),
  loot: (Array.isArray(entry?.loot) ? entry.loot : [])
    .map((item, index) => ({
      id: text(item?.id, `loot-${index + 1}`),
      uuid: text(item?.uuid),
      name: text(item?.name),
      img: text(item?.img),
      quantity: Math.max(1, Math.min(999, Number(item?.quantity) || 1)),
      roomId: text(item?.roomId),
      notes: text(item?.notes),
      hidden: item?.hidden !== false,
      source: text(item?.source, "manual"),
    }))
    .filter((item) => item.uuid),
  purpose: text(entry?.purpose),
  information: text(entry?.information),
  success: text(entry?.success),
  failure: text(entry?.failure),
  details: text(entry?.details),
  notes: text(entry?.notes),
  npcProfileIds: [
    ...new Set(
      (Array.isArray(entry?.npcProfileIds) ? entry.npcProfileIds : []).map(
        String,
      ),
    ),
  ],
  id: text(entry?.id, `scene-${index + 1}`),
  title: text(entry?.title, `Cena ${index + 1}`),
  kind: sceneKind(entry?.kind),
  objective: text(entry?.objective),
  status: ["pending", "current", "completed", "skipped"].includes(entry?.status)
    ? entry.status
    : "pending",
  mapSceneIds: [
    ...new Set(
      (Array.isArray(entry?.mapSceneIds) ? entry.mapSceneIds : [])
        .map(String)
        .filter(Boolean),
    ),
  ],
  roster: (Array.isArray(entry?.roster) ? entry.roster : [])
    .map((row) => ({
      profileId: text(row?.profileId),
      roomId: text(row?.roomId),
      actorUuid: text(row?.actorUuid),
      name: text(row?.name),
      img: text(row?.img),
      role: text(row?.role, "token"),
      quantity: Math.max(1, Math.min(99, Number(row?.quantity) || 1)),
      hidden: Boolean(row?.hidden),
      source: text(row?.source, "manual"),
    }))
    .filter((row) => row.actorUuid),
  fx: { preset: text(entry?.fx?.preset), enabled: Boolean(entry?.fx?.enabled) },
});
export function normalizeCampaign(value) {
  const source = value && typeof value === "object" ? value : {},
    scenes = Array.isArray(source.scenes) ? source.scenes : [],
    original =
      source.original && typeof source.original === "object"
        ? source.original
        : {
            id: `${source.id || "campaign"}:original`,
            revision: 1,
            locked: true,
            material: text(source.material),
          },
    working =
      source.working && typeof source.working === "object"
        ? source.working
        : { revision: 1, material: text(source.material || original.material) };
  const result = {
    planning: normalizePlanning(source.planning),
    schema: CAMPAIGN_SCHEMA,
    id: text(source.id, crypto.randomUUID?.() || `campaign-${Date.now()}`),
    title: ["Noátorá: A Garra Ausente", "Noátora: A Garra Ausente"].includes(
      source.title,
    )
      ? "Uma viagem estranha"
      : text(source.title, "Campanha sem nome"),
    usesMaps:
      typeof source.usesMaps === "boolean"
        ? source.usesMaps
        : scenes.some((scene) => scene?.mapSceneIds?.length) ||
          Boolean(source.mapFolderId) ||
          Object.keys(source.mapReviews || {}).length > 0,
    cover: text(source.cover, DEFAULT_COVER),
    description: text(
      source.description,
      source.id === "noatora-a-garra-ausente"
        ? "Aventura inicial: o grupo atravessa uma memória e desperta num tempo que não é o seu."
        : "",
    ),
    resourceProfiles: (Array.isArray(source.resourceProfiles)
      ? source.resourceProfiles
      : []
    ).map((row, index) => ({
      id: text(row?.id, `resource-${index + 1}`),
      kind: ["npc", "threat", "item"].includes(row?.kind) ? row.kind : "threat",
      name: text(row?.name, "Recurso da campanha"),
      description: text(row?.description),
      uuid: text(row?.uuid),
      bindingName: text(row?.bindingName),
      img: text(row?.img),
    })),
    mapReviews: Object.fromEntries(
      Object.entries(
        source.mapReviews && typeof source.mapReviews === "object"
          ? source.mapReviews
          : {},
      ).map(([id, review]) => [
        id,
        {
          notes: text(review?.notes),
          expectation: text(review?.expectation),
          recognitionWarnings: (Array.isArray(review?.recognitionWarnings) ? review.recognitionWarnings : []).map(String),
          points: (Array.isArray(review?.points) ? review.points : []).map(
            (point, index) => ({
              id: text(point?.id, `point-${index + 1}`),
              type: [
                "loot",
                "puzzle",
                "threat",
                "challenge",
                "exploration",
                "secret",
                "social",
                "narrative",
              ].includes(point?.type)
                ? point.type
                : "exploration",
              shape: ["point", "rect", "polygon"].includes(point?.shape)
                ? point.shape
                : "point",
              x: Math.max(0, Math.min(100, Number(point?.x) || 0)),
              y: Math.max(0, Math.min(100, Number(point?.y) || 0)),
              vertices: (
                Array.isArray(point?.vertices) && point.vertices.length
                  ? point.vertices
                  : [{ x: point?.x, y: point?.y }]
              ).map((vertex) => ({
                x: Math.max(0, Math.min(100, Number(vertex?.x) || 0)),
                y: Math.max(0, Math.min(100, Number(vertex?.y) || 0)),
              })),
              title: text(point?.title, "Ponto de interesse"),
              source: text(point?.source),
              sourceId: text(point?.sourceId),
              recognition: ['candidate', 'confirmed', 'rejected'].includes(point?.recognition) ? point.recognition : 'confirmed',
              evidence: text(point?.evidence),
              expectation: text(point?.expectation),
              editedByGM: Boolean(point?.editedByGM),
              unknowns: (Array.isArray(point?.unknowns) ? point.unknowns : []).map(String),
              wallIds: (Array.isArray(point?.wallIds) ? point.wallIds : []).map(String),
              description: text(point?.description),
              visualDescription: text(
                point?.visualDescription,
                point?.description,
              ),
              gmNotes: text(point?.gmNotes),
              environment: [
                "unknown",
                "hall",
                "corridor",
                "forge",
                "shrine",
                "quarters",
                "storage",
                "prison",
                "laboratory",
                "cave",
                "water",
                "bridge",
              ].includes(point?.environment)
                ? point.environment
                : "unknown",
              status: ["draft", "suggested", "accepted", "rejected"].includes(
                point?.status,
              )
                ? point.status
                : "draft",
              suggestion: {
                narrativeFunction: text(
                  point?.suggestion?.narrativeFunction,
                ),
                narration: text(point?.suggestion?.narration),
                challenge: text(point?.suggestion?.challenge),
                threats: text(point?.suggestion?.threats),
                loot: text(point?.suggestion?.loot),
                secret: text(point?.suggestion?.secret),
                source: text(point?.suggestion?.source),
              },
              feedback: ["accepted", "rejected"].includes(point?.feedback)
                ? point.feedback
                : "",
              feedbackId: text(point?.feedbackId),
              sceneId: text(point?.sceneId),
            }),
          ),
        },
      ]),
    ),
    learning: {
      samples: (
        Array.isArray(source.learning?.samples) ? source.learning.samples : []
      )
        .slice(-500)
        .map((sample, index) => ({
          id: text(sample?.id, `sample-${index + 1}`),
          createdAt: text(sample?.createdAt),
          decision: sample?.decision === "rejected" ? "rejected" : "accepted",
          type: text(sample?.type, "exploration"),
          environment: text(sample?.environment, "unknown"),
          visualTerms: (Array.isArray(sample?.visualTerms)
            ? sample.visualTerms
            : []
          ).map(String),
          suggestion: {
            narrativeFunction: text(sample?.suggestion?.narrativeFunction),
            narration: text(sample?.suggestion?.narration),
            challenge: text(sample?.suggestion?.challenge),
            threats: text(sample?.suggestion?.threats),
            loot: text(sample?.suggestion?.loot),
            secret: text(sample?.suggestion?.secret),
            source: text(sample?.suggestion?.source),
          },
        })),
    },
    status: ["draft", "active", "completed"].includes(source.status)
      ? source.status
      : "draft",
    regions: [
      ...new Set(
        (Array.isArray(source.regions) ? source.regions : [])
          .map((value) => text(value).trim())
          .filter(Boolean),
      ),
    ],
    date: {
      era: text(source.date?.era),
      year: text(source.date?.year),
      label: text(source.date?.label),
    },
    mapFolderId: text(source.mapFolderId),
    currentSceneId: text(source.currentSceneId, scenes[0]?.id || ""),
    original: {
      id: text(original.id, `${source.id || "campaign"}:original`),
      revision: Math.max(1, Number(original.revision) || 1),
      locked: true,
      material: text(original.material),
    },
    working: {
      revision: Math.max(1, Number(working.revision) || 1),
      material: text(working.material, original.material),
    },
    npcProfiles: (Array.isArray(source.npcProfiles)
      ? source.npcProfiles
      : []
    ).map((entry, index) => ({
      id: text(entry?.id, `npc-${index + 1}`),
      name: text(entry?.name, "NPC sem nome"),
      campaignRole: text(entry?.campaignRole),
      behavior: text(entry?.behavior),
      actorUuid: text(entry?.actorUuid),
      actorName: text(entry?.actorName),
      actorImg: text(entry?.actorImg),
    })),
    scenes: scenes.map(normalizedScene),
  };
  for (const scene of result.scenes) {
    if (result.usesMaps && scene.mapSceneIds.length > 1)
      scene.mapSceneIds = scene.mapSceneIds.slice(0, 1);
    scene.roster = scene.roster.flatMap((row) => {
      if (!row.profileId) return [row];
      const profile = result.npcProfiles.find(
        (entry) => entry.id === row.profileId,
      );
      if (!profile?.actorUuid) return [];
      return [
        {
          ...row,
          actorUuid: profile.actorUuid,
          name: profile.name,
          img: profile.actorImg,
          role: profile.campaignRole,
        },
      ];
    });
  }
  return result;
}
export function normalizeCampaigns(value) {
  return (Array.isArray(value) ? value : []).map(normalizeCampaign);
}
